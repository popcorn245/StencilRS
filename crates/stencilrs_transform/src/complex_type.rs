//! `complexType` of props, events and methods: `resolved` and `references`.
//!
//! Stencil asks the TypeScript checker for both. Here a type annotation is evaluated
//! syntactically into the model of `types.rs`, following local aliases, interfaces and enums and
//! (in build-accurate mode) relative imports, and printed the way the checker prints it. A type
//! this cannot reproduce is [`Unsupported`], and the caller flags the member for Stencil's own
//! compiler instead of guessing.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use oxc::ast::ast::{
    Expression, FormalParameters, MethodDefinition, Program, Statement, TSEnumDeclaration, TSEnumMemberName, TSLiteral, TSSignature,
    TSTupleElement, TSType, TSTypeName, TSTypeReference, UnaryOperator,
};
use oxc::ast_visit::Visit;

use crate::analyze::returns_value;
use crate::eval::property_key_name;
use crate::jsdoc::{JsDoc, param_docs};
use crate::locals::{LocalType, Locals};
use crate::meta::{MethodComplexType, MethodParameter, References, TypeReference};
use crate::resolve::Resolver;
use crate::types::*;

/// What a type name stands for.
#[derive(Clone, Debug)]
pub enum TypeDef {
    /// A type alias: its definition with the type parameters as `K::Param`.
    Alias { name: String, params: usize, ty: Ty },
    /// An enum whose members are all literals: a union of them.
    UnionEnum(Rc<EnumInfo>),
    /// An interface, a class or an enum with computed members: printed by name.
    Named { name: String },
}

/// A type a module exports, as the importing module needs it.
#[derive(Clone, Debug)]
pub struct ExportedType {
    /// The name it is declared with (`export { A as B }` exports `A`'s type as `B`).
    pub orig_name: String,
    /// The file that declares it.
    pub decl_file: String,
    pub class_or_enum: bool,
    pub def: Res<TypeDef>,
}

/// The type names of lib.d.ts the model prints by name (`Promise<T>`, `HTMLElement`).
const LIB_INTERFACES: [&str; 48] = [
    "Promise", "Map", "Set", "WeakMap", "WeakSet", "Date", "Error", "RegExp", "Event", "CustomEvent", "MouseEvent", "KeyboardEvent",
    "PointerEvent", "TouchEvent", "FocusEvent", "InputEvent", "DragEvent", "WheelEvent", "Node", "Element", "HTMLElement",
    "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement", "HTMLButtonElement", "HTMLDivElement", "HTMLImageElement",
    "HTMLCanvasElement", "HTMLVideoElement", "HTMLAudioElement", "HTMLFormElement", "HTMLAnchorElement", "SVGElement", "File",
    "Blob", "FileList", "FormData", "DOMRect", "AbortSignal", "AbortController", "MediaStream", "URL", "Response", "Request",
    "Headers", "ShadowRoot", "Document", "Window",
];

/// Mapped lib types: the checker always prints them by their alias.
const LIB_ALIASES: [&str; 6] = ["Record", "Partial", "Required", "Readonly", "Pick", "Omit"];

pub struct TypeEnv<'e, 'a, 'b> {
    pub locals: &'e Locals<'a, 'b>,
    pub reg: &'e Registry,
    /// `strictNullChecks`.
    pub strict: bool,
    /// The module's path, to tell its declarations apart from other modules'.
    pub file: &'e str,
    defs: RefCell<HashMap<String, Res<TypeDef>>>,
    busy: RefCell<Vec<String>>,
    params: RefCell<Vec<(String, Ty)>>,
}

impl<'e, 'a, 'b> TypeEnv<'e, 'a, 'b> {
    pub fn new(locals: &'e Locals<'a, 'b>, reg: &'e Registry, strict: bool, file: &'e str) -> Self {
        TypeEnv { locals, reg, strict, file, defs: RefCell::default(), busy: RefCell::default(), params: RefCell::default() }
    }

    fn resolving(&self) -> bool {
        self.locals.resolving()
    }

    fn with_undefined(&self, ty: Ty) -> Ty {
        if self.strict { union_of(vec![ty, Ty::new(K::Undefined)], true, None) } else { ty }
    }

    /// The declaration of a type this module declares.
    pub fn local_def(&self, name: &str) -> Option<Res<TypeDef>> {
        let local = self.locals.types.get(name)?;
        if let Some(hit) = self.defs.borrow().get(name) {
            return Some(hit.clone());
        }
        if self.busy.borrow().iter().any(|n| n == name) {
            return Some(unsupported(format!("the recursive type `{name}`")));
        }
        self.busy.borrow_mut().push(name.to_owned());
        let def = match local {
            LocalType::Alias(node) => self.alias_def(name, node),
            LocalType::Enum(decl) => Ok(self.enum_def(decl)),
            LocalType::Interface(_) | LocalType::Class(_) => Ok(TypeDef::Named { name: name.to_owned() }),
        };
        self.busy.borrow_mut().pop();
        self.defs.borrow_mut().insert(name.to_owned(), def.clone());
        Some(def)
    }

    fn alias_def(&self, name: &str, node: &TSType) -> Res<TypeDef> {
        let names = self.locals.alias_params.get(name).cloned().unwrap_or_default();
        let depth = self.params.borrow().len();
        for (i, p) in names.iter().enumerate() {
            self.params.borrow_mut().push(((*p).to_owned(), Ty::new(K::Param(i))));
        }
        let ty = self.eval(node);
        self.params.borrow_mut().truncate(depth);
        let ty = ty?;
        let args = (0..names.len()).map(|i| Ty::new(K::Param(i))).collect();
        let alias = Rc::new(Alias { name: name.to_owned(), args, id: self.reg.fresh() });
        Ok(TypeDef::Alias { name: name.to_owned(), params: names.len(), ty: ty.with_alias(alias) })
    }

    /// A union enum, or (a member that is computed) a plain named type.
    fn enum_def(&self, decl: &TSEnumDeclaration) -> TypeDef {
        let name = decl.id.name.to_string();
        let named = TypeDef::Named { name: name.clone() };
        let mut members = Vec::new();
        for m in &decl.body.members {
            let member = match &m.id {
                TSEnumMemberName::Identifier(i) => i.name.to_string(),
                TSEnumMemberName::String(s) => s.value.to_string(),
                _ => return named,
            };
            let is_string = match &m.initializer {
                None | Some(Expression::NumericLiteral(_)) => false,
                Some(Expression::StringLiteral(_)) => true,
                Some(Expression::TemplateLiteral(t)) if t.expressions.is_empty() => true,
                Some(Expression::UnaryExpression(u)) if matches!(u.operator, UnaryOperator::UnaryNegation) && matches!(u.argument, Expression::NumericLiteral(_)) => false,
                _ => return named,
            };
            members.push((member, is_string));
        }
        if members.len() < 2 {
            return named;
        }
        let base_id = self.reg.fresh();
        for _ in 0..members.len() {
            self.reg.fresh();
        }
        TypeDef::UnionEnum(Rc::new(EnumInfo { name, members, base_id }))
    }

    pub fn instantiate(&self, def: &TypeDef, decl_file: &str, args: Vec<Ty>) -> Res<Ty> {
        match def {
            TypeDef::Alias { params, ty, name } => {
                if args.len() != *params {
                    return unsupported(format!("`{name}` with default type arguments"));
                }
                Ok(Subst { reg: self.reg, strict: self.strict, args: &args }.apply(ty))
            }
            TypeDef::UnionEnum(e) => Ok(Ty::new(K::Enum(e.clone()))),
            TypeDef::Named { name } => {
                let key = format!("ref {decl_file}::{name}<{}>", args.iter().map(Ty::key).collect::<Vec<_>>().join(","));
                Ok(Ty::new(K::Ref { name: name.clone(), args, id: self.reg.intern(&key) }))
            }
        }
    }

    pub fn eval(&self, t: &TSType) -> Res<Ty> {
        Ok(match t {
            TSType::TSAnyKeyword(_) => Ty::any(),
            TSType::TSUnknownKeyword(_) => Ty::new(K::Unknown),
            TSType::TSNeverKeyword(_) => Ty::new(K::Never),
            TSType::TSVoidKeyword(_) => Ty::new(K::Void),
            TSType::TSUndefinedKeyword(_) => Ty::new(K::Undefined),
            TSType::TSNullKeyword(_) => Ty::new(K::Null),
            TSType::TSStringKeyword(_) => Ty::new(K::String),
            TSType::TSNumberKeyword(_) => Ty::new(K::Number),
            TSType::TSBigIntKeyword(_) => Ty::new(K::BigInt),
            TSType::TSSymbolKeyword(_) => Ty::new(K::Symbol),
            TSType::TSObjectKeyword(_) => Ty::new(K::NonPrimitive),
            TSType::TSBooleanKeyword(_) => boolean(),
            TSType::TSParenthesizedType(p) => self.eval(&p.type_annotation)?,
            TSType::TSLiteralType(l) => self.literal(&l.literal)?,
            TSType::TSUnionType(u) => {
                let members: Res<Vec<Ty>> = u.types.iter().map(|m| self.eval(m)).collect();
                union_of(members?, self.strict, None)
            }
            TSType::TSArrayType(a) => {
                let el = self.eval(&a.element_type)?;
                self.array(el)
            }
            TSType::TSTupleType(t) => {
                let mut elems = Vec::new();
                for e in &t.element_types {
                    elems.push(self.tuple_elem(e)?);
                }
                // A tuple type has a `length`, which is the literal type of its arity.
                self.number_literal(elems.len().to_string());
                self.anon(Shape::Tuple(elems))
            }
            TSType::TSFunctionType(f) => {
                if f.type_parameters.is_some() || f.this_param.is_some() {
                    return unsupported("a generic function type");
                }
                let params = self.params(&f.params)?;
                let ret = self.eval(&f.return_type.type_annotation)?;
                self.anon(Shape::Function(Sig { params, ret }))
            }
            TSType::TSTypeLiteral(l) => {
                let mut members = Vec::new();
                for m in &l.members {
                    members.push(self.member(m)?);
                }
                self.anon(Shape::Object(members))
            }
            TSType::TSTypeReference(r) => self.reference(r)?,
            TSType::TSIntersectionType(_) => return unsupported("an intersection type"),
            TSType::TSTypeOperatorType(_) => return unsupported("`keyof`, `readonly` or `unique symbol`"),
            TSType::TSTypeQuery(_) => return unsupported("`typeof`"),
            TSType::TSIndexedAccessType(_) => return unsupported("an indexed access type"),
            TSType::TSConditionalType(_) => return unsupported("a conditional type"),
            TSType::TSMappedType(_) => return unsupported("a mapped type"),
            TSType::TSTemplateLiteralType(_) => return unsupported("a template literal type"),
            TSType::TSImportType(_) => return unsupported("an `import()` type"),
            TSType::TSConstructorType(_) => return unsupported("a constructor type"),
            TSType::TSThisType(_) => return unsupported("`this`"),
            _ => return unsupported("this kind of type"),
        })
    }

    fn anon(&self, shape: Shape) -> Ty {
        Ty::new(K::Anon(Anon { id: self.reg.fresh(), shape, alias: None }))
    }

    fn array(&self, el: Ty) -> Ty {
        let id = self.reg.intern(&format!("array<{}>", el.key()));
        if self.resolving() {
            Ty::new(K::Array(el, id))
        } else {
            // Without the lib `Array` is an empty generic type, which prints as `{}`.
            Ty::new(K::Anon(Anon { id, shape: Shape::Text("{}".into()), alias: None }))
        }
    }

    fn literal(&self, lit: &TSLiteral) -> Res<Ty> {
        Ok(match lit {
            TSLiteral::BooleanLiteral(b) => Ty::new(if b.value { K::True } else { K::False }),
            TSLiteral::StringLiteral(s) => self.string_literal(&s.value),
            TSLiteral::TemplateLiteral(t) if t.expressions.is_empty() => {
                let text: Option<String> = t.quasis.iter().map(|q| q.value.cooked.as_ref().map(|c| c.to_string())).collect();
                match text {
                    Some(text) => self.string_literal(&text),
                    None => return unsupported("a template literal type"),
                }
            }
            TSLiteral::NumericLiteral(n) => match js_number(n.raw.as_ref().map(|r| r.as_str()).unwrap_or_default()) {
                Some(text) => self.number_literal(text),
                None => return unsupported("this number literal type"),
            },
            TSLiteral::UnaryExpression(u) => match (&u.operator, &u.argument) {
                (UnaryOperator::UnaryNegation, Expression::NumericLiteral(n)) => match js_number(n.raw.as_ref().map(|r| r.as_str()).unwrap_or_default()) {
                    Some(text) if text != "0" => {
                        // The checker meets the number before its negation.
                        self.number_literal(text.clone());
                        self.number_literal(format!("-{text}"))
                    }
                    _ => return unsupported("this number literal type"),
                },
                _ => return unsupported("this literal type"),
            },
            TSLiteral::BigIntLiteral(_) | TSLiteral::TemplateLiteral(_) => return unsupported("a bigint or template literal type"),
        })
    }

    fn string_literal(&self, value: &str) -> Ty {
        Ty::new(K::Str(value.to_owned(), self.reg.intern(&format!("str {value}"))))
    }

    fn number_literal(&self, text: String) -> Ty {
        let id = self.reg.intern(&format!("num {text}"));
        Ty::new(K::Num(text, id))
    }

    fn tuple_elem(&self, e: &TSTupleElement) -> Res<TupleElem> {
        let Some(t) = e.as_ts_type() else { return unsupported("an optional or rest tuple element") };
        if let TSType::TSNamedTupleMember(m) = t {
            let Some(inner) = m.element_type.as_ts_type() else { return unsupported("a rest tuple element") };
            if m.optional {
                return unsupported("an optional tuple element");
            }
            return Ok(TupleElem { label: Some(m.label.name.to_string()), ty: self.eval(inner)?, optional: false, rest: false });
        }
        Ok(TupleElem { label: None, ty: self.eval(t)?, optional: false, rest: false })
    }

    fn params(&self, fp: &FormalParameters) -> Res<Vec<Param>> {
        let mut out = Vec::new();
        for p in &fp.items {
            let Some(name) = p.pattern.get_identifier_name() else { return unsupported("a destructured parameter") };
            let ty = match &p.type_annotation {
                Some(t) => self.eval(&t.type_annotation)?,
                None => Ty::any(),
            };
            let optional = p.optional || p.initializer.is_some();
            out.push(Param { name: name.to_string(), optional, rest: false, ty: if optional { self.with_undefined(ty) } else { ty } });
        }
        if let Some(rest) = &fp.rest {
            let Some(name) = rest.rest.argument.get_identifier_name() else { return unsupported("a destructured rest parameter") };
            let ty = match &rest.type_annotation {
                Some(t) => self.eval(&t.type_annotation)?,
                None => self.array(Ty::any()),
            };
            out.push(Param { name: name.to_string(), optional: false, rest: true, ty });
        }
        Ok(out)
    }

    fn member(&self, m: &TSSignature) -> Res<Member> {
        Ok(match m {
            TSSignature::TSPropertySignature(p) => {
                if p.computed {
                    return unsupported("a computed property name");
                }
                let Some(name) = property_key_name(&p.key) else { return unsupported("this property name") };
                let ty = match &p.type_annotation {
                    Some(t) => self.eval(&t.type_annotation)?,
                    None => Ty::any(),
                };
                Member { name: key_text(&p.key, &name), optional: p.optional, readonly: p.readonly, kind: MemberKind::Prop(if p.optional { self.with_undefined(ty) } else { ty }) }
            }
            TSSignature::TSMethodSignature(s) => {
                if s.computed || s.type_parameters.is_some() || s.this_param.is_some() || !matches!(s.kind, oxc::ast::ast::TSMethodSignatureKind::Method) {
                    return unsupported("a generic, computed or accessor method signature");
                }
                let Some(name) = property_key_name(&s.key) else { return unsupported("this property name") };
                let params = self.params(&s.params)?;
                let ret = match &s.return_type {
                    Some(t) => self.eval(&t.type_annotation)?,
                    None => Ty::any(),
                };
                Member { name: key_text(&s.key, &name), optional: s.optional, readonly: false, kind: MemberKind::Method(Sig { params, ret }) }
            }
            TSSignature::TSIndexSignature(i) => {
                let key = self.eval(&i.parameter.type_annotation.type_annotation)?;
                let value = self.eval(&i.type_annotation.type_annotation)?;
                Member { name: String::new(), optional: false, readonly: i.readonly, kind: MemberKind::Index { param: i.parameter.name.to_string(), key, value } }
            }
            TSSignature::TSCallSignatureDeclaration(c) => {
                if c.type_parameters.is_some() || c.this_param.is_some() {
                    return unsupported("a generic call signature");
                }
                let params = self.params(&c.params)?;
                let ret = match &c.return_type {
                    Some(t) => self.eval(&t.type_annotation)?,
                    None => Ty::any(),
                };
                Member { name: String::new(), optional: false, readonly: false, kind: MemberKind::Call(Sig { params, ret }) }
            }
            TSSignature::TSConstructSignatureDeclaration(_) => return unsupported("a construct signature"),
        })
    }

    fn reference(&self, r: &TSTypeReference) -> Res<Ty> {
        let mut args = Vec::new();
        if let Some(a) = &r.type_arguments {
            for t in &a.params {
                args.push(self.eval(t)?);
            }
        }
        match &r.type_name {
            TSTypeName::IdentifierReference(id) => self.named(id.name.as_str(), args),
            TSTypeName::QualifiedName(q) => {
                // `Enum.Member`.
                let TSTypeName::IdentifierReference(left) = &q.left else { return unsupported("a qualified type name") };
                match self.local_def(left.name.as_str()) {
                    Some(Ok(TypeDef::UnionEnum(e))) => match e.members.iter().position(|(m, _)| m == q.right.name.as_str()) {
                        Some(i) => Ok(Ty::new(K::EnumLit(e, i))),
                        None => unsupported("an unknown enum member"),
                    },
                    _ => unsupported("a qualified type name"),
                }
            }
            TSTypeName::ThisExpression(_) => unsupported("`this`"),
        }
    }

    fn named(&self, name: &str, args: Vec<Ty>) -> Res<Ty> {
        if let Some((_, ty)) = self.params.borrow().iter().rev().find(|(n, _)| n == name) {
            return Ok(ty.clone());
        }
        if let Some(def) = self.local_def(name) {
            return self.instantiate(&def?, self.file, args);
        }
        if self.locals.imports.contains_key(name) {
            if !self.resolving() {
                return Ok(Ty::new(K::Unresolved { name: name.to_owned(), args }));
            }
            return match self.locals.imported_def(name) {
                Some(ExportedType { def, decl_file, .. }) => self.instantiate(&def?, &decl_file, args),
                None => unsupported(format!("the imported type `{name}`")),
            };
        }
        if !self.resolving() {
            return Ok(Ty::new(K::Unresolved { name: name.to_owned(), args }));
        }
        self.lib_type(name, args)
    }

    fn lib_type(&self, name: &str, args: Vec<Ty>) -> Res<Ty> {
        let key = format!("{name}<{}>", args.iter().map(Ty::key).collect::<Vec<_>>().join(","));
        if name == "Array" && args.len() == 1 {
            return Ok(self.array(args[0].clone()));
        }
        if LIB_INTERFACES.contains(&name) {
            return Ok(Ty::new(K::Ref { name: name.to_owned(), args, id: self.reg.intern(&format!("lib {key}")) }));
        }
        if LIB_ALIASES.contains(&name) && !args.is_empty() {
            let id = self.reg.intern(&format!("lib {key}"));
            return Ok(Ty::new(K::Anon(Anon { id, shape: Shape::Opaque, alias: Some(Rc::new(Alias { name: name.to_owned(), args, id })) })));
        }
        unsupported(format!("the global type `{name}`"))
    }
}

/// The names of the type references in a node, in the order `getAllTypeReferences` finds them.
#[derive(Default)]
pub struct RefNames {
    pub names: Vec<String>,
    /// A `typeof X` query: Stencil adds classes and enums it names, which is not modelled.
    pub type_query: bool,
}

impl<'a> Visit<'a> for RefNames {
    fn visit_ts_type_reference(&mut self, it: &TSTypeReference<'a>) {
        let mut name = &it.type_name;
        while let TSTypeName::QualifiedName(q) = name {
            name = &q.left;
        }
        if let TSTypeName::IdentifierReference(id) = name {
            self.names.push(id.name.to_string());
        }
        oxc::ast_visit::walk::walk_ts_type_reference(self, it);
    }

    fn visit_ts_type_query(&mut self, it: &oxc::ast::ast::TSTypeQuery<'a>) {
        self.type_query = true;
        oxc::ast_visit::walk::walk_ts_type_query(self, it);
    }
}

/// Where a module's import and export statements put a type name: the part of
/// `getTypeReferenceLocation` that reads the source file.
#[derive(Default)]
pub struct FileInfo {
    stmts: Vec<StmtInfo>,
}

enum StmtInfo {
    Import { source: String, named: Vec<(String, String)>, default: Option<String> },
    /// `export default Name;`
    ExportDefault(String),
    /// `export { local as exported };`
    ExportClause(Vec<(String, String)>),
    /// `export [default] interface | type | enum | class Name`
    Declaration { name: String, is_default: bool },
}

impl FileInfo {
    pub fn collect(program: &Program) -> Self {
        use oxc::ast::ast::{Declaration, ExportDefaultDeclarationKind, ImportDeclarationSpecifier};
        let mut stmts = Vec::new();
        for stmt in &program.body {
            match stmt {
                Statement::ImportDeclaration(import) => {
                    let mut named = Vec::new();
                    let mut default = None;
                    for spec in import.specifiers.iter().flatten() {
                        match spec {
                            ImportDeclarationSpecifier::ImportSpecifier(s) => named.push((s.local.name.to_string(), s.imported.name().to_string())),
                            ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => default = Some(s.local.name.to_string()),
                            ImportDeclarationSpecifier::ImportNamespaceSpecifier(_) => {}
                        }
                    }
                    stmts.push(StmtInfo::Import { source: import.source.value.to_string(), named, default });
                }
                Statement::ExportNamedDeclaration(e) => {
                    stmts.push(StmtInfo::ExportClause(e.specifiers.iter().map(|s| (s.local.name().to_string(), s.exported.name().to_string())).collect()));
                }
                Statement::ExportDeclaration(e) => {
                    let name = match &e.declaration {
                        Declaration::TSInterfaceDeclaration(i) => Some(i.id.name.to_string()),
                        Declaration::TSTypeAliasDeclaration(t) => Some(t.id.name.to_string()),
                        Declaration::TSEnumDeclaration(en) => Some(en.id.name.to_string()),
                        Declaration::ClassDeclaration(c) => c.id.as_ref().map(|id| id.name.to_string()),
                        _ => None,
                    };
                    if let Some(name) = name {
                        stmts.push(StmtInfo::Declaration { name, is_default: false });
                    }
                }
                Statement::ExportDefaultDeclaration(e) => match &e.declaration {
                    ExportDefaultDeclarationKind::ClassDeclaration(c) => {
                        if let Some(id) = &c.id {
                            stmts.push(StmtInfo::Declaration { name: id.name.to_string(), is_default: true });
                        }
                    }
                    ExportDefaultDeclarationKind::TSInterfaceDeclaration(i) => stmts.push(StmtInfo::Declaration { name: i.id.name.to_string(), is_default: true }),
                    ExportDefaultDeclarationKind::Identifier(id) => stmts.push(StmtInfo::ExportDefault(id.name.to_string())),
                    _ => {}
                },
                _ => {}
            }
        }
        FileInfo { stmts }
    }
}

/// `path.relative(process.cwd(), path)`, `/`-separated.
pub fn relative_to_cwd(path: &str) -> String {
    let path = path.replace('\\', "/");
    let cwd = std::env::current_dir().map(|c| c.to_string_lossy().replace('\\', "/")).unwrap_or_default();
    let normalize = |p: &str| -> Vec<String> {
        let mut out: Vec<String> = Vec::new();
        for part in p.split('/') {
            match part {
                "" | "." => {}
                ".." => {
                    if out.last().is_some_and(|l| l != "..") {
                        out.pop();
                    } else {
                        out.push("..".into());
                    }
                }
                other => out.push(other.to_owned()),
            }
        }
        out
    };
    let target = if path.starts_with('/') { normalize(&path) } else { normalize(&format!("{cwd}/{path}")) };
    let base = normalize(&cwd);
    let common = target.iter().zip(&base).take_while(|(a, b)| a == b).count();
    let mut parts: Vec<String> = vec!["..".to_owned(); base.len() - common];
    parts.extend(target[common..].iter().cloned());
    parts.join("/")
}

/// `addToLibrary`'s id for a type declared in `file`.
fn type_id(file: &str, name: &str) -> String {
    let rel = relative_to_cwd(file);
    if rel.starts_with("node_modules") { format!("node_modules::{name}") } else { format!("{rel}::{name}") }
}

/// `getTypeReferenceLocation`.
pub fn locate(name: &str, file: &str, info: &FileInfo, resolver: Option<&Resolver>) -> Res<TypeReference> {
    // A named import whose module TypeScript finds.
    let import = info.stmts.iter().find_map(|s| match s {
        StmtInfo::Import { source, named, .. } => named.iter().find(|(local, _)| local == name).map(|(_, imported)| (source, imported)),
        _ => None,
    });
    if let (Some((source, imported)), Some(resolver)) = (import, resolver) {
        if !source.starts_with('.') {
            return unsupported(format!("`{name}`, imported from the package or alias `{source}`"));
        }
        if let Some(home) = resolver.module(file, source) {
            let Some(ty) = home.defs.get(imported) else { return unsupported(format!("`{name}`, which `{source}` does not export as a type")) };
            let declared_in = if ty.class_or_enum { &ty.decl_file } else { &home.file };
            return Ok(TypeReference {
                location: "import",
                path: Some(source.clone()),
                id: type_id(declared_in, &ty.orig_name),
                is_default: false,
                reference_location: Some(imported.clone()),
            });
        }
    }

    // Declared and exported here.
    let local = info.stmts.iter().find_map(|s| match s {
        StmtInfo::ExportDefault(n) if n == name => Some((true, None)),
        StmtInfo::ExportClause(specs) => specs.iter().find(|(local, _)| local == name).map(|(_, exported)| {
            if exported == "default" { (true, None) } else { (false, (exported != name).then(|| exported.clone())) }
        }),
        StmtInfo::Declaration { name: n, is_default } if n == name => Some((*is_default, None)),
        _ => None,
    });
    if let Some((is_default, reference_location)) = local {
        return Ok(TypeReference { location: "local", path: Some(file.to_owned()), id: type_id(file, name), is_default, reference_location });
    }

    // A default import.
    let default_import = info.stmts.iter().any(|s| matches!(s, StmtInfo::Import { default: Some(d), .. } if d == name));
    if default_import && resolver.is_some() {
        return unsupported(format!("`{name}`, a default import"));
    }
    Ok(TypeReference { location: "global", path: None, id: format!("global::{name}"), is_default: false, reference_location: None })
}

/// Where the members being described live, to find where the types they name come from.
pub struct Site<'s> {
    pub file: &'s str,
    pub info: &'s FileInfo,
    pub resolver: Option<&'s Resolver>,
}

impl TypeEnv<'_, '_, '_> {
    /// `resolveType(checker, type, typeNode)`: `T[]` written as an array type is resolved by its
    /// element, anything else by the type it denotes.
    pub fn resolve_node(&self, node: &TSType, optional: bool) -> Res<String> {
        if let TSType::TSArrayType(a) = node {
            let inner = self.resolve_node(&a.element_type, false)?;
            return Ok(if inner.contains(" | ") { format!("({inner})[]") } else { format!("{inner}[]") });
        }
        let mut ty = self.eval(node)?;
        if optional {
            ty = self.with_undefined(ty);
        }
        if self.resolving() && order_depends_on_program(&ty) {
            return unsupported("a union nested in a type, whose members the checker orders by when it first met them");
        }
        resolve_type(&ty)
    }
}

/// `getAttributeTypeInfo`: where each type a node names comes from.
pub fn references(names: RefNames, site: &Site) -> Res<References> {
    if names.type_query {
        return unsupported("`typeof`");
    }
    let mut out: Vec<(String, TypeReference)> = Vec::new();
    for name in names.names {
        if out.iter().any(|(n, _)| *n == name) {
            continue;
        }
        let located = locate(&name, site.file, site.info, site.resolver)?;
        out.push((name, located));
    }
    Ok(References(out))
}

/// The `resolved` text and `references` of a prop or an event.
pub fn member_type(env: &TypeEnv, site: &Site, annotation: Option<&TSType>, optional: bool, original: &str, visit: impl FnOnce(&mut RefNames)) -> Res<(String, References)> {
    let Some(annotation) = annotation else {
        // Inferred from the initializer: only the types that print as one word are known.
        return match original {
            "string" | "number" | "boolean" | "any" | "bigint" | "symbol" | "unknown" if !optional => Ok((original.to_owned(), References::default())),
            _ => unsupported(format!("the inferred type `{original}`")),
        };
    };
    let resolved = env.resolve_node(annotation, optional)?;
    let mut names = RefNames::default();
    visit(&mut names);
    Ok((resolved, references(names, site)?))
}

impl TypeEnv<'_, '_, '_> {
    /// A type node the way the checker re-prints a type annotation it reuses (`signatureToString`):
    /// as written, with the printer's spacing and quotes.
    pub fn node_text(&self, t: &TSType) -> Res<String> {
        Ok(match t {
            TSType::TSAnyKeyword(_) => "any".into(),
            TSType::TSUnknownKeyword(_) => "unknown".into(),
            TSType::TSNeverKeyword(_) => "never".into(),
            TSType::TSVoidKeyword(_) => "void".into(),
            TSType::TSUndefinedKeyword(_) => "undefined".into(),
            TSType::TSNullKeyword(_) => "null".into(),
            TSType::TSStringKeyword(_) => "string".into(),
            TSType::TSNumberKeyword(_) => "number".into(),
            TSType::TSBigIntKeyword(_) => "bigint".into(),
            TSType::TSSymbolKeyword(_) => "symbol".into(),
            TSType::TSObjectKeyword(_) => "object".into(),
            TSType::TSBooleanKeyword(_) => "boolean".into(),
            TSType::TSParenthesizedType(p) => format!("({})", self.node_text(&p.type_annotation)?),
            TSType::TSLiteralType(l) => {
                // The literal a type denotes prints as its value; a template keeps its backticks.
                if let TSLiteral::TemplateLiteral(t) = &l.literal {
                    if let Some(q) = t.quasis.first() {
                        return Ok(format!("`{}`", q.value.raw));
                    }
                }
                match &*self.literal(&l.literal)?.0 {
                    K::Str(s, _) => quote(s),
                    K::Num(n, _) => n.clone(),
                    K::True => "true".into(),
                    K::False => "false".into(),
                    _ => return unsupported("this literal type"),
                }
            }
            TSType::TSUnionType(u) => u.types.iter().map(|m| self.node_text(m)).collect::<Res<Vec<_>>>()?.join(" | "),
            TSType::TSArrayType(a) => format!("{}[]", self.node_text(&a.element_type)?),
            TSType::TSTupleType(t) => {
                let mut parts = Vec::new();
                for e in &t.element_types {
                    let Some(inner) = e.as_ts_type() else { return unsupported("an optional or rest tuple element") };
                    parts.push(match inner {
                        TSType::TSNamedTupleMember(m) => {
                            let Some(el) = m.element_type.as_ts_type() else { return unsupported("a rest tuple element") };
                            format!("{}{}: {}", m.label.name, if m.optional { "?" } else { "" }, self.node_text(el)?)
                        }
                        other => self.node_text(other)?,
                    });
                }
                format!("[{}]", parts.join(", "))
            }
            TSType::TSFunctionType(f) => {
                if f.type_parameters.is_some() || f.this_param.is_some() {
                    return unsupported("a generic function type");
                }
                format!("{} => {}", self.params_text(&f.params)?, self.node_text(&f.return_type.type_annotation)?)
            }
            TSType::TSTypeLiteral(l) => {
                if l.members.is_empty() {
                    return Ok("{}".into());
                }
                let mut out = String::from("{ ");
                for m in &l.members {
                    out.push_str(&self.member_text(m)?);
                    out.push(' ');
                }
                out.push('}');
                out
            }
            TSType::TSTypeReference(r) => {
                let name = match &r.type_name {
                    TSTypeName::IdentifierReference(id) => id.name.to_string(),
                    TSTypeName::QualifiedName(q) => match &q.left {
                        TSTypeName::IdentifierReference(left) => format!("{}.{}", left.name, q.right.name),
                        _ => return unsupported("a qualified type name"),
                    },
                    TSTypeName::ThisExpression(_) => return unsupported("`this`"),
                };
                match &r.type_arguments {
                    Some(args) if !args.params.is_empty() => {
                        format!("{name}<{}>", args.params.iter().map(|a| self.node_text(a)).collect::<Res<Vec<_>>>()?.join(", "))
                    }
                    _ => name,
                }
            }
            _ => return unsupported("this kind of type in a method signature"),
        })
    }

    fn params_text(&self, fp: &FormalParameters) -> Res<String> {
        let mut parts = Vec::new();
        for p in &fp.items {
            let Some(name) = p.pattern.get_identifier_name() else { return unsupported("a destructured parameter") };
            let ty = match &p.type_annotation {
                Some(t) => self.node_text(&t.type_annotation)?,
                None => "any".into(),
            };
            parts.push(format!("{name}{}: {ty}", if p.optional { "?" } else { "" }));
        }
        if let Some(rest) = &fp.rest {
            let Some(name) = rest.rest.argument.get_identifier_name() else { return unsupported("a destructured rest parameter") };
            let ty = match &rest.type_annotation {
                Some(t) => self.node_text(&t.type_annotation)?,
                None => "any[]".into(),
            };
            parts.push(format!("...{name}: {ty}"));
        }
        Ok(format!("({})", parts.join(", ")))
    }

    fn member_text(&self, m: &TSSignature) -> Res<String> {
        use oxc::ast::ast::PropertyKey;
        let key = |k: &PropertyKey| -> Res<String> {
            match k {
                PropertyKey::StaticIdentifier(id) => Ok(id.name.to_string()),
                PropertyKey::StringLiteral(s) => Ok(quote(&s.value)),
                PropertyKey::NumericLiteral(n) => js_number(n.raw.as_ref().map(|r| r.as_str()).unwrap_or_default()).map_or_else(|| unsupported("this property name"), Ok),
                _ => unsupported("a computed property name"),
            }
        };
        let ret = |t: &Option<oxc::allocator::Box<oxc::ast::ast::TSTypeAnnotation>>| -> Res<String> {
            match t {
                Some(t) => self.node_text(&t.type_annotation),
                None => Ok("any".into()),
            }
        };
        Ok(match m {
            TSSignature::TSPropertySignature(p) => {
                let ty = match &p.type_annotation {
                    Some(t) => self.node_text(&t.type_annotation)?,
                    None => "any".into(),
                };
                format!("{}{}{}: {ty};", if p.readonly { "readonly " } else { "" }, key(&p.key)?, if p.optional { "?" } else { "" })
            }
            TSSignature::TSMethodSignature(s) => {
                if s.type_parameters.is_some() || s.this_param.is_some() || !matches!(s.kind, oxc::ast::ast::TSMethodSignatureKind::Method) {
                    return unsupported("a generic or accessor method signature");
                }
                format!("{}{}{}: {};", key(&s.key)?, if s.optional { "?" } else { "" }, self.params_text(&s.params)?, ret(&s.return_type)?)
            }
            TSSignature::TSCallSignatureDeclaration(c) => {
                if c.type_parameters.is_some() || c.this_param.is_some() {
                    return unsupported("a generic call signature");
                }
                format!("{}: {};", self.params_text(&c.params)?, ret(&c.return_type)?)
            }
            TSSignature::TSIndexSignature(i) => format!(
                "{}[{}: {}]: {};",
                if i.readonly { "readonly " } else { "" },
                i.parameter.name,
                self.node_text(&i.parameter.type_annotation.type_annotation)?,
                self.node_text(&i.type_annotation.type_annotation)?
            ),
            TSSignature::TSConstructSignatureDeclaration(_) => return unsupported("a construct signature"),
        })
    }
}

/// A `@Method()`'s `complexType` (`parseMethodDecorator`).
pub fn method_type(env: &TypeEnv, site: &Site, m: &MethodDefinition, docs: &[Vec<JsDoc>]) -> Res<MethodComplexType> {
    let func = &m.value;
    if func.type_parameters.is_some() || func.this_param.is_some() {
        return unsupported("a generic method");
    }
    let check = |ty: &Ty| -> Res<String> {
        if env.resolving() && print_order_depends_on_program(ty) {
            return unsupported("a union whose members the checker orders by when it first met them");
        }
        type_to_string(ty)
    };

    let mut parameters = Vec::new();
    let mut shown = Vec::new();
    for p in &func.params.items {
        let Some(name) = p.pattern.get_identifier_name() else { return unsupported("a destructured parameter") };
        let (ty, text) = match (&p.type_annotation, &p.initializer) {
            (Some(t), _) => (env.eval(&t.type_annotation)?, env.node_text(&t.type_annotation)?),
            (None, None) => (Ty::any(), "any".to_owned()),
            // The type of the initializer, widened.
            (None, Some(init)) => match &**init {
                Expression::StringLiteral(_) => (Ty::new(K::String), "string".to_owned()),
                Expression::NumericLiteral(_) => (Ty::new(K::Number), "number".to_owned()),
                Expression::BooleanLiteral(_) => (boolean(), "boolean".to_owned()),
                _ => return unsupported("a parameter typed by its default value"),
            },
        };
        let ty = if p.optional { env.with_undefined(ty) } else { ty };
        parameters.push(MethodParameter { name: name.to_string(), type_text: check(&ty)?, docs: param_docs(docs, name.as_str()) });
        shown.push(format!("{name}{}: {text}", if p.optional || p.initializer.is_some() { "?" } else { "" }));
    }
    if let Some(rest) = &func.params.rest {
        let Some(name) = rest.rest.argument.get_identifier_name() else { return unsupported("a destructured rest parameter") };
        let (ty, text) = match &rest.type_annotation {
            Some(t) => (env.eval(&t.type_annotation)?, env.node_text(&t.type_annotation)?),
            None => (env.array(Ty::any()), "any[]".to_owned()),
        };
        parameters.push(MethodParameter { name: name.to_string(), type_text: check(&ty)?, docs: param_docs(docs, name.as_str()) });
        shown.push(format!("...{name}: {text}"));
    }

    let (mut returned, shown_return) = match &func.return_type {
        Some(t) => (check(&env.eval(&t.type_annotation)?)?, env.node_text(&t.type_annotation)?),
        None if returns_value(func) => return unsupported("a return type inferred from the body"),
        // `async` without a return type: `any` where `Promise` is missing (the single-file program).
        None if func.r#async && !env.resolving() => ("any".to_owned(), "any".to_owned()),
        None if func.r#async => ("Promise<void>".to_owned(), "Promise<void>".to_owned()),
        None => ("void".to_owned(), "void".to_owned()),
    };
    // A method that returns nothing is made to return a promise (with a warning).
    let was_void = returned == "void";
    if was_void {
        returned = "Promise<void>".to_owned();
    }

    // Stencil reads the return type's references before those of the whole method.
    let mut names = RefNames::default();
    if let Some(ret) = &func.return_type {
        names.visit_ts_type_annotation(ret);
    }
    names.visit_method_definition(m);
    let mut signature = format!("({}) => {shown_return}", shown.join(", "));
    if was_void && signature.ends_with("=> void") {
        signature.truncate(signature.len() - "void".len());
        signature.push_str("Promise<void>");
    }
    Ok(MethodComplexType { signature, parameters, references: references(names, site)?, return_type: returned })
}

/// A property key as the checker prints it: a quoted name keeps the quote its declaration used.
fn key_text(key: &oxc::ast::ast::PropertyKey, name: &str) -> String {
    let text = property_name(name);
    if let oxc::ast::ast::PropertyKey::StringLiteral(lit) = key {
        if text.starts_with('"') && lit.raw.as_ref().is_some_and(|r| r.starts_with('\'')) {
            return format!("'{}'", text[1..text.len() - 1].replace("\\\"", "\"").replace('\'', "\\'"));
        }
    }
    text
}
