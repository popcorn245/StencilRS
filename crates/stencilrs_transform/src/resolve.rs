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

use crate::consts::{Lit, literal, name_literal, static_member_literals};
use crate::default_value::initializer_text;
use crate::eval::property_key_name;
use crate::locals::{LocalValue, Locals};
use crate::meta::PropType;
use crate::prop_type::{Flags, classify_annotation, infer_expression, keyof_name_flags, name_flags};

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
    pub types: HashMap<String, TypeSummary>,
    pub values: HashMap<String, ValueSummary>,
}

const MAX_DEPTH: u8 = 8;

#[derive(Default)]
pub struct Resolver {
    cache: RefCell<HashMap<PathBuf, Option<Rc<ModuleSummary>>>>,
    depth: Cell<u8>,
}

impl Resolver {
    pub fn new() -> Self {
        Self::default()
    }

    /// The summary of the module `specifier` imported from `importer`, if it is a relative
    /// import that resolves to a TypeScript file.
    pub fn module(&self, importer: &str, specifier: &str) -> Option<Rc<ModuleSummary>> {
        if !specifier.starts_with('.') {
            return None;
        }
        let dir = Path::new(importer).parent()?;
        let path = resolve_file(&dir.join(specifier))?;
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
        Some(summarize_program(&parsed.program, &locals, &source, self, &file))
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

fn summarize_local(name: &str, exported: &str, locals: &Locals, source: &str, out: &mut ModuleSummary) {
    if locals.types.contains_key(name) {
        out.types.insert(exported.to_owned(), type_summary(name, locals));
    } else if let Some(t) = locals.imported_type(name) {
        out.types.insert(exported.to_owned(), t);
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

fn summarize_program(program: &Program, locals: &Locals, source: &str, resolver: &Resolver, file: &str) -> ModuleSummary {
    let mut out = ModuleSummary::default();
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
                    summarize_local(n, n, locals, source, &mut out);
                }
            }
            Statement::ExportNamedDeclaration(e) => {
                for s in &e.specifiers {
                    summarize_local(s.local.name().as_str(), s.exported.name().as_str(), locals, source, &mut out);
                }
            }
            Statement::ExportFromDeclaration(e) => {
                if let Some(m) = resolver.module(file, e.source.value.as_str()) {
                    for s in &e.specifiers {
                        let (from, to) = (s.local.name().to_string(), s.exported.name().to_string());
                        if let Some(t) = m.types.get(&from) {
                            out.types.insert(to.clone(), *t);
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
