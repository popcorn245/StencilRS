//! Build-accurate mode: follow relative imports the way a full `stencil build` (with a real
//! TypeScript program) sees them. Each imported module is parsed once and reduced to an owned
//! summary of its exports: type flags for prop classification, and value types / literal
//! defaults for initializers.

use std::cell::{Cell, RefCell};
use rustc_hash::FxHashMap;
use std::path::{Path, PathBuf};
use std::rc::Rc;
use std::sync::Arc;

use oxc::allocator::Allocator;
use oxc::ast::ast::{Declaration, Expression, ObjectPropertyKind, Program, Statement, TSType, TSTypeName};
use oxc::parser::Parser;
use oxc::span::{GetSpan, SourceType};

use crate::cache::{self, Dep};
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
    pub members: FxHashMap<String, ValueSummary>,
    /// Return type of a function: (classification, written type).
    pub returns: Option<(PropType, String)>,
    /// The value of its literal type, if it has one: decorator arguments read it.
    pub literal: Option<Lit>,
}

/// What a module exports. `types` and `values` are shared with the process-wide cache; `defs`
/// hold type ids of one call's registry, so they are built per call, and only when asked for.
#[derive(Default, Debug)]
pub struct ModuleSummary {
    /// The module's path.
    pub file: String,
    pub types: Arc<FxHashMap<String, TypeSummary>>,
    pub values: Arc<FxHashMap<String, ValueSummary>>,
    /// The types it exports, for `complexType`.
    pub defs: FxHashMap<String, ExportedType>,
}

/// A module's exports while they are collected.
#[derive(Default)]
struct Collected {
    types: FxHashMap<String, TypeSummary>,
    values: FxHashMap<String, ValueSummary>,
    defs: FxHashMap<String, ExportedType>,
}

const MAX_DEPTH: u8 = 8;

/// A module read in this call: its summary, the files it came from, and whether it is complete.
struct Slot {
    summary: Option<Rc<ModuleSummary>>,
    deps: Arc<Vec<Dep>>,
    /// False when an import cycle or the depth limit cut the summary short: it depends on what
    /// was being read at the time, so it must not outlive the call.
    complete: bool,
}

/// The module being read: the files its summary comes from, so far.
struct Frame {
    deps: Vec<Dep>,
    complete: bool,
}

pub struct Resolver {
    cache: RefCell<FxHashMap<PathBuf, Slot>>,
    frames: RefCell<Vec<Frame>>,
    depth: Cell<u8>,
    /// Whether the caller reads `ModuleSummary::defs` (`complexType`). They are numbered by
    /// the registry in the order they are built, so a call that wants them reads every module
    /// itself, and one that does not shares the process-wide summaries.
    defs: bool,
    /// The type ids of every module read: TypeScript orders a union by them.
    pub registry: Rc<Registry>,
    /// `strictNullChecks` in the tsconfig that governs the file being analysed.
    pub strict: bool,
}

impl Resolver {
    /// A resolver for the program that contains `file`. `defs`: whether the exported types'
    /// definitions are needed (`complexType`).
    pub fn new(file: &str, defs: bool) -> Self {
        Resolver {
            cache: RefCell::default(),
            frames: RefCell::default(),
            depth: Cell::new(0),
            defs,
            registry: Rc::default(),
            strict: strict_null_checks(file),
        }
    }

    /// The summary of the module `specifier` imported from `importer`, if it is a relative
    /// import that resolves to a TypeScript file.
    pub fn module(&self, importer: &str, specifier: &str) -> Option<Rc<ModuleSummary>> {
        if !specifier.starts_with('.') {
            return None;
        }
        let dir = Path::new(importer).parent()?;
        let path = clean(&resolve_file(&dir.join(specifier))?);
        if let Some(slot) = self.cache.borrow().get(&path) {
            self.merge(&slot.deps, slot.complete);
            return slot.summary.clone();
        }
        if self.depth.get() >= MAX_DEPTH {
            self.merge(&[], false);
            return None;
        }
        if !self.defs
            && let Some((exports, deps)) = cache::module(&path)
        {
            let summary = Rc::new(ModuleSummary { file: exports.file, types: exports.types, values: exports.values, defs: FxHashMap::default() });
            self.merge(&deps, true);
            self.cache.borrow_mut().insert(path, Slot { summary: Some(summary.clone()), deps, complete: true });
            return Some(summary);
        }
        // Mark in progress: an import cycle resolves to nothing rather than recursing forever.
        self.cache.borrow_mut().insert(path.clone(), Slot { summary: None, deps: Arc::default(), complete: false });
        self.depth.set(self.depth.get() + 1);
        // Stamped before it is read: a change in between shows up as a mismatch next time.
        self.frames.borrow_mut().push(Frame { deps: vec![Dep::of(&path)], complete: true });
        let summary = self.summarize(&path).map(Rc::new);
        let frame = self.frames.borrow_mut().pop().expect("the frame pushed above");
        self.depth.set(self.depth.get() - 1);
        let complete = frame.complete && summary.is_some();
        let deps = Arc::new(frame.deps);
        if let Some(s) = summary.as_ref().filter(|_| complete && !self.defs) {
            cache::store_module(&path, cache::Exports { file: s.file.clone(), types: s.types.clone(), values: s.values.clone() }, deps.clone());
        }
        self.merge(&deps, complete);
        self.cache.borrow_mut().insert(path, Slot { summary: summary.clone(), deps, complete });
        summary
    }

    /// The module being read depends on `deps` too.
    fn merge(&self, deps: &[Dep], complete: bool) {
        if let Some(frame) = self.frames.borrow_mut().last_mut() {
            for d in deps {
                if !frame.deps.iter().any(|f| f.path == d.path) {
                    frame.deps.push(d.clone());
                }
            }
            frame.complete &= complete;
        }
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
    let mut members = FxHashMap::default();
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

fn summarize_local(name: &str, exported: &str, locals: &Locals, env: &TypeEnv, source: &str, out: &mut Collected, defs: bool) {
    if locals.types.contains_key(name) {
        out.types.insert(exported.to_owned(), type_summary(name, locals));
        if let Some(def) = env.local_def(name).filter(|_| defs) {
            let class_or_enum = matches!(locals.types.get(name), Some(LocalType::Class(_) | LocalType::Enum(_)));
            out.defs.insert(exported.to_owned(), ExportedType { orig_name: name.to_owned(), decl_file: env.file.to_owned(), class_or_enum, def });
        }
    } else if let Some(t) = locals.imported_type(name) {
        out.types.insert(exported.to_owned(), t);
        if let Some(d) = locals.imported_def(name).filter(|_| defs) {
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
    let mut out = Collected::default();
    let defs = resolver.defs;
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
                    summarize_local(n, n, locals, env, source, &mut out, defs);
                }
            }
            Statement::ExportNamedDeclaration(e) => {
                for s in &e.specifiers {
                    summarize_local(s.local.name().as_str(), s.exported.name().as_str(), locals, env, source, &mut out, defs);
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
                    for (k, v) in m.types.iter() {
                        out.types.entry(k.clone()).or_insert(*v);
                    }
                    for (k, v) in &m.defs {
                        out.defs.entry(k.clone()).or_insert_with(|| v.clone());
                    }
                    for (k, v) in m.values.iter() {
                        out.values.entry(k.clone()).or_insert_with(|| v.clone());
                    }
                }
            }
            _ => {}
        }
    }
    ModuleSummary { file: file.to_owned(), types: Arc::new(out.types), values: Arc::new(out.values), defs: out.defs }
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
/// `strict`), following `extends` through relative paths. Cached per folder, and read again
/// when any tsconfig it looked at (or looked for) changes.
fn strict_null_checks(file: &str) -> bool {
    let abs = std::env::current_dir().map(|c| c.join(file)).unwrap_or_else(|_| PathBuf::from(file));
    let Some(start) = abs.parent() else { return false };
    if let Some(strict) = cache::tsconfig(start) {
        return strict;
    }
    let mut deps = Vec::new();
    let mut strict = false;
    let mut dir = Some(start);
    while let Some(d) = dir {
        let candidate = d.join("tsconfig.json");
        let dep = Dep::of(&candidate);
        let found = dep.stamp.is_some();
        deps.push(dep);
        if found {
            strict = tsconfig_strict(&candidate, 0, &mut deps).unwrap_or(false);
            break;
        }
        dir = d.parent();
    }
    cache::store_tsconfig(start, strict, deps);
    strict
}

fn tsconfig_strict(path: &Path, depth: u8, deps: &mut Vec<Dep>) -> Option<bool> {
    if depth > 0 {
        deps.push(Dep::of(path));
    }
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
    tsconfig_strict(&next, depth + 1, deps)
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::time::{Duration, SystemTime};

    /// A fresh folder; the caches are process-wide, so no two tests share one.
    fn folder(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("stencilrs-resolve-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Write `text` and set the file's mtime to `age` seconds on, as a later save would (a
    /// file system's clock can be too coarse to tell two quick writes apart).
    fn write(path: &Path, text: &str, age: u64) {
        fs::write(path, text).unwrap();
        File::options().write(true).open(path).unwrap().set_modified(SystemTime::UNIX_EPOCH + Duration::from_secs(1_000_000 + age)).unwrap();
    }

    fn prop_type_of(dir: &Path, name: &str) -> Option<PropType> {
        let importer = dir.join("c.tsx").to_string_lossy().into_owned();
        let resolver = Resolver::new(&importer, false);
        resolver.module(&importer, "./shared")?.values.get(name)?.prop_type
    }

    #[test]
    fn an_edit_to_an_imported_module_shows_up_in_the_next_call() {
        let dir = folder("edit");
        write(&dir.join("shared.ts"), "export const SIZE = 1;", 0);
        assert_eq!(prop_type_of(&dir, "SIZE"), Some(PropType::Number));
        write(&dir.join("shared.ts"), "export const SIZE = 'm';", 1);
        assert_eq!(prop_type_of(&dir, "SIZE"), Some(PropType::String));
        // Same size, later mtime.
        write(&dir.join("shared.ts"), "export const SIZE = 3;", 2);
        assert_eq!(prop_type_of(&dir, "SIZE"), Some(PropType::Number));
        write(&dir.join("shared.ts"), "export const SIZE = 'x';", 3);
        assert_eq!(prop_type_of(&dir, "SIZE"), Some(PropType::String));
    }

    #[test]
    fn an_edit_to_a_module_behind_a_re_export_shows_up() {
        let dir = folder("barrel");
        write(&dir.join("shared.ts"), "export * from './deep';", 0);
        write(&dir.join("deep.ts"), "export const SIZE = 1;", 0);
        assert_eq!(prop_type_of(&dir, "SIZE"), Some(PropType::Number));
        write(&dir.join("deep.ts"), "export const SIZE = true;", 1);
        assert_eq!(prop_type_of(&dir, "SIZE"), Some(PropType::Boolean));
    }

    #[test]
    fn calls_share_a_module_summary_until_it_changes() {
        let dir = folder("share");
        write(&dir.join("shared.ts"), "export const SIZE = 1;", 0);
        let importer = dir.join("c.tsx").to_string_lossy().into_owned();
        let read = || Resolver::new(&importer, false).module(&importer, "./shared").unwrap();
        let (first, second) = (read(), read());
        assert!(Arc::ptr_eq(&first.values, &second.values));
        write(&dir.join("shared.ts"), "export const SIZE = 2;", 1);
        assert!(!Arc::ptr_eq(&first.values, &read().values));
    }

    #[test]
    fn an_import_cycle_does_not_leave_a_cut_short_summary_behind() {
        let dir = folder("cycle");
        write(&dir.join("a.ts"), "export { B } from './b'; export const A = 1;", 0);
        write(&dir.join("b.ts"), "export { A } from './a'; export const B = 'b';", 0);
        let importer = dir.join("c.tsx").to_string_lossy().into_owned();
        // Read from a, b is summarised while a is in progress, and lacks a's exports.
        let a = Resolver::new(&importer, false).module(&importer, "./a").unwrap();
        assert!(a.values.contains_key("A"));
        // A call that starts at b must not get that summary.
        let b = Resolver::new(&importer, false).module(&importer, "./b").unwrap();
        assert!(b.values.contains_key("B"));
        assert!(b.values.contains_key("A"), "b re-exports a, which is read in full when b is the entry point");
    }

    fn strict_in(dir: &Path) -> bool {
        Resolver::new(&dir.join("src").join("c.tsx").to_string_lossy(), false).strict
    }

    #[test]
    fn an_edit_to_the_tsconfig_or_its_base_shows_up_in_the_next_call() {
        let dir = folder("tsconfig");
        fs::create_dir_all(dir.join("src")).unwrap();
        write(&dir.join("tsconfig.json"), r#"{ "compilerOptions": { "strict": true } }"#, 0);
        assert!(strict_in(&dir));
        write(&dir.join("tsconfig.json"), r#"{ "compilerOptions": { "strict": false } }"#, 1);
        assert!(!strict_in(&dir));
        // Through `extends`.
        write(&dir.join("tsconfig.json"), r#"{ "extends": "./base.json" }"#, 2);
        write(&dir.join("base.json"), r#"{ "compilerOptions": { "strictNullChecks": true } }"#, 2);
        assert!(strict_in(&dir));
        write(&dir.join("base.json"), r#"{ "compilerOptions": { "strictNullChecks": false } }"#, 3);
        assert!(!strict_in(&dir));
    }

    #[test]
    fn a_tsconfig_created_later_is_found() {
        let dir = folder("created");
        fs::create_dir_all(dir.join("src")).unwrap();
        // No tsconfig up the tree yet.
        assert!(!strict_in(&dir));
        write(&dir.join("src").join("tsconfig.json"), r#"{ "compilerOptions": { "strictNullChecks": true } }"#, 0);
        assert!(strict_in(&dir));
        fs::remove_file(dir.join("src").join("tsconfig.json")).unwrap();
        assert!(!strict_in(&dir));
    }
}
