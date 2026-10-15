//! Component inheritance: `extends Base` and `extends Mixin(a, b)`.
//!
//! Port of Stencil's checker-free `mergeExtendedClassMetaWithResolveImport`
//! (`static-to-meta/class-extension/resolve-import-merge.ts` and `shared.ts`), with
//! @stencil/unplugin's `resolveSpecifier` as the `resolveImport` callback: ancestors are found
//! syntactically, in this file or through relative imports (one barrel re-export hop), and each
//! one's decorators are read for its members. The caller merges them.

use std::path::{Component, Path, PathBuf};

use oxc::allocator::Allocator;
use oxc::ast::ast::{
    Argument, ArrowFunctionBody, Class, Declaration, ExportDefaultDeclarationKind, Expression, Function,
    ImportDeclarationSpecifier, Program, Statement, VariableDeclaration,
};
use oxc::parser::Parser;
use oxc::span::{SourceType, Span};

use crate::analyze::{Members, foreign_class_members};
use crate::meta::{Diagnostic, Level};
use crate::resolve::Resolver;

/// A parsed module: its program, source text and path.
#[derive(Clone, Copy)]
pub struct Module<'p, 'a> {
    pub program: &'p Program<'a>,
    pub source: &'p str,
    pub file: &'p str,
}

/// What the walk found: the ancestors' members (nearest first, depth first, as Stencil orders
/// them), Stencil's warnings, and every other file read on the way.
#[derive(Default)]
pub struct Found {
    pub members: Vec<Members>,
    pub warnings: Vec<Diagnostic>,
    pub files: Vec<String>,
}

/// Every ancestor of `class` (in `module`), read with `resolver` in build-accurate mode.
pub fn ancestors(class: &Class, module: Module, resolver: Option<&Resolver>) -> Found {
    let mut walk = Walk { found: Found::default(), visited: Vec::new(), seen: Vec::new(), root: class.span, resolver };
    walk.ancestors_of(class, module);
    walk.found
}

/// `deDupeMembers` then concatenation: the parent's members the class doesn't redeclare,
/// followed by the class's own.
pub fn prepend<T>(parent: Vec<T>, own: Vec<T>, key: impl Fn(&T) -> String) -> Vec<T> {
    let mut merged: Vec<T> = parent.into_iter().filter(|p| !own.iter().any(|o| key(o) == key(p))).collect();
    merged.extend(own);
    merged
}

struct Walk<'r> {
    found: Found,
    /// `resolved path::name`, the cycle guard.
    visited: Vec<String>,
    /// Ancestors already taken, by file and position.
    seen: Vec<(String, u32)>,
    root: Span,
    resolver: Option<&'r Resolver>,
}

impl Walk<'_> {
    /// `resolveAncestors`.
    fn ancestors_of(&mut self, class: &Class, module: Module) {
        for parent in extends_names(class) {
            match find_statement(module.program, &parent) {
                Some(decl) => self.take(decl, &parent, module),
                None => self.imported(&parent, module),
            }
        }
    }

    /// A parent declared in `module`: a class (whose own ancestors are walked too), or a mixin
    /// factory (which ends the branch: its base is a parameter).
    fn take(&mut self, decl: Decl, parent: &str, module: Module) {
        let (class, keep_looking) = match decl {
            Decl::Class(c) => (Some(c), true),
            other => (class_in_factory(other), false),
        };
        let Some(class) = class else {
            self.warn(format!(
                "Found \"{parent}\", but couldn't find a class inside it. If it's meant to be a mixin factory, make sure it returns a class literal directly, e.g. `(Base) => class extends Base {{}}` or `(Base) => {{ class {parent}Class extends Base {{}} return {parent}Class; }}` - returning an existing class by reference (`(Base) => SomeExistingClass`) isn't recognized, and any `@Prop`/`@State`/etc. it declares won't be applied."
            ));
            return;
        };
        let id = (module.file.to_owned(), class.span.start);
        if self.seen.contains(&id) {
            return;
        }
        self.seen.push(id);
        self.found.members.push(foreign_class_members(class, module.program, module.source, module.file, self.resolver));
        if keep_looking {
            self.ancestors_of(class, module);
        }
    }

    /// A parent imported from another module (`findImportOrigin`, then the module, then
    /// `findDeclarationOrReExport`).
    fn imported(&mut self, parent: &str, module: Module) {
        let Some((specifier, _)) = import_origin(module.program, parent) else { return };
        let Some(path) = self.resolve(&specifier, module.file) else { return };
        let key = format!("{path}::{parent}");
        if self.visited.contains(&key) {
            return;
        }
        self.visited.push(key);
        let Some(source) = std::fs::read_to_string(&path).ok() else { return };
        let allocator = Allocator::default();
        let program = parse(&allocator, &source, &path);
        let here = Module { program: &program, source: &source, file: &path };

        if let Some(decl) = find_statement(&program, parent) {
            return self.take(decl, parent, here);
        }
        // One barrel hop: `export { X } from './x'`.
        if let Some((specifier, local)) = re_export(&program, parent) {
            if let Some(path) = self.resolve(&specifier, &path) {
                if let Some(source) = std::fs::read_to_string(&path).ok() {
                    let allocator = Allocator::default();
                    let program = parse(&allocator, &source, &path);
                    if let Some(decl) = find_statement(&program, &local) {
                        return self.take(decl, parent, Module { program: &program, source: &source, file: &path });
                    }
                }
            }
        }
        self.warn(format!(
            "Unable to find \"{parent}\" in the imported module \"{specifier}\".\n                        Please import class / mixin-factory declarations directly and not via barrel files."
        ));
    }

    /// `resolveImport`: also remembers the file, as @stencil/unplugin's `onBaseClass` does.
    fn resolve(&mut self, specifier: &str, importer: &str) -> Option<String> {
        let path = resolve_specifier(specifier, importer)?;
        if !self.found.files.contains(&path) {
            self.found.files.push(path.clone());
        }
        Some(path)
    }

    fn warn(&mut self, message: String) {
        self.found.warnings.push(Diagnostic { level: Level::Warn, message, start: self.root.start, end: self.root.end });
    }
}

fn parse<'a>(allocator: &'a Allocator, source: &'a str, path: &str) -> Program<'a> {
    let source_type = SourceType::from_path(path).unwrap_or_else(|_| SourceType::tsx()).with_module(true);
    Parser::new(allocator, source, source_type).parse().program
}

/// `getExtendsClassNames`: `extends Foo` → `[Foo]`, `extends Mixin(A, B)` → `[A, B]`.
fn extends_names(class: &Class) -> Vec<String> {
    match &class.heritage {
        Some(h) => match &h.expression {
            Expression::Identifier(id) => vec![id.name.to_string()],
            Expression::CallExpression(call) if matches!(&call.callee, Expression::Identifier(id) if id.name == "Mixin") => call
                .arguments
                .iter()
                .filter_map(|a| match a {
                    Argument::Identifier(id) => Some(id.name.to_string()),
                    _ => None,
                })
                .collect(),
            _ => Vec::new(),
        },
        None => Vec::new(),
    }
}

/// A top-level declaration a parent name can refer to.
#[derive(Clone, Copy)]
enum Decl<'p, 'a> {
    Class(&'p Class<'a>),
    Function(&'p Function<'a>),
    Variable(&'p VariableDeclaration<'a>),
}

fn named<'p, 'a>(stmt: &'p Statement<'a>, name: &str) -> Option<Decl<'p, 'a>> {
    let class = |c: &'p Class<'a>| c.id.as_ref().is_some_and(|id| id.name == name).then_some(Decl::Class(c));
    let function = |f: &'p Function<'a>| f.id.as_ref().is_some_and(|id| id.name == name).then_some(Decl::Function(f));
    let variable = |v: &'p VariableDeclaration<'a>| {
        v.declarations.iter().any(|d| d.id.get_binding_identifier().is_some_and(|id| id.name == name)).then_some(Decl::Variable(v))
    };
    match stmt {
        Statement::ClassDeclaration(c) => class(c),
        Statement::FunctionDeclaration(f) => function(f),
        Statement::VariableDeclaration(v) => variable(v),
        Statement::ExportDeclaration(e) => match &e.declaration {
            Declaration::ClassDeclaration(c) => class(c),
            Declaration::FunctionDeclaration(f) => function(f),
            Declaration::VariableDeclaration(v) => variable(v),
            _ => None,
        },
        Statement::ExportDefaultDeclaration(e) => match &e.declaration {
            ExportDefaultDeclarationKind::ClassDeclaration(c) => class(c),
            ExportDefaultDeclarationKind::FunctionDeclaration(f) => function(f),
            _ => None,
        },
        _ => None,
    }
}

/// `findStatementByName`: a declaration named `name`, or the one a same-file
/// `export { Real as name }` points at.
fn find_statement<'p, 'a>(program: &'p Program<'a>, name: &str) -> Option<Decl<'p, 'a>> {
    if let Some(decl) = program.body.iter().find_map(|s| named(s, name)) {
        return Some(decl);
    }
    for stmt in &program.body {
        let Statement::ExportNamedDeclaration(e) = stmt else { continue };
        let Some(s) = e.specifiers.iter().find(|s| s.exported.name() == name) else { continue };
        let real = s.local.name();
        if real != name {
            return program.body.iter().find_map(|s| named(s, real.as_str()));
        }
    }
    None
}

/// `findImportOrigin`: the module `name` is imported from, and its name there.
fn import_origin(program: &Program, name: &str) -> Option<(String, String)> {
    for stmt in &program.body {
        let Statement::ImportDeclaration(import) = stmt else { continue };
        for spec in import.specifiers.iter().flatten() {
            match spec {
                ImportDeclarationSpecifier::ImportDefaultSpecifier(s) if s.local.name == name => {
                    return Some((import.source.value.to_string(), "default".into()));
                }
                ImportDeclarationSpecifier::ImportSpecifier(s) if s.local.name == name => {
                    return Some((import.source.value.to_string(), s.imported.name().to_string()));
                }
                _ => {}
            }
        }
    }
    None
}

/// `findReExport`: `export { X } from './y'`, or `import { X } from './y'; export { X };`.
fn re_export(program: &Program, name: &str) -> Option<(String, String)> {
    for stmt in &program.body {
        let (specifiers, source) = match stmt {
            Statement::ExportFromDeclaration(e) => (&e.specifiers, Some(&e.source)),
            Statement::ExportNamedDeclaration(e) => (&e.specifiers, None),
            _ => continue,
        };
        let Some(s) = specifiers.iter().find(|s| s.exported.name() == name) else { continue };
        let local = s.local.name().to_string();
        match source {
            Some(source) => return Some((source.value.to_string(), local)),
            None => {
                if let Some(origin) = import_origin(program, &local) {
                    return Some(origin);
                }
            }
        }
    }
    None
}

/// `findClassWalk` on a mixin factory: `(Base) => class extends Base {}`,
/// `(Base) => { class X extends Base {} return X; }`, `(Base) => { return class ... }`, or a
/// `function` whose body declares or returns one.
fn class_in_factory<'p, 'a>(decl: Decl<'p, 'a>) -> Option<&'p Class<'a>> {
    match decl {
        Decl::Class(c) => Some(c),
        Decl::Function(f) => f.body.as_ref().and_then(|b| first_class(&b.statements)),
        Decl::Variable(v) => v.declarations.iter().find_map(|d| match d.init.as_ref()? {
            Expression::ArrowFunctionExpression(arrow) => match &arrow.body {
                ArrowFunctionBody::ClassExpression(c) => Some(&**c),
                ArrowFunctionBody::FunctionBody(body) => body.statements.iter().find_map(|s| match s {
                        Statement::ClassDeclaration(c) => Some(&**c),
                        Statement::ReturnStatement(r) => match r.argument.as_ref()? {
                            Expression::ClassExpression(c) => Some(&**c),
                            _ => None,
                        },
                    _ => None,
                }),
                _ => None,
            },
            Expression::ClassExpression(c) => Some(&**c),
            Expression::FunctionExpression(f) => f.body.as_ref().and_then(|b| first_class(&b.statements)),
            _ => None,
        }),
    }
}

/// The first class declared or returned in a list of statements, looking into blocks.
fn first_class<'p, 'a>(statements: &'p [Statement<'a>]) -> Option<&'p Class<'a>> {
    statements.iter().find_map(|s| match s {
        Statement::ClassDeclaration(c) => Some(&**c),
        Statement::ReturnStatement(r) => match r.argument.as_ref()? {
            Expression::ClassExpression(c) => Some(&**c),
            _ => None,
        },
        Statement::VariableDeclaration(v) => v.declarations.iter().find_map(|d| match d.init.as_ref()? {
            Expression::ClassExpression(c) => Some(&**c),
            _ => None,
        }),
        Statement::BlockStatement(b) => first_class(&b.body),
        Statement::IfStatement(i) => first_class(std::slice::from_ref(&i.consequent)),
        _ => None,
    })
}

/// @stencil/unplugin's `resolveSpecifier`: the specifier joined to the importer's folder, as is,
/// then with `.tsx`, `.ts`, `.js`, then `.js` → `.ts` / `.tsx`. Absolute and `/`-separated.
pub fn resolve_specifier(specifier: &str, importer: &str) -> Option<String> {
    let dir = Path::new(importer).parent()?;
    let base = normalize(&dir.join(specifier)).to_string_lossy().replace('\\', "/");
    let mut candidates = vec![base.clone()];
    candidates.extend([".tsx", ".ts", ".js"].map(|ext| format!("{base}{ext}")));
    if let Some(stem) = base.strip_suffix(".js") {
        candidates.extend([".ts", ".tsx"].map(|ext| format!("{stem}{ext}")));
    }
    candidates.into_iter().find(|c| Path::new(c).is_file())
}

/// Resolve `.` and `..` without touching the file system, as Node's `path.resolve` does.
fn normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for part in path.components() {
        match part {
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
            }
            other => out.push(other.as_os_str()),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{normalize, prepend};
    use std::path::Path;

    #[test]
    fn prepend_keeps_the_class_own_members_last_and_winning() {
        let merged = prepend(vec!["a", "b"], vec!["b", "c"], |s| s.to_string());
        assert_eq!(merged, vec!["a", "b", "c"]);
    }

    #[test]
    fn normalize_resolves_dots() {
        assert_eq!(normalize(Path::new("/x/y/../z/./w.ts")), Path::new("/x/z/w.ts"));
    }
}
