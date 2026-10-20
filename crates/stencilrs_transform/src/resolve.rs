//! Build-accurate mode: follow relative imports the way a full `stencil build` (with a real
//! TypeScript program) sees them. Each imported module is parsed once and reduced to an owned
//! summary of its exports: type flags for prop classification, and value types / literal
//! defaults for initializers.

use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::rc::Rc;

use oxc::allocator::Allocator;
use oxc::ast::ast::{Declaration, Expression, ObjectPropertyKind, Program, Statement, TSType, TSTypeName};
use oxc::parser::Parser;
use oxc::span::{GetSpan, SourceType};

use crate::complex_type::{ExportedType, TypeEnv};
use crate::consts::{Lit, literal, name_literal, static_member_literals};
use crate::default_value::initializer_text;
use crate::eval::property_key_name;
use crate::locals::{LocalType, LocalValue, Locals};
use crate::meta::PropType;
use crate::prop_type::{Flags, classify_annotation, infer_expression, keyof_name_flags, name_flags};
use crate::types::Registry;

#[derive(Clone, Copy, Debug)]
pub struct TypeSummary {
    pub flags: Flags,
    /// Flags of `keyof T`.
    pub keyof: Flags,
}

#[derive(Clone, Debug, Default)]
pub struct ValueSummary {
    pub prop_type: Option<PropType>,
    /// How `typeToString` prints the value's (widened) type.
    pub original: String,
    /// Literal source text a prop default resolves to.
    pub default_text: Option<String>,
    /// Members of a `const X = { ... }` object.
    pub members: HashMap<String, ValueSummary>,
    /// Return type of a function: (classification, written type).
    pub returns: Option<(PropType, String)>,
    /// The value of its literal type, if it has one: decorator arguments read it.
    pub literal: Option<Lit>,
}

#[derive(Default, Debug)]
pub struct ModuleSummary {
    /// The module's path.
    pub file: String,
    pub types: HashMap<String, TypeSummary>,
    pub values: HashMap<String, ValueSummary>,
    /// The types it exports, for `complexType`.
    pub defs: HashMap<String, ExportedType>,
}

const MAX_DEPTH: u8 = 8;

pub struct Resolver {
    cache: RefCell<HashMap<PathBuf, Option<Rc<ModuleSummary>>>>,
    depth: Cell<u8>,
    /// The type ids of every module read: TypeScript orders a union by them.
    pub registry: Rc<Registry>,
    /// `strictNullChecks` in the tsconfig that governs the file being analysed.
    pub strict: bool,
}

impl Resolver {
    /// A resolver for the program that contains `file`.
    pub fn new(file: &str) -> Self {
        Resolver { cache: RefCell::default(), depth: Cell::new(0), registry: Rc::default(), strict: strict_null_checks(file) }
    }

    /// The summary of the module `specifier` imported from `importer`, if it is a relative
    /// import that resolves to a TypeScript file.
    pub fn module(&self, importer: &str, specifier: &str) -> Option<Rc<ModuleSummary>> {
        if !specifier.starts_with('.') {
            return None;
        }
        let dir = Path::new(importer).parent()?;
        let path = clean(&resolve_file(&dir.join(specifier))?);
        if let Some(hit) = self.cache.borrow().get(&path) {
            return hit.clone();
        }
        if self.depth.get() >= MAX_DEPTH {
            return None;
        }
        // Mark in progress: an import cycle resolves to nothing rather than recursing forever.
        self.cache.borrow_mut().insert(path.clone(), None);
        self.depth.set(self.depth.get() + 1);
        let summary = self.summarize(&path).map(Rc::new);
        self.depth.set(self.depth.get() - 1);
        self.cache.borrow_mut().insert(path, summary.clone());
        summary
    }

    fn summarize(&self, path: &Path) -> Option<ModuleSummary> {
        let source = std::fs::read_to_string(path).ok()?;
        let allocator = Allocator::default();
        let source_type = SourceType::from_path(path).unwrap_or_else(|_| SourceType::ts()).with_module(true);
        let parsed = Parser::new(&allocator, &source, source_type).parse();
        let file = path.to_string_lossy().replace('\\', "/");
        let locals = Locals::collect(&parsed.program).with_resolver(Some(self), &file);
        let env = TypeEnv::new(&locals, &self.registry, self.strict, &file);
        Some(summarize_program(&parsed.program, &locals, &env, &source, self, &file))
    }
}

/// `./x` → `./x.ts`, `./x.tsx`, `./x.d.ts`, `./x/index.ts`, … (and `./x.js` → `./x.ts`).
fn resolve_file(base: &Path) -> Option<PathBuf> {
    let s = base.to_string_lossy().to_string();
    let stem = s.strip_suffix(".js").unwrap_or(&s).to_owned();
    let candidates = [
        s.clone(),
        format!("{stem}.ts"),
        format!("{stem}.tsx"),
        format!("{stem}.d.ts"),
        format!("{stem}/index.ts"),
        format!("{stem}/index.tsx"),
    ];
    candidates.into_iter().map(PathBuf::from).find(|p| p.is_file() && p.extension().is_some_and(|e| e == "ts" || e == "tsx"))
}

fn type_summary(name: &str, locals: &Locals) -> TypeSummary {
    TypeSummary { flags: name_flags(name, locals), keyof: keyof_name_flags(name, locals) }
}

pub fn value_summary(init: &Expression, locals: &Locals, source: &str) -> ValueSummary {
    let (as_const, inner) = unwrap_as_const(init);
    let (prop_type, original) = infer_expression(init, locals, source);
    let mut members = HashMap::new();
    if let Expression::ObjectExpression(obj) = inner {
        for p in &obj.properties {
            let ObjectPropertyKind::ObjectProperty(p) = p else { continue };
            let Some(key) = property_key_name(&p.key) else { continue };
            let mut member = value_summary(&p.value, locals, source);
            // `as const` keeps literal member types: a prop initialised from one prints the literal.
            if as_const && is_literal(&p.value) {
                member.original = p.value.span().source_text(source).to_owned();
            }
            // In a mutable object a member widens, unless it says `as const` itself.
            member.literal = if as_const || matches!(&p.value, Expression::TSAsExpression(_)) { literal(&p.value, locals) } else { None };
            members.insert(key, member);
        }
    }
    ValueSummary {
        prop_type: Some(prop_type),
        original,
        default_text: Some(initializer_text(init, locals, source)),
        members,
        returns: None,
        literal: None,
    }
}

fn unwrap_as_const<'x, 'a>(e: &'x Expression<'a>) -> (bool, &'x Expression<'a>) {
    match e {
        Expression::TSAsExpression(a) => {
            let is_const = matches!(&a.type_annotation, TSType::TSTypeReference(r) if matches!(&r.type_name, TSTypeName::IdentifierReference(id) if id.name == "const"));
            let (c, inner) = unwrap_as_const(&a.expression);
            (is_const || c, inner)
        }
        Expression::TSSatisfiesExpression(s) => unwrap_as_const(&s.expression),
        Expression::ParenthesizedExpression(p) => unwrap_as_const(&p.expression),
        other => (false, other),
    }
}

fn is_literal(e: &Expression) -> bool {
    matches!(e, Expression::StringLiteral(_) | Expression::NumericLiteral(_) | Expression::BooleanLiteral(_))
        || matches!(e, Expression::UnaryExpression(u) if matches!(u.argument, Expression::NumericLiteral(_)))
}

fn summarize_local(name: &str, exported: &str, locals: &Locals, env: &TypeEnv, source: &str, out: &mut ModuleSummary) {
    if locals.types.contains_key(name) {
        out.types.insert(exported.to_owned(), type_summary(name, locals));
        if let Some(def) = env.local_def(name) {
            let class_or_enum = matches!(locals.types.get(name), Some(LocalType::Class(_) | LocalType::Enum(_)));
            out.defs.insert(exported.to_owned(), ExportedType { orig_name: name.to_owned(), decl_file: env.file.to_owned(), class_or_enum, def });
        }
    } else if let Some(t) = locals.imported_type(name) {
        out.types.insert(exported.to_owned(), t);
        if let Some(d) = locals.imported_def(name) {
            out.defs.insert(exported.to_owned(), d);
        }
    }
    match locals.values.get(name) {
        Some(LocalValue::Const(init)) => {
            let mut summary = value_summary(init, locals, source);
            summary.literal = name_literal(name, locals);
            out.values.insert(exported.to_owned(), summary);
        }
        Some(LocalValue::Let(Some(init))) => {
            out.values.insert(exported.to_owned(), value_summary(init, locals, source));
        }
        Some(LocalValue::Function(returns)) => {
            let returns = returns.map(|t| (classify_annotation(t, locals), t.span().source_text(source).to_owned()));
            out.values.insert(exported.to_owned(), ValueSummary { returns, ..ValueSummary::default() });
        }
        Some(_) => {
            // Enums and classes: their members' literal values (enum members, `static readonly` fields).
            let members = static_member_literals(name, locals)
                .into_iter()
                .map(|(k, literal)| (k, ValueSummary { literal, ..ValueSummary::default() }))
                .collect();
            out.values.insert(exported.to_owned(), ValueSummary { prop_type: Some(PropType::Unknown), members, ..ValueSummary::default() });
        }
        None => {
            if let Some(v) = locals.imported_value(name) {
                out.values.insert(exported.to_owned(), v);
            }
        }
    }
}

fn summarize_program(program: &Program, locals: &Locals, env: &TypeEnv, source: &str, resolver: &Resolver, file: &str) -> ModuleSummary {
    let mut out = ModuleSummary { file: file.to_owned(), ..ModuleSummary::default() };
    for stmt in &program.body {
        match stmt {
            Statement::ExportDeclaration(e) => {
                let names: Vec<&str> = match &e.declaration {
                    Declaration::VariableDeclaration(v) => v.declarations.iter().filter_map(|d| d.id.get_identifier_name()).map(|n| n.as_str()).collect(),
                    Declaration::FunctionDeclaration(f) => f.id.iter().map(|id| id.name.as_str()).collect(),
                    Declaration::ClassDeclaration(c) => c.id.iter().map(|id| id.name.as_str()).collect(),
                    Declaration::TSTypeAliasDeclaration(t) => vec![t.id.name.as_str()],
                    Declaration::TSInterfaceDeclaration(i) => vec![i.id.name.as_str()],
                    Declaration::TSEnumDeclaration(en) => vec![en.id.name.as_str()],
                    _ => vec![],
                };
                for n in names {
                    summarize_local(n, n, locals, env, source, &mut out);
                }
            }
            Statement::ExportNamedDeclaration(e) => {
                for s in &e.specifiers {
                    summarize_local(s.local.name().as_str(), s.exported.name().as_str(), locals, env, source, &mut out);
                }
            }
            Statement::ExportFromDeclaration(e) => {
                if let Some(m) = resolver.module(file, e.source.value.as_str()) {
                    for s in &e.specifiers {
                        let (from, to) = (s.local.name().to_string(), s.exported.name().to_string());
                        if let Some(t) = m.types.get(&from) {
                            out.types.insert(to.clone(), *t);
                        }
                        if let Some(d) = m.defs.get(&from) {
                            out.defs.insert(to.clone(), d.clone());
                        }
                        if let Some(v) = m.values.get(&from) {
                            out.values.insert(to, v.clone());
                        }
                    }
                }
            }
            Statement::ExportAllDeclaration(e) if e.exported.is_none() => {
                if let Some(m) = resolver.module(file, e.source.value.as_str()) {
                    for (k, v) in &m.types {
                        out.types.entry(k.clone()).or_insert(*v);
                    }
                    for (k, v) in &m.defs {
                        out.defs.entry(k.clone()).or_insert_with(|| v.clone());
                    }
                    for (k, v) in &m.values {
                        out.values.entry(k.clone()).or_insert_with(|| v.clone());
                    }
                }
            }
            _ => {}
        }
    }
    out
}

/// `a/./b/../c` → `a/c`, without touching the file system.
fn clean(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for part in path.components() {
        match part {
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir if out.file_name().is_some() => {
                out.pop();
            }
            other => out.push(other),
        }
    }
    out
}

/// Whether the tsconfig that governs `file` turns on `strictNullChecks` (directly or through
/// `strict`), following `extends` through relative paths.
fn strict_null_checks(file: &str) -> bool {
    let abs = std::env::current_dir().map(|c| c.join(file)).unwrap_or_else(|_| PathBuf::from(file));
    let mut dir = abs.parent();
    while let Some(d) = dir {
        let candidate = d.join("tsconfig.json");
        if candidate.is_file() {
            return tsconfig_strict(&candidate, 0).unwrap_or(false);
        }
        dir = d.parent();
    }
    false
}

fn tsconfig_strict(path: &Path, depth: u8) -> Option<bool> {
    let text = std::fs::read_to_string(path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&strip_jsonc(&text)).ok()?;
    let options = json.get("compilerOptions");
    let flag = |key: &str| options.and_then(|o| o.get(key)).and_then(serde_json::Value::as_bool);
    if let Some(strict) = flag("strictNullChecks").or_else(|| flag("strict")) {
        return Some(strict);
    }
    let parent = json.get("extends")?.as_str()?;
    if depth >= 8 || !parent.starts_with('.') {
        return None;
    }
    let mut next = path.parent()?.join(parent);
    if next.extension().is_none() {
        next.set_extension("json");
    }
    tsconfig_strict(&next, depth + 1)
}

/// JSON with comments and trailing commas (what tsconfig.json allows) as plain JSON.
fn strip_jsonc(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut i = 0;
    let mut in_string = false;
    while i < chars.len() {
        let c = chars[i];
        if in_string {
            out.push(c);
            if c == '\\' && i + 1 < chars.len() {
                out.push(chars[i + 1]);
                i += 1;
            } else if c == '"' {
                in_string = false;
            }
        } else if c == '"' {
            in_string = true;
            out.push(c);
        } else if c == '/' && chars.get(i + 1) == Some(&'/') {
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            continue;
        } else if c == '/' && chars.get(i + 1) == Some(&'*') {
            i += 2;
            while i + 1 < chars.len() && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            i += 2;
            continue;
        } else if c == ',' {
            // A trailing comma: the next token is a closing bracket.
            let next = chars[i + 1..].iter().find(|c| !c.is_whitespace());
            if !matches!(next, Some('}' | ']')) {
                out.push(c);
            }
        } else {
            out.push(c);
        }
        i += 1;
    }
    out
}
