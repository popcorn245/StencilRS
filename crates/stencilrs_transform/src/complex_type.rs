//! `complexType` of props, events and methods: `resolved` and `references`.
//!
//! Stencil asks the TypeScript checker for both. Here a type annotation is evaluated
//! syntactically into the model of `types.rs`, following local aliases, interfaces and enums and
//! (in build-accurate mode) relative imports, and printed the way the checker prints it. A type
//! this cannot reproduce is [`Unsupported`], and the caller flags the member for Stencil's own
//! compiler instead of guessing.

use rustc_hash::FxHashMap;
use std::cell::RefCell;
use std::rc::Rc;

use oxc::ast::ast::{
    ArrowFunctionExpression, Class, Expression, FormalParameters, Function, MethodDefinition,
    Program, ReturnStatement, StaticMemberExpression, Statement, TSEnumDeclaration, TSEnumMemberName, TSLiteral,
    TSSignature, TSTupleElement, ThisExpression, TSType, TSTypeName, TSTypeOperatorOperator, TSTypeReference,
    UnaryOperator,
};
use oxc::ast_visit::Visit;
use oxc::syntax::scope::ScopeFlags;

use crate::analyze::returns_value;
use crate::eval::property_key_name;
use crate::jsdoc::{JsDoc, param_docs};
use crate::locals::{LocalType, Locals, ThisMember};
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
    Named {
        name: String,
        defaults: Vec<Option<Ty>>,
        /// The properties of an interface that has nothing but properties, declared once.
        props: Option<Rc<Vec<IfaceProp>>>,
    },
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

/// Interfaces of the lib's `Intl` namespace, printed by the checker without the qualifier. Only
/// those declared in lib.es5.d.ts, so they exist whatever `lib` / `target` the project sets.
const INTL_INTERFACES: &[&str] = &["DateTimeFormatOptions", "NumberFormatOptions", "CollatorOptions"];

/// The type names of lib.d.ts the model prints by name (`Promise<T>`, `HTMLElement`). Generic
/// ones need their arguments written (`CustomEvent` without any prints `CustomEvent<any>`).
const LIB_INTERFACES: &[&str] = &[
    "Promise",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "Date",
    "Error",
    "RegExp",
    "Function",
    "Event",
    "CustomEvent",
    "UIEvent",
    "MouseEvent",
    "KeyboardEvent",
    "PointerEvent",
    "TouchEvent",
    "FocusEvent",
    "InputEvent",
    "DragEvent",
    "WheelEvent",
    "CompositionEvent",
    "AnimationEvent",
    "TransitionEvent",
    "ClipboardEvent",
    "ErrorEvent",
    "ProgressEvent",
    "Node",
    "Element",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "HTMLButtonElement",
    "HTMLDivElement",
    "HTMLImageElement",
    "HTMLCanvasElement",
    "HTMLVideoElement",
    "HTMLAudioElement",
    "HTMLFormElement",
    "HTMLAnchorElement",
    "HTMLSlotElement",
    "HTMLLabelElement",
    "HTMLSpanElement",
    "HTMLIFrameElement",
    "HTMLDialogElement",
    "HTMLTemplateElement",
    "SVGElement",
    "SVGSVGElement",
    "File",
    "Blob",
    "FileList",
    "FormData",
    "DOMRect",
    "AbortSignal",
    "AbortController",
    "MediaStream",
    "URL",
    "Response",
    "Request",
    "Headers",
    "ShadowRoot",
    "Document",
    "DocumentFragment",
    "Text",
    "Window",
    "MutationObserver",
    "ResizeObserver",
    "IntersectionObserver",
    "CSSStyleDeclaration",
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
    defs: RefCell<FxHashMap<String, Res<TypeDef>>>,
    busy: RefCell<Vec<String>>,
    params: RefCell<Vec<(String, Ty)>>,
}

impl<'e, 'a, 'b> TypeEnv<'e, 'a, 'b> {
    pub fn new(locals: &'e Locals<'a, 'b>, reg: &'e Registry, strict: bool, file: &'e str) -> Self {
        reg.activate();
        TypeEnv {
            locals,
            reg,
            strict,
            file,
            defs: RefCell::default(),
            busy: RefCell::default(),
            params: RefCell::default(),
        }
    }

    fn resolving(&self) -> bool {
        self.locals.resolving()
    }

    fn with_undefined(&self, ty: Ty) -> Ty {
        if self.strict {
            union_of(vec![ty, Ty::new(K::Undefined)], true, None)
        } else {
            ty
        }
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
            LocalType::Interface(_) | LocalType::Class(_) => self.named_def(name),
        };
        self.busy.borrow_mut().pop();
        self.defs.borrow_mut().insert(name.to_owned(), def.clone());
        Some(def)
    }

    /// A generic interface or class: the defaults of its type parameters, written in terms of
    /// the parameters before them.
    fn named_def(&self, name: &str) -> Res<TypeDef> {
        let mut defaults = Vec::new();
        if let Some(decl) = self.locals.decl_params.get(name) {
            let depth = self.params.borrow().len();
            let mut result = Ok(());
            for (i, p) in decl.params.iter().enumerate() {
                let default = match &p.default {
                    Some(d) => match self.eval(d) {
                        Ok(ty) => Some(ty),
                        Err(e) => {
                            result = Err(e);
                            break;
                        }
                    },
                    None => None,
                };
                defaults.push(default);
                self.params
                    .borrow_mut()
                    .push((p.name.name.to_string(), Ty::new(K::Param(i))));
            }
            self.params.borrow_mut().truncate(depth);
            result?;
        }
        let mut props = None;
        if let Some(LocalType::Interface(body)) = self.locals.types.get(name)
            && self.locals.plain_interfaces.contains(name)
            && !self.locals.merged_types.contains(name)
        {
            let mut list = Vec::new();
            let mut plain = true;
            for m in body.iter() {
                match m {
                    TSSignature::TSPropertySignature(p) if !p.computed => {
                        match property_key_name(&p.key) {
                            Some(key) => list.push(IfaceProp {
                                name: key,
                                optional: p.optional,
                                string_typed: matches!(
                                    p.type_annotation.as_ref().map(|t| &t.type_annotation),
                                    Some(TSType::TSStringKeyword(_))
                                ),
                            }),
                            None => plain = false,
                        }
                    }
                    _ => plain = false,
                }
            }
            props = plain.then(|| Rc::new(list));
        }
        Ok(TypeDef::Named {
            name: name.to_owned(),
            defaults,
            props,
        })
    }

    fn alias_def(&self, name: &str, node: &TSType) -> Res<TypeDef> {
        let names = self
            .locals
            .alias_params
            .get(name)
            .cloned()
            .unwrap_or_default();
        let depth = self.params.borrow().len();
        for (i, p) in names.iter().enumerate() {
            self.params
                .borrow_mut()
                .push(((*p).to_owned(), Ty::new(K::Param(i))));
        }
        self.reg.enter_alias();
        let ty = self.eval(node);
        self.reg.leave_alias();
        self.params.borrow_mut().truncate(depth);
        let ty = ty?;
        let args = (0..names.len()).map(|i| Ty::new(K::Param(i))).collect();
        let alias_id = self.reg.fresh();
        self.reg.set_symbol(alias_id, format!("{}::{name}", self.file));
        let alias = Rc::new(Alias {
            name: name.to_owned(),
            args,
            id: alias_id,
            declared: names.iter().map(|n| (*n).to_owned()).collect(),
        });
        // `keyof X` is made by `getIndexType`, which does not give the union the alias it is declared as.
        let mut written = node;
        while let TSType::TSParenthesizedType(p) = written {
            written = &p.type_annotation;
        }
        let ty = if matches!(written, TSType::TSTypeOperatorType(op) if matches!(op.operator, TSTypeOperatorOperator::Keyof))
        {
            ty
        } else {
            ty.with_alias(alias)
        };
        Ok(TypeDef::Alias {
            name: name.to_owned(),
            params: names.len(),
            ty,
        })
    }

    /// A union enum, or (a member that is computed) a plain named type.
    fn enum_def(&self, decl: &TSEnumDeclaration) -> TypeDef {
        let name = decl.id.name.to_string();
        let named = TypeDef::Named {
            name: name.clone(),
            defaults: Vec::new(),
            props: None,
        };
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
                Some(Expression::UnaryExpression(u))
                    if matches!(u.operator, UnaryOperator::UnaryNegation)
                        && matches!(u.argument, Expression::NumericLiteral(_)) =>
                {
                    false
                }
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
        TypeDef::UnionEnum(Rc::new(EnumInfo {
            name,
            members,
            base_id,
        }))
    }

    /// `imported`: the name is an import, which the checker gives an empty list of alias type
    /// arguments when none are written.
    pub fn instantiate(
        &self,
        def: &TypeDef,
        decl_file: &str,
        args: Vec<Ty>,
        imported: bool,
    ) -> Res<Ty> {
        match def {
            TypeDef::Alias { params, ty, name } => {
                if args.is_empty() && *params > 0 && imported {
                    return match ty.without_arguments(self.reg.fresh()) {
                        Some(bare) => Ok(bare),
                        None => unsupported(format!("`{name}` with default type arguments")),
                    };
                }
                if args.len() != *params {
                    return unsupported(format!("`{name}` with default type arguments"));
                }
                let applied = Subst {
                    reg: self.reg,
                    strict: self.strict,
                    args: &args,
                }
                .apply(ty);
                self.check_intersections(&applied)?;
                Ok(applied)
            }
            TypeDef::UnionEnum(e) => Ok(Ty::new(K::Enum(e.clone()))),
            TypeDef::Named { name, defaults, props } => {
                // A type argument left out is its default (`Box` for `Box<T = any>` is `Box<any>`).
                let mut args = args;
                if args.len() > defaults.len() {
                    return unsupported(format!("`{name}` with too many type arguments"));
                }
                while args.len() < defaults.len() {
                    let Some(default) = &defaults[args.len()] else {
                        return unsupported(format!("`{name}` without its type arguments"));
                    };
                    let filled = Subst {
                        reg: self.reg,
                        strict: self.strict,
                        args: &args,
                    }
                    .apply(default);
                    args.push(filled);
                }
                let key = format!(
                    "ref {decl_file}::{name}<{}>",
                    args.iter().map(Ty::key).collect::<Vec<_>>().join(",")
                );
                let id = self.reg.intern(&key);
                if let Some(props) = props {
                    self.reg.ref_props.borrow_mut().insert(id, props.clone());
                }
                self.reg.set_symbol(id, format!("{decl_file}::{name}"));
                Ok(Ty::new(K::Ref {
                    name: name.clone(),
                    args,
                    id,
                }))
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
                let tuple = self.anon(Shape::Tuple(elems));
                self.reg.note_created(tuple.id());
                tuple
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
            TSType::TSIntersectionType(i) => {
                let members: Res<Vec<Ty>> = i.types.iter().map(|m| self.eval(m)).collect();
                self.intersection(members?)?
            }
            TSType::TSTypeOperatorType(op) => match op.operator {
                TSTypeOperatorOperator::Keyof => self.keyof(&op.type_annotation)?,
                _ => return unsupported("`readonly` or `unique symbol`"),
            },
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

    /// `getIntersectionType` for the members this model can reproduce: object-like types
    /// (object literals, interfaces, functions, tuples, arrays) and at most one of `string`,
    /// `number`, `bigint` or `symbol` (a brand). The checker distributes an intersection over a
    /// union, collapses `any`, `never`, `unknown`, literals and clashing primitives, and drops
    /// `{}`; those are left to Stencil's own compiler.
    fn intersection(&self, members: Vec<Ty>) -> Res<Ty> {
        // `A & (B | C)` is `A & B | A & C`: the checker's `getCrossProductIntersections` makes
        // the intersections in the order of the cross product (the last union varies fastest)
        // and unites them, which sorts them by id. Every combination must itself be one this
        // model reproduces, so a union with a literal, `null` or `{}` member is left to Stencil.
        if members.iter().any(|m| matches!(&*m.0, K::Union(..))) {
            let alts: Vec<Vec<Ty>> = members
                .iter()
                .map(|m| match &*m.0 {
                    K::Union(ms, _, _) => ms.clone(),
                    _ => vec![m.clone()],
                })
                .collect();
            if members.iter().any(contains_param) {
                return unsupported("a generic union in an intersection type");
            }
            let mut count: usize = 1;
            for a in &alts {
                count = count.saturating_mul(a.len());
                if count > 256 {
                    return unsupported("a large union in an intersection type");
                }
            }
            let mut results = Vec::with_capacity(count);
            for i in 0..count {
                let mut n = i;
                let mut chosen = alts.iter().map(|a| a[0].clone()).collect::<Vec<_>>();
                for j in (0..alts.len()).rev() {
                    chosen[j] = alts[j][n % alts[j].len()].clone();
                    n /= alts[j].len();
                }
                results.push(self.intersection(chosen)?);
            }
            let id = self.reg.fresh();
            let united = union_of(results, self.strict, None);
            return Ok(match &*united.0 {
                K::Union(ms, None, None) => Ty::new(K::Union(
                    ms.clone(),
                    None,
                    Some(distribution_origin(members, id)),
                )),
                _ => united,
            });
        }
        let mut flat: Vec<Ty> = Vec::new();
        for m in members {
            match &*m.0 {
                K::Anon(Anon {
                    shape: Shape::Intersection(inner),
                    ..
                }) => flat.extend(inner.iter().cloned()),
                _ => flat.push(m),
            }
        }
        let mut members: Vec<Ty> = Vec::new();
        let mut primitives = 0;
        for m in flat {
            match &*m.0 {
                K::String | K::Number | K::BigInt | K::Symbol => primitives += 1,
                K::Ref { .. } | K::Array(..) => {}
                // A generic alias's parameter: checked again once it is replaced (`check_intersections`).
                K::Param(_) => {}
                K::Anon(a) => match &a.shape {
                    Shape::Object(ms) if !ms.is_empty() => {}
                    Shape::Function(_) | Shape::Tuple(_) => {}
                    // A lib mapped type (`Record<never, never>`): an object type the checker keeps.
                    Shape::Opaque if a.alias.is_some() => {}
                    _ => return unsupported("this member of an intersection type"),
                },
                K::Enum(_) => {
                    return unsupported(
                        "a union in an intersection type, which the checker distributes",
                    );
                }
                _ => return unsupported("this member of an intersection type"),
            }
            if !members.iter().any(|e| e.key() == m.key()) {
                members.push(m);
            }
        }
        if primitives > 1 {
            return unsupported("an intersection of primitive types");
        }
        if members.len() == 1 {
            return Ok(members.remove(0));
        }
        let id = self.reg.intern(&format!(
            "inter {}",
            members.iter().map(Ty::key).collect::<Vec<_>>().join(",")
        ));
        Ok(Ty::new(K::Anon(Anon {
            id,
            shape: Shape::Intersection(members),
            alias: None,
        })))
    }

    /// `keyof T` for the operands whose keys are written down: an object type literal, a
    /// `typeof` a local `const` initialised with an object literal, and a local alias of those.
    /// A union of the keys' string literals, created in the order the keys are written.
    fn keyof(&self, operand: &TSType) -> Res<Ty> {
        let keys = self.keys_of(operand, 0)?;
        let lits: Vec<Ty> = keys.iter().map(|k| self.string_literal(k)).collect();
        Ok(if lits.is_empty() {
            Ty::new(K::Never)
        } else {
            union_of(lits, self.strict, None)
        })
    }

    fn keys_of(&self, t: &TSType, depth: u8) -> Res<Vec<String>> {
        if depth > 8 {
            return unsupported("a recursive `keyof`");
        }
        let mut keys: Vec<String> = Vec::new();
        let mut add = |name: String| {
            if !keys.contains(&name) {
                keys.push(name);
            }
        };
        match t {
            TSType::TSParenthesizedType(p) => return self.keys_of(&p.type_annotation, depth + 1),
            TSType::TSTypeLiteral(l) => {
                for m in &l.members {
                    let key = match m {
                        TSSignature::TSPropertySignature(p) if !p.computed => &p.key,
                        TSSignature::TSMethodSignature(s) if !s.computed => &s.key,
                        _ => return unsupported("the keys of this object type"),
                    };
                    add(self.literal_key(key)?);
                }
            }
            TSType::TSTypeQuery(q) => {
                let oxc::ast::ast::TSTypeQueryExprName::IdentifierReference(id) = &q.expr_name
                else {
                    return unsupported("`typeof` of a qualified name");
                };
                let name = id.name.as_str();
                if self.locals.const_annotations.contains_key(name) || self.type_params_shadow(name)
                {
                    return unsupported("`typeof` a value with a written type");
                }
                let Some(init) = self.locals.const_init(name) else {
                    return unsupported("`typeof` this value");
                };
                let mut init = init;
                loop {
                    init = match init {
                        Expression::ParenthesizedExpression(p) => &p.expression,
                        Expression::TSAsExpression(a) => &a.expression,
                        Expression::TSSatisfiesExpression(a) => &a.expression,
                        _ => break,
                    };
                }
                let Expression::ObjectExpression(obj) = init else {
                    return unsupported("`typeof` a value that is not an object literal");
                };
                for prop in &obj.properties {
                    let oxc::ast::ast::ObjectPropertyKind::ObjectProperty(p) = prop else {
                        return unsupported("`typeof` an object literal with a spread");
                    };
                    if p.computed || !matches!(p.kind, oxc::ast::ast::PropertyKind::Init) {
                        return unsupported(
                            "`typeof` an object literal with computed or accessor members",
                        );
                    }
                    add(self.literal_key(&p.key)?);
                }
            }
            TSType::TSTypeReference(r) if r.type_arguments.is_none() => {
                let TSTypeName::IdentifierReference(id) = &r.type_name else {
                    return unsupported("`keyof` a qualified name");
                };
                match self.locals.types.get(id.name.as_str()) {
                    Some(LocalType::Alias(node))
                        if !self.locals.alias_params.contains_key(id.name.as_str()) =>
                    {
                        return self.keys_of(node, depth + 1);
                    }
                    _ => return unsupported(format!("`keyof {}`", id.name)),
                }
            }
            _ => return unsupported("`keyof` of this type"),
        }
        Ok(keys)
    }

    fn type_params_shadow(&self, name: &str) -> bool {
        self.params.borrow().iter().any(|(n, _)| n == name)
    }

    /// A property key that is a string literal type: an identifier or a string, not a number.
    fn literal_key(&self, key: &oxc::ast::ast::PropertyKey) -> Res<String> {
        use oxc::ast::ast::PropertyKey;
        match key {
            PropertyKey::StaticIdentifier(id) => Ok(id.name.to_string()),
            PropertyKey::StringLiteral(s) if s.value.parse::<f64>().is_err() => {
                Ok(s.value.to_string())
            }
            _ => unsupported("a numeric or computed key in `keyof`"),
        }
    }

    /// An intersection written with a type parameter (`U & Record<never, never>`) is only known
    /// once the parameter is replaced: run the checks of [`Self::intersection`] again.
    fn check_intersections(&self, ty: &Ty) -> Res<()> {
        match &*ty.0 {
            K::Union(ms, alias, _) => {
                for m in ms {
                    self.check_intersections(m)?;
                }
                for a in alias.iter().flat_map(|a| a.args.iter()) {
                    self.check_intersections(a)?;
                }
            }
            K::Array(t, _) => self.check_intersections(t)?,
            K::Ref { args, .. } | K::Unresolved { args, .. } => {
                for a in args {
                    self.check_intersections(a)?;
                }
            }
            K::Anon(a) => match &a.shape {
                Shape::Intersection(ms) => {
                    for m in ms {
                        self.check_intersections(m)?;
                    }
                    self.intersection(ms.clone())?;
                }
                Shape::Object(ms) => {
                    for m in ms {
                        match &m.kind {
                            MemberKind::Prop(t) => self.check_intersections(t)?,
                            MemberKind::Method(s) | MemberKind::Call(s) => self.check_sig(s)?,
                            MemberKind::Index { key, value, .. } => {
                                self.check_intersections(key)?;
                                self.check_intersections(value)?;
                            }
                        }
                    }
                }
                Shape::Function(s) => self.check_sig(s)?,
                Shape::Tuple(es) => {
                    for e in es {
                        self.check_intersections(&e.ty)?;
                    }
                }
                _ => {}
            },
            _ => {}
        }
        Ok(())
    }

    fn check_sig(&self, s: &Sig) -> Res<()> {
        for p in &s.params {
            self.check_intersections(&p.ty)?;
        }
        self.check_intersections(&s.ret)
    }

    fn anon(&self, shape: Shape) -> Ty {
        Ty::new(K::Anon(Anon {
            id: self.reg.fresh(),
            shape,
            alias: None,
        }))
    }

    fn array(&self, el: Ty) -> Ty {
        if !self.resolving() {
            // Without the lib `Array` is an empty generic type, and every array type is the
            // checker's one empty object type: it prints as `{}`, two of them in a union are
            // one member, and it sorts before every type the program makes.
            return Ty::new(K::Anon(Anon {
                id: crate::types::ID_EMPTY_OBJECT,
                shape: Shape::Text("{}".into()),
                alias: None,
            }));
        }
        let id = self.reg.intern(&format!("array<{}>", el.key()));
        self.reg.note_created(id);
        Ty::new(K::Array(el, id))
    }

    fn literal(&self, lit: &TSLiteral) -> Res<Ty> {
        Ok(match lit {
            TSLiteral::BooleanLiteral(b) => Ty::new(if b.value { K::True } else { K::False }),
            TSLiteral::StringLiteral(s) => self.string_literal(&s.value),
            TSLiteral::TemplateLiteral(t) if t.expressions.is_empty() => {
                let text: Option<String> = t
                    .quasis
                    .iter()
                    .map(|q| q.value.cooked.as_ref().map(|c| c.to_string()))
                    .collect();
                match text {
                    Some(text) => self.string_literal(&text),
                    None => return unsupported("a template literal type"),
                }
            }
            TSLiteral::NumericLiteral(n) => {
                match js_number(n.raw.as_ref().map(|r| r.as_str()).unwrap_or_default()) {
                    Some(text) => self.number_literal(text),
                    None => return unsupported("this number literal type"),
                }
            }
            TSLiteral::UnaryExpression(u) => match (&u.operator, &u.argument) {
                (UnaryOperator::UnaryNegation, Expression::NumericLiteral(n)) => {
                    match js_number(n.raw.as_ref().map(|r| r.as_str()).unwrap_or_default()) {
                        Some(text) if text != "0" => {
                            // The checker meets the number before its negation.
                            self.number_literal(text.clone());
                            self.number_literal(format!("-{text}"))
                        }
                        _ => return unsupported("this number literal type"),
                    }
                }
                _ => return unsupported("this literal type"),
            },
            TSLiteral::BigIntLiteral(_) | TSLiteral::TemplateLiteral(_) => {
                return unsupported("a bigint or template literal type");
            }
        })
    }

    fn string_literal(&self, value: &str) -> Ty {
        Ty::new(K::Str(
            value.to_owned(),
            self.reg.intern(&format!("str {value}")),
        ))
    }

    fn number_literal(&self, text: String) -> Ty {
        let id = self.reg.intern(&format!("num {text}"));
        Ty::new(K::Num(text, id))
    }

    fn tuple_elem(&self, e: &TSTupleElement) -> Res<TupleElem> {
        let Some(t) = e.as_ts_type() else {
            return unsupported("an optional or rest tuple element");
        };
        if let TSType::TSNamedTupleMember(m) = t {
            let Some(inner) = m.element_type.as_ts_type() else {
                return unsupported("a rest tuple element");
            };
            if m.optional {
                return unsupported("an optional tuple element");
            }
            return Ok(TupleElem {
                label: Some(m.label.name.to_string()),
                ty: self.eval(inner)?,
                optional: false,
                rest: false,
            });
        }
        Ok(TupleElem {
            label: None,
            ty: self.eval(t)?,
            optional: false,
            rest: false,
        })
    }

    fn params(&self, fp: &FormalParameters) -> Res<Vec<Param>> {
        let mut out = Vec::new();
        for p in &fp.items {
            let Some(name) = p.pattern.get_identifier_name() else {
                return unsupported("a destructured parameter");
            };
            let ty = match &p.type_annotation {
                Some(t) => self.eval(&t.type_annotation)?,
                None => Ty::any(),
            };
            let optional = p.optional || p.initializer.is_some();
            out.push(Param {
                name: name.to_string(),
                optional,
                rest: false,
                ty: if optional {
                    self.with_undefined(ty)
                } else {
                    ty
                },
            });
        }
        if let Some(rest) = &fp.rest {
            let Some(name) = rest.rest.argument.get_identifier_name() else {
                return unsupported("a destructured rest parameter");
            };
            let ty = match &rest.type_annotation {
                Some(t) => self.eval(&t.type_annotation)?,
                None => self.array(Ty::any()),
            };
            out.push(Param {
                name: name.to_string(),
                optional: false,
                rest: true,
                ty,
            });
        }
        Ok(out)
    }

    fn member(&self, m: &TSSignature) -> Res<Member> {
        Ok(match m {
            TSSignature::TSPropertySignature(p) => {
                if p.computed {
                    return unsupported("a computed property name");
                }
                let Some(name) = property_key_name(&p.key) else {
                    return unsupported("this property name");
                };
                let ty = match &p.type_annotation {
                    Some(t) => self.eval(&t.type_annotation)?,
                    None => Ty::any(),
                };
                Member {
                    name: key_text(&p.key, &name),
                    optional: p.optional,
                    readonly: p.readonly,
                    kind: MemberKind::Prop(if p.optional {
                        self.with_undefined(ty)
                    } else {
                        ty
                    }),
                }
            }
            TSSignature::TSMethodSignature(s) => {
                if s.computed
                    || s.type_parameters.is_some()
                    || s.this_param.is_some()
                    || !matches!(s.kind, oxc::ast::ast::TSMethodSignatureKind::Method)
                {
                    return unsupported("a generic, computed or accessor method signature");
                }
                let Some(name) = property_key_name(&s.key) else {
                    return unsupported("this property name");
                };
                let params = self.params(&s.params)?;
                let ret = match &s.return_type {
                    Some(t) => self.eval(&t.type_annotation)?,
                    None => Ty::any(),
                };
                Member {
                    name: key_text(&s.key, &name),
                    optional: s.optional,
                    readonly: false,
                    kind: MemberKind::Method(Sig { params, ret }),
                }
            }
            TSSignature::TSIndexSignature(i) => {
                let key = self.eval(&i.parameter.type_annotation.type_annotation)?;
                let value = self.eval(&i.type_annotation.type_annotation)?;
                Member {
                    name: String::new(),
                    optional: false,
                    readonly: i.readonly,
                    kind: MemberKind::Index {
                        param: i.parameter.name.to_string(),
                        key,
                        value,
                    },
                }
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
                Member {
                    name: String::new(),
                    optional: false,
                    readonly: false,
                    kind: MemberKind::Call(Sig { params, ret }),
                }
            }
            TSSignature::TSConstructSignatureDeclaration(_) => {
                return unsupported("a construct signature");
            }
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
                let TSTypeName::IdentifierReference(left) = &q.left else {
                    return unsupported("a qualified type name");
                };
                // `globalThis.Event` is the lib's `Event`.
                if left.name == "globalThis"
                    && self.resolving()
                    && self.local_def("globalThis").is_none()
                    && !self.locals.imports.contains_key("globalThis")
                {
                    return self.lib_type(q.right.name.as_str(), args);
                }
                // `Intl.DateTimeFormatOptions` is the lib's interface, printed without the qualifier.
                if left.name == "Intl"
                    && self.resolving()
                    && args.is_empty()
                    && INTL_INTERFACES.contains(&q.right.name.as_str())
                    && self.local_def("Intl").is_none()
                    && !self.locals.imports.contains_key("Intl")
                {
                    let id = self.reg.intern(&format!("lib Intl.{}<>", q.right.name));
                    self.reg.set_symbol(id, format!("lib Intl.{}", q.right.name));
                    return Ok(Ty::new(K::Ref {
                        name: q.right.name.to_string(),
                        args,
                        id,
                    }));
                }
                match self.local_def(left.name.as_str()) {
                    Some(Ok(TypeDef::UnionEnum(e))) => match e
                        .members
                        .iter()
                        .position(|(m, _)| m == q.right.name.as_str())
                    {
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
            return self.instantiate(&def?, self.file, args, false);
        }
        if self.locals.imports.contains_key(name) {
            if !self.resolving() {
                return Ok(Ty::new(K::Unresolved {
                    name: name.to_owned(),
                    args,
                }));
            }
            return match self.locals.imported_def(name) {
                Some(ExportedType { def, decl_file, .. }) => {
                    self.instantiate(&def?, &decl_file, args, true)
                }
                None => unsupported(format!("the imported type `{name}`")),
            };
        }
        if !self.resolving() {
            return Ok(Ty::new(K::Unresolved {
                name: name.to_owned(),
                args,
            }));
        }
        self.lib_type(name, args)
    }

    fn lib_type(&self, name: &str, mut args: Vec<Ty>) -> Res<Ty> {
        // A written `CustomEvent` is `CustomEvent<any>`: the checker fills in the default.
        if name == "CustomEvent" && args.is_empty() {
            args.push(Ty::any());
        }
        let key = format!(
            "{name}<{}>",
            args.iter().map(Ty::key).collect::<Vec<_>>().join(",")
        );
        if name == "Array" && args.len() == 1 {
            return Ok(self.array(args[0].clone()));
        }
        if LIB_INTERFACES.contains(&name) {
            let id = self.reg.intern(&format!("lib {key}"));
            self.reg.set_symbol(id, format!("lib {name}"));
            return Ok(Ty::new(K::Ref {
                name: name.to_owned(),
                args,
                id,
            }));
        }
        if LIB_ALIASES.contains(&name) && !args.is_empty() {
            let id = self.reg.intern(&format!("lib {key}"));
            self.reg.set_symbol(id, format!("lib {name}"));
            return Ok(Ty::new(K::Anon(Anon {
                id,
                shape: Shape::Opaque,
                alias: Some(Rc::new(Alias {
                    name: name.to_owned(),
                    args,
                    id,
                    declared: Vec::new(),
                })),
            })));
        }
        // `HTMLIonTabElement`: an element type the build generates into `src/components.d.ts`.
        if args.is_empty()
            && self
                .locals
                .resolver
                .is_some_and(|r| r.generated_element(self.file, name))
        {
            return Ok(Ty::new(K::Ref {
                name: name.to_owned(),
                args,
                id: self.reg.intern(&format!("generated {name}")),
            }));
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
    /// Reading a printed type: the names of the written object and function types, which the
    /// printed ones are replaced by (shape, names, met).
    reuse: Option<Vec<(String, Vec<String>, bool)>>,
    unaligned: bool,
}

impl<'a> Visit<'a> for RefNames {
    fn visit_ts_type_literal(&mut self, it: &oxc::ast::ast::TSTypeLiteral<'a>) {
        if !self.reused(shape_of_literal(it)) {
            oxc::ast_visit::walk::walk_ts_type_literal(self, it);
        }
    }

    fn visit_ts_function_type(&mut self, it: &oxc::ast::ast::TSFunctionType<'a>) {
        if !self.reused(shape_of_function(it)) {
            oxc::ast_visit::walk::walk_ts_function_type(self, it);
        }
    }

    fn visit_ts_type_reference(&mut self, it: &TSTypeReference<'a>) {
        let mut name = &it.type_name;
        while let TSTypeName::QualifiedName(q) = name {
            name = &q.left;
        }
        if let TSTypeName::IdentifierReference(id) = name {
            self.names.push(id.name.to_string());
        }
        // `getAllTypeReferences` also adds each type argument that is a plain reference at once,
        // before it walks the children (which meet them again).
        if let Some(args) = &it.type_arguments {
            for arg in &args.params {
                if let TSType::TSTypeReference(r) = arg
                    && let TSTypeName::IdentifierReference(id) = &r.type_name
                {
                    self.names.push(id.name.to_string());
                }
            }
        }
        oxc::ast_visit::walk::walk_ts_type_reference(self, it);
    }

    fn visit_ts_type_query(&mut self, it: &oxc::ast::ast::TSTypeQuery<'a>) {
        self.type_query = true;
        oxc::ast_visit::walk::walk_ts_type_query(self, it);
    }
}

impl RefNames {
    /// The names in the return type node `typeToTypeNode` builds for `method`: the printed
    /// type, except that an object or function type keeps the annotations it was written with
    /// (the node builder reuses them), so those are read from `written`.
    pub fn of_printed(text: &str, written: &TSType) -> Res<Self> {
        let mut found = ReuseTable::default();
        found.visit_ts_type(written);
        let allocator = oxc::allocator::Allocator::default();
        let source = format!("type T = {text};");
        let parsed = oxc::parser::Parser::new(&allocator, &source, oxc::span::SourceType::ts()).parse();
        let mut names = RefNames::default();
        match parsed.program.body.first() {
            Some(Statement::TSTypeAliasDeclaration(alias)) if parsed.diagnostics.is_empty() => {
                names.reuse = Some(found.table);
                names.visit_ts_type(&alias.type_annotation);
            }
            _ => return unsupported(format!("the printed return type `{text}`")),
        }
        // A printed object or function type that cannot be told from its written one.
        if names.unaligned {
            return unsupported("an object or function type in a return type");
        }
        names.reuse = None;
        Ok(names)
    }

    /// A printed object or function type with shape `sig`: it holds the names of the
    /// annotations it was written with.
    fn reused(&mut self, sig: Option<String>) -> bool {
        let Some(table) = &self.reuse else {
            return false;
        };
        // `{}` is what an array of an unknown type prints as: it names nothing.
        if sig.as_deref() == Some("{}") {
            return true;
        }
        // Written types of one shape that name the same things are not told apart, and need not be.
        let mut hits = table.iter().filter(|(s, _, _)| Some(s) == sig.as_ref());
        let first = hits.next();
        match first {
            Some((_, names, query)) if hits.all(|(_, n, q)| n == names && q == query) => {
                let (names, query) = (names.clone(), *query);
                self.names.extend(names);
                self.type_query |= query;
            }
            _ => self.unaligned = true,
        }
        true
    }
}

/// What identifies an object or function type across its written and printed forms: the kinds
/// and names of its members, or the names of its parameters. `None` when the checker could
/// order the members differently from the source.
fn shape_of_literal(it: &oxc::ast::ast::TSTypeLiteral) -> Option<String> {
    let mut keys = Vec::new();
    let mut rank = 0;
    for m in &it.members {
        // The checker lists call signatures, construct signatures, index signatures, then properties.
        let (r, key) = match m {
            TSSignature::TSCallSignatureDeclaration(c) if c.type_parameters.is_none() && c.this_param.is_none() => {
                (0, format!("({})", param_names(&c.params)?))
            }
            TSSignature::TSConstructSignatureDeclaration(_) => return None,
            TSSignature::TSIndexSignature(_) => (2, "[]".to_owned()),
            TSSignature::TSPropertySignature(p) if !p.computed => (3, property_key_name(&p.key)?),
            TSSignature::TSMethodSignature(p) if !p.computed && p.type_parameters.is_none() && p.this_param.is_none() => {
                (3, format!("{}({})", property_key_name(&p.key)?, param_names(&p.params)?))
            }
            _ => return None,
        };
        if r < rank {
            return None;
        }
        rank = r;
        keys.push(key);
    }
    Some(format!("{{{}}}", keys.join(";")))
}

fn param_names(params: &FormalParameters) -> Option<String> {
    let mut names = Vec::new();
    for p in &params.items {
        match &p.pattern {
            oxc::ast::ast::BindingPattern::BindingIdentifier(id) => names.push(id.name.to_string()),
            _ => return None,
        }
    }
    if let Some(rest) = &params.rest {
        match &rest.rest.argument {
            oxc::ast::ast::BindingPattern::BindingIdentifier(id) => names.push(format!("...{}", id.name)),
            _ => return None,
        }
    }
    Some(names.join(","))
}

fn shape_of_function(it: &oxc::ast::ast::TSFunctionType) -> Option<String> {
    if it.type_parameters.is_some() || it.this_param.is_some() {
        return None;
    }
    Some(format!("({})=>", param_names(&it.params)?))
}

/// The written object and function types of an annotation (the outermost ones): shape, the
/// names each holds, and whether it holds a `typeof`.
#[derive(Default)]
struct ReuseTable {
    table: Vec<(String, Vec<String>, bool)>,
}

impl ReuseTable {
    fn add(&mut self, sig: Option<String>, names: RefNames) {
        if let Some(sig) = sig {
            self.table.push((sig, names.names, names.type_query));
        }
    }
}

impl<'a> Visit<'a> for ReuseTable {
    fn visit_ts_type_literal(&mut self, it: &oxc::ast::ast::TSTypeLiteral<'a>) {
        let mut names = RefNames::default();
        // An index signature's type is built from the type, not reused.
        for m in &it.members {
            if !matches!(m, TSSignature::TSIndexSignature(_)) {
                names.visit_ts_signature(m);
            }
        }
        self.add(shape_of_literal(it), names);
    }

    fn visit_ts_function_type(&mut self, it: &oxc::ast::ast::TSFunctionType<'a>) {
        let mut names = RefNames::default();
        oxc::ast_visit::walk::walk_ts_function_type(&mut names, it);
        self.add(shape_of_function(it), names);
    }
}

/// Where a module's import and export statements put a type name: the part of
/// `getTypeReferenceLocation` that reads the source file.
#[derive(Default)]
pub struct FileInfo {
    stmts: Vec<StmtInfo>,
}

enum StmtInfo {
    Import {
        source: String,
        named: Vec<(String, String)>,
        default: Option<String>,
    },
    /// `export default Name;`
    ExportDefault(String),
    /// `export { local as exported };`
    ExportClause(Vec<(String, String)>),
    /// `export [default] interface | type | enum | class Name`
    Declaration { name: String, is_default: bool },
}

impl FileInfo {
    /// The module and exported name a named import `local` comes from.
    pub fn named_import(&self, local: &str) -> Option<(&String, &String)> {
        self.stmts.iter().find_map(|s| match s {
            StmtInfo::Import { source, named, .. } => named
                .iter()
                .find(|(l, _)| l == local)
                .map(|(_, imported)| (source, imported)),
            _ => None,
        })
    }

    pub fn collect(program: &Program) -> Self {
        use oxc::ast::ast::{
            Declaration, ExportDefaultDeclarationKind, ImportDeclarationSpecifier,
        };
        let mut stmts = Vec::new();
        for stmt in &program.body {
            match stmt {
                Statement::ImportDeclaration(import) => {
                    let mut named = Vec::new();
                    let mut default = None;
                    for spec in import.specifiers.iter().flatten() {
                        match spec {
                            ImportDeclarationSpecifier::ImportSpecifier(s) => named
                                .push((s.local.name.to_string(), s.imported.name().to_string())),
                            ImportDeclarationSpecifier::ImportDefaultSpecifier(s) => {
                                default = Some(s.local.name.to_string())
                            }
                            ImportDeclarationSpecifier::ImportNamespaceSpecifier(_) => {}
                        }
                    }
                    stmts.push(StmtInfo::Import {
                        source: import.source.value.to_string(),
                        named,
                        default,
                    });
                }
                Statement::ExportNamedDeclaration(e) => {
                    stmts.push(StmtInfo::ExportClause(
                        e.specifiers
                            .iter()
                            .map(|s| (s.local.name().to_string(), s.exported.name().to_string()))
                            .collect(),
                    ));
                }
                Statement::ExportDeclaration(e) => {
                    let name = match &e.declaration {
                        Declaration::TSInterfaceDeclaration(i) => Some(i.id.name.to_string()),
                        Declaration::TSTypeAliasDeclaration(t) => Some(t.id.name.to_string()),
                        Declaration::TSEnumDeclaration(en) => Some(en.id.name.to_string()),
                        Declaration::ClassDeclaration(c) => {
                            c.id.as_ref().map(|id| id.name.to_string())
                        }
                        _ => None,
                    };
                    if let Some(name) = name {
                        stmts.push(StmtInfo::Declaration {
                            name,
                            is_default: false,
                        });
                    }
                }
                Statement::ExportDefaultDeclaration(e) => match &e.declaration {
                    ExportDefaultDeclarationKind::ClassDeclaration(c) => {
                        if let Some(id) = &c.id {
                            stmts.push(StmtInfo::Declaration {
                                name: id.name.to_string(),
                                is_default: true,
                            });
                        }
                    }
                    ExportDefaultDeclarationKind::TSInterfaceDeclaration(i) => {
                        stmts.push(StmtInfo::Declaration {
                            name: i.id.name.to_string(),
                            is_default: true,
                        })
                    }
                    ExportDefaultDeclarationKind::Identifier(id) => {
                        stmts.push(StmtInfo::ExportDefault(id.name.to_string()))
                    }
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
    let cwd = std::env::current_dir()
        .map(|c| c.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();
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
    let target = if path.starts_with('/') {
        normalize(&path)
    } else {
        normalize(&format!("{cwd}/{path}"))
    };
    let base = normalize(&cwd);
    let common = target.iter().zip(&base).take_while(|(a, b)| a == b).count();
    let mut parts: Vec<String> = vec!["..".to_owned(); base.len() - common];
    parts.extend(target[common..].iter().cloned());
    parts.join("/")
}

/// `addToLibrary`'s id for a type declared in `file`.
fn type_id(file: &str, name: &str) -> String {
    let rel = relative_to_cwd(file);
    if rel.starts_with("node_modules") {
        format!("node_modules::{name}")
    } else {
        format!("{rel}::{name}")
    }
}

/// `getTypeReferenceLocation`.
pub fn locate(
    name: &str,
    file: &str,
    info: &FileInfo,
    resolver: Option<&Resolver>,
) -> Res<TypeReference> {
    // A named import whose module TypeScript finds.
    let import = info.stmts.iter().find_map(|s| match s {
        StmtInfo::Import { source, named, .. } => named
            .iter()
            .find(|(local, _)| local == name)
            .map(|(_, imported)| (source, imported)),
        _ => None,
    });
    if let (Some((source, imported)), Some(resolver)) = (import, resolver) {
        if !source.starts_with('.') {
            return unsupported(format!(
                "`{name}`, imported from the package or alias `{source}`"
            ));
        }
        if let Some(home) = resolver.module(file, source) {
            let Some(ty) = home.defs.get(imported) else {
                return unsupported(format!(
                    "`{name}`, which `{source}` does not export as a type"
                ));
            };
            let declared_in = if ty.class_or_enum {
                &ty.decl_file
            } else {
                &home.file
            };
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
        StmtInfo::ExportClause(specs) => {
            specs
                .iter()
                .find(|(local, _)| local == name)
                .map(|(_, exported)| {
                    if exported == "default" {
                        (true, None)
                    } else {
                        (false, (exported != name).then(|| exported.clone()))
                    }
                })
        }
        StmtInfo::Declaration {
            name: n,
            is_default,
        } if n == name => Some((*is_default, None)),
        _ => None,
    });
    if let Some((is_default, reference_location)) = local {
        return Ok(TypeReference {
            location: "local",
            path: Some(file.to_owned()),
            id: type_id(file, name),
            is_default,
            reference_location,
        });
    }

    // A default import.
    let default_import = info
        .stmts
        .iter()
        .any(|s| matches!(s, StmtInfo::Import { default: Some(d), .. } if d == name));
    if default_import && resolver.is_some() {
        return unsupported(format!("`{name}`, a default import"));
    }
    Ok(TypeReference {
        location: "global",
        path: None,
        id: format!("global::{name}"),
        is_default: false,
        reference_location: None,
    })
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
            return Ok(if inner.contains(" | ") {
                format!("({inner})[]")
            } else {
                format!("{inner}[]")
            });
        }
        let mut ty = self.eval(node)?;
        if optional {
            ty = self.with_undefined(ty);
        }
        if self.resolving() && order_depends_on_program(&ty) {
            return unsupported(
                "a union nested in a type, whose members the checker orders by when it first met them",
            );
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
pub fn member_type(
    env: &TypeEnv,
    site: &Site,
    annotation: Option<&TSType>,
    optional: bool,
    original: &str,
    visit: impl FnOnce(&mut RefNames),
) -> Res<(String, References)> {
    let Some(annotation) = annotation else {
        // Inferred from the initializer: only the types that print as one word are known.
        return match original {
            "string" | "number" | "boolean" | "any" | "bigint" | "symbol" | "unknown"
                if !optional =>
            {
                Ok((original.to_owned(), References::default()))
            }
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
            TSType::TSUnionType(u) => u
                .types
                .iter()
                .map(|m| self.node_text(m))
                .collect::<Res<Vec<_>>>()?
                .join(" | "),
            TSType::TSArrayType(a) => format!("{}[]", self.node_text(&a.element_type)?),
            TSType::TSTupleType(t) => {
                let mut parts = Vec::new();
                for e in &t.element_types {
                    let Some(inner) = e.as_ts_type() else {
                        return unsupported("an optional or rest tuple element");
                    };
                    parts.push(match inner {
                        TSType::TSNamedTupleMember(m) => {
                            let Some(el) = m.element_type.as_ts_type() else {
                                return unsupported("a rest tuple element");
                            };
                            format!(
                                "{}{}: {}",
                                m.label.name,
                                if m.optional { "?" } else { "" },
                                self.node_text(el)?
                            )
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
                format!(
                    "{} => {}",
                    self.params_text(&f.params)?,
                    self.node_text(&f.return_type.type_annotation)?
                )
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
                        TSTypeName::IdentifierReference(left) => {
                            format!("{}.{}", left.name, q.right.name)
                        }
                        _ => return unsupported("a qualified type name"),
                    },
                    TSTypeName::ThisExpression(_) => return unsupported("`this`"),
                };
                match &r.type_arguments {
                    Some(args) if !args.params.is_empty() => {
                        format!(
                            "{name}<{}>",
                            args.params
                                .iter()
                                .map(|a| self.node_text(a))
                                .collect::<Res<Vec<_>>>()?
                                .join(", ")
                        )
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
            let Some(name) = p.pattern.get_identifier_name() else {
                return unsupported("a destructured parameter");
            };
            let ty = match &p.type_annotation {
                Some(t) => self.node_text(&t.type_annotation)?,
                None => "any".into(),
            };
            parts.push(format!("{name}{}: {ty}", if p.optional { "?" } else { "" }));
        }
        if let Some(rest) = &fp.rest {
            let Some(name) = rest.rest.argument.get_identifier_name() else {
                return unsupported("a destructured rest parameter");
            };
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
                PropertyKey::NumericLiteral(n) => {
                    js_number(n.raw.as_ref().map(|r| r.as_str()).unwrap_or_default())
                        .map_or_else(|| unsupported("this property name"), Ok)
                }
                _ => unsupported("a computed property name"),
            }
        };
        let ret =
            |t: &Option<oxc::allocator::Box<oxc::ast::ast::TSTypeAnnotation>>| -> Res<String> {
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
                format!(
                    "{}{}{}: {ty};",
                    if p.readonly { "readonly " } else { "" },
                    key(&p.key)?,
                    if p.optional { "?" } else { "" }
                )
            }
            TSSignature::TSMethodSignature(s) => {
                if s.type_parameters.is_some()
                    || s.this_param.is_some()
                    || !matches!(s.kind, oxc::ast::ast::TSMethodSignatureKind::Method)
                {
                    return unsupported("a generic or accessor method signature");
                }
                format!(
                    "{}{}{}: {};",
                    key(&s.key)?,
                    if s.optional { "?" } else { "" },
                    self.params_text(&s.params)?,
                    ret(&s.return_type)?
                )
            }
            TSSignature::TSCallSignatureDeclaration(c) => {
                if c.type_parameters.is_some() || c.this_param.is_some() {
                    return unsupported("a generic call signature");
                }
                format!(
                    "{}: {};",
                    self.params_text(&c.params)?,
                    ret(&c.return_type)?
                )
            }
            TSSignature::TSIndexSignature(i) => format!(
                "{}[{}: {}]: {};",
                if i.readonly { "readonly " } else { "" },
                i.parameter.name,
                self.node_text(&i.parameter.type_annotation.type_annotation)?,
                self.node_text(&i.type_annotation.type_annotation)?
            ),
            TSSignature::TSConstructSignatureDeclaration(_) => {
                return unsupported("a construct signature");
            }
        })
    }
}

/// The type a function is declared to return, when that is a plain alias of string literals
/// (`(ref?: any): Mode`), evaluated in the scope of the module that wrote it.
pub fn alias_return(env: &TypeEnv, ret: &TSType) -> Option<Ty> {
    let TSType::TSTypeReference(r) = ret else {
        return None;
    };
    if r.type_arguments.is_some() || !matches!(r.type_name, TSTypeName::IdentifierReference(_)) {
        return None;
    }
    let ty = env.eval(ret).ok()?;
    match &*ty.0 {
        K::Union(members, _, _) if members.iter().all(|m| matches!(&*m.0, K::Str(..))) => Some(ty),
        _ => None,
    }
}

/// The return type the checker infers for a method from the expressions it returns, for the
/// shapes whose type is known from the syntax: a boolean, `this.field` of a primitive type,
/// `Promise.resolve(<primitive>)` and `new Promise<T>(...)`, in a method every path of which
/// ends in a `return` that agrees with the others. `names` gets the type names its type node
/// has. Anything else is left to Stencil's compiler.
fn inferred_return(env: &TypeEnv, func: &Function, names: &mut Vec<String>) -> Res<String> {
    let why = "a return type inferred from the body";
    if !env.resolving() || func.generator {
        return unsupported(why);
    }
    let Some(body) = &func.body else {
        return unsupported(why);
    };
    // A path that falls off the end returns `undefined` too: the last statement must return.
    let Some(Statement::ReturnStatement(last)) = body.statements.last() else {
        return unsupported(why);
    };
    if last.argument.is_none() {
        return unsupported(why);
    }
    struct Count(usize);
    impl<'a> Visit<'a> for Count {
        fn visit_return_statement(&mut self, _: &ReturnStatement<'a>) {
            self.0 += 1;
        }
        fn visit_function(&mut self, _: &Function<'a>, _: ScopeFlags) {}
        fn visit_arrow_function_expression(&mut self, _: &ArrowFunctionExpression<'a>) {}
        fn visit_class(&mut self, _: &Class<'a>) {}
    }
    let mut count = Count(0);
    count.visit_function_body(body);
    let total = count.0;
    let mut texts: Vec<(String, Vec<String>)> = Vec::new();
    let mut this_uses = ThisUses::default();
    this_uses.visit_function_body(body);
    let vars = locals_of_calls(env, func, body);
    let mut walker = ReturnTexts {
        env,
        total,
        this_uses: &this_uses,
        vars: &vars,
        texts: &mut texts,
        failed: None,
    };
    walker.visit_function_body(body);
    if let Some(e) = walker.failed {
        return Err(e);
    }
    let Some((first, first_names)) = combine_returns(&texts) else {
        return unsupported(why);
    };
    // `async` unwraps a returned promise and wraps the rest.
    let text = if first.starts_with("Promise<") {
        first
    } else if func.r#async {
        format!("Promise<{first}>")
    } else {
        return unsupported(why);
    };
    names.push("Promise".to_owned());
    names.extend(first_names);
    Ok(text)
}

/// How a function body uses `this`, nested functions included: how often each `this.name` is
/// mentioned, and whether `this` appears any other way (`this[x]`, `f(this)`, `{ x } = this`).
/// A `this.name` that is mentioned once has nothing that could narrow it where it is returned
/// (`if (!this.flag) throw ...; return this.flag` returns `true`, not the field's `boolean`).
#[derive(Default)]
struct ThisUses {
    members: rustc_hash::FxHashMap<String, usize>,
    other: bool,
}

impl<'a> Visit<'a> for ThisUses {
    fn visit_static_member_expression(&mut self, it: &StaticMemberExpression<'a>) {
        if matches!(it.object, Expression::ThisExpression(_)) {
            *self.members.entry(it.property.name.to_string()).or_default() += 1;
        } else {
            oxc::ast_visit::walk::walk_static_member_expression(self, it);
        }
    }
    fn visit_this_expression(&mut self, _: &ThisExpression) {
        self.other = true;
    }
}

/// The type of each `return <expr>` of a function (see `inferred_return`).
struct ReturnTexts<'t, 'e, 'a, 'b> {
    env: &'t TypeEnv<'e, 'a, 'b>,
    total: usize,
    this_uses: &'t ThisUses,
    vars: &'t FxHashMap<String, ReturnVar>,
    texts: &'t mut Vec<(String, Vec<String>)>,
    failed: Option<Unsupported>,
}

impl<'t, 'e, 'a, 'b, 'c> Visit<'c> for ReturnTexts<'t, 'e, 'a, 'b> {
    fn visit_return_statement(&mut self, it: &ReturnStatement<'c>) {
        if self.failed.is_some() {
            return;
        }
        let result = match &it.argument {
            Some(e) => self.expression(e),
            None => unsupported("a return type inferred from the body"),
        };
        match result {
            Ok(t) => self.texts.push(t),
            Err(e) => self.failed = Some(e),
        }
    }
    fn visit_function(&mut self, _: &Function<'c>, _: ScopeFlags) {}
    fn visit_arrow_function_expression(&mut self, _: &ArrowFunctionExpression<'c>) {}
    fn visit_class(&mut self, _: &Class<'c>) {}
}

impl ReturnTexts<'_, '_, '_, '_> {
    /// `x as T`: the type is `T`, whatever `x` is. Only a lone return of an array, a plain
    /// interface, a generated element type or a promise of one of those: a literal type, a
    /// union or `as const` take their own rules, and `x as unknown as T` is left alone.
    fn asserted(&self, inner: &Expression, ty: &TSType) -> Res<(String, Vec<String>)> {
        let why = || unsupported("a return type inferred from the body");
        let mut inner = inner;
        while let Expression::ParenthesizedExpression(p) = inner {
            inner = &p.expression;
        }
        if self.total != 1
            || matches!(
                inner,
                Expression::TSAsExpression(_)
                    | Expression::TSTypeAssertion(_)
                    | Expression::TSSatisfiesExpression(_)
                    | Expression::TSNonNullExpression(_)
            )
        {
            return why();
        }
        let ty_node = match ty {
            TSType::TSArrayType(_) | TSType::TSTypeReference(_) => ty,
            _ => return why(),
        };
        if matches!(ty_node, TSType::TSTypeReference(r) if matches!(&r.type_name,
            TSTypeName::IdentifierReference(i) if i.name == "const"))
        {
            return why();
        }
        let evaluated = self.env.eval(ty_node)?;
        let text = type_to_string(&evaluated)?;
        // `async` awaits what is returned (`x as Later` is a `Promise<number>` when `Later` has
        // a `then`, `x as Promise<Promise<T>>` a `Promise<T>`): `T` stays itself only where it
        // is known to have no `then`.
        let stays = match &*evaluated.0 {
            // `Promise<T>[]` is an array, but its text reads as a promise further on.
            K::Array(..) => !text.starts_with("Promise<"),
            K::Ref { name, args, .. } if name == "Promise" => {
                let locals = self.env.locals;
                args.len() == 1
                    && !locals.values.contains_key("Promise")
                    && !locals.types.contains_key("Promise")
                    && self.await_inert(&args[0], true)
            }
            _ => self.await_inert(&evaluated, false),
        };
        if !stays || print_order_depends_on_program(&evaluated) {
            return why();
        }
        let mut refs = RefNames::default();
        refs.visit_ts_type(ty_node);
        if refs.type_query {
            return why();
        }
        Ok((text, refs.names))
    }

    /// Whether awaiting a value of this type gives the type itself, because it has no `then`:
    /// known for an array, an element type the build generates and an interface with nothing but
    /// properties (none of them `then`), and for the primitives inside a `Promise<...>`.
    fn await_inert(&self, ty: &Ty, primitives: bool) -> bool {
        match &*ty.0 {
            K::Array(..) => true,
            K::Ref { name, args, id } => {
                let reg = self.env.reg;
                args.is_empty()
                    && (reg.interned_id(&format!("generated {name}")) == Some(*id)
                        || reg
                            .ref_props
                            .borrow()
                            .get(id)
                            .is_some_and(|props| props.iter().all(|p| p.name != "then")))
            }
            K::String | K::Number | K::BigInt | K::Boolean | K::Void | K::Undefined | K::Null => {
                primitives
            }
            _ => false,
        }
    }

    /// The widened type of an expression as the checker prints it, and the type names it has.
    fn expression(&self, e: &Expression) -> Res<(String, Vec<String>)> {
        let why = || unsupported("a return type inferred from the body");
        // Distinct literals of one kind keep their literal types (`1 | 2`), so a number or a
        // string is only known when it is the one thing returned.
        let primitive = |t: &str| -> Res<(String, Vec<String>)> {
            match t {
                "boolean" => Ok((t.to_owned(), vec![])),
                "number" | "string" if self.total == 1 => Ok((t.to_owned(), vec![])),
                _ => why(),
            }
        };
        match e {
            Expression::ParenthesizedExpression(p) => self.expression(&p.expression),
            // Kept apart from `boolean`: `string | true` is not `string | boolean`.
            Expression::BooleanLiteral(b) => Ok((b.value.to_string(), vec![])),
            Expression::NumericLiteral(_) => primitive("number"),
            Expression::StringLiteral(_) => primitive("string"),
            Expression::StaticMemberExpression(m)
                if matches!(m.object, Expression::ThisExpression(_)) =>
            {
                let class = self.env.locals.current_class.borrow().clone();
                let Some(ThisMember::Field {
                    annotation,
                    init,
                    readonly,
                    optional,
                }) = class
                    .as_deref()
                    .and_then(|c| self.env.locals.members.get(c))
                    .and_then(|members| members.get(m.property.name.as_str()))
                else {
                    return why();
                };
                // The field's declared type is what is returned only where nothing narrowed it,
                // and an optional field is `undefined` too.
                let narrowable = self.this_uses.other
                    || self.this_uses.members.get(m.property.name.as_str()) != Some(&1);
                if *optional || narrowable {
                    return why();
                }
                match (annotation, init) {
                    (Some(t), _) => primitive(&type_to_string(&self.env.eval(t)?)?),
                    // A `readonly` field keeps the literal type of its initializer.
                    (None, Some(init)) if !*readonly => match init {
                        Expression::NumericLiteral(_) => primitive("number"),
                        Expression::StringLiteral(_) => primitive("string"),
                        Expression::BooleanLiteral(_) => primitive("boolean"),
                        _ => why(),
                    },
                    _ => why(),
                }
            }
            Expression::Identifier(id) => match self.vars.get(id.name.as_str()) {
                Some(ReturnVar::Bool) => Ok(("boolean".to_owned(), vec![])),
                _ => why(),
            },
            Expression::StaticMemberExpression(m) => match (&m.object, &m.property) {
                (Expression::Identifier(id), p) => match self.vars.get(id.name.as_str()) {
                    Some(ReturnVar::Options(strings)) if strings.contains(p.name.as_str()) => {
                        Ok(("string".to_owned(), vec![]))
                    }
                    _ => why(),
                },
                _ => why(),
            },
            Expression::TSAsExpression(a) => self.asserted(&a.expression, &a.type_annotation),
            Expression::TSTypeAssertion(a) => self.asserted(&a.expression, &a.type_annotation),
            Expression::CallExpression(call) => {
                let is_resolve = matches!(&call.callee, Expression::StaticMemberExpression(m)
                    if m.property.name == "resolve"
                        && matches!(&m.object, Expression::Identifier(id) if id.name == "Promise")
                        && call.type_arguments.is_none());
                let promise_declared = self.env.locals.values.contains_key("Promise")
                    || self.env.locals.types.contains_key("Promise");
                if !is_resolve || promise_declared || call.arguments.len() != 1 {
                    return why();
                }
                let Some(arg) = call.arguments[0].as_expression() else {
                    return why();
                };
                let (inner, _) = self.expression(arg)?;
                let inner = match inner.as_str() {
                    "true" | "false" => "boolean".to_owned(),
                    _ => inner,
                };
                // `Promise.resolve(1)` is a `Promise<number>`, whatever the number.
                let inner = match (inner.as_str(), arg) {
                    ("number" | "string", _) if self.total != 1 => return why(),
                    _ => inner,
                };
                Ok((format!("Promise<{inner}>"), vec![]))
            }
            Expression::NewExpression(n) => {
                let promise_declared = self.env.locals.values.contains_key("Promise")
                    || self.env.locals.types.contains_key("Promise");
                let (Expression::Identifier(id), Some(args)) = (&n.callee, &n.type_arguments)
                else {
                    return why();
                };
                if id.name != "Promise" || promise_declared || args.params.len() != 1 {
                    return why();
                }
                let arg = &args.params[0];
                let ty = self.env.eval(arg)?;
                if print_order_depends_on_program(&ty) {
                    return why();
                }
                let mut refs = RefNames::default();
                refs.visit_ts_type(arg);
                if refs.type_query {
                    return why();
                }
                Ok((format!("Promise<{}>", type_to_string(&ty)?), refs.names))
            }
            _ => why(),
        }
    }
}

/// What a local that is returned, or read a property of at a `return`, is known to be there.
enum ReturnVar {
    /// `const r = await this.m()` where `m` is declared to return `Promise<boolean>`, and `r` is
    /// only ever tested with a plain `if (r) { ... }` that cannot jump: it is `boolean` again
    /// once the branches meet.
    Bool,
    /// `const r = await this.m()` where `m` is declared to return a promise of `true`, `false`
    /// and plain interfaces, and `r` is only narrowed by comparing it to a boolean or `typeof`:
    /// wherever `r.p` type-checks, `r` is the one member that has `p`. The properties that are
    /// plain `string`s there.
    Options(rustc_hash::FxHashSet<String>),
}

/// Combines the types of the returned expressions: they must all be the same, but for booleans
/// (`true`, `false` and `boolean` give `boolean`, a lone one of them too) and a `string` next to
/// a boolean that is not one literal alone (`string | true` keeps the literal).
fn combine_returns(texts: &[(String, Vec<String>)]) -> Option<(String, Vec<String>)> {
    let (first, names) = texts.first()?.clone();
    if texts.iter().all(|(t, _)| *t == first) && !matches!(first.as_str(), "true" | "false") {
        return Some((first, names));
    }
    let (mut has_true, mut has_false, mut has_bool, mut has_string) = (false, false, false, false);
    for (t, n) in texts {
        if !n.is_empty() {
            return None;
        }
        match t.as_str() {
            "true" => has_true = true,
            "false" => has_false = true,
            "boolean" => has_bool = true,
            "string" => has_string = true,
            _ => return None,
        }
    }
    let boolean = has_bool || has_true || has_false;
    if !has_string {
        return boolean.then(|| ("boolean".to_owned(), vec![]));
    }
    // `string | true` is a union of a string and a literal; `true | false` is `boolean`.
    (has_bool || (has_true && has_false)).then(|| ("string | boolean".to_owned(), vec![]))
}

/// The locals of a method body that are `const x = await this.m(...)`, and what each is known to
/// be at a `return` (see `ReturnVar`). A variable whose uses are not all understood is left out.
fn locals_of_calls(
    env: &TypeEnv,
    func: &Function,
    body: &oxc::ast::ast::FunctionBody,
) -> FxHashMap<String, ReturnVar> {
    let mut out = FxHashMap::default();
    let Some(class) = env.locals.current_class.borrow().clone() else {
        return out;
    };
    if env.locals.values.contains_key("Promise") || env.locals.types.contains_key("Promise") {
        return out;
    }
    for stmt in &body.statements {
        let Statement::VariableDeclaration(decl) = stmt else {
            continue;
        };
        if decl.kind != oxc::ast::ast::VariableDeclarationKind::Const {
            continue;
        }
        for d in &decl.declarations {
            let (Some(name), None, Some(Expression::AwaitExpression(aw))) =
                (d.id.get_identifier_name(), &d.type_annotation, &d.init)
            else {
                continue;
            };
            let Expression::CallExpression(call) = &aw.argument else {
                continue;
            };
            let Expression::StaticMemberExpression(callee) = &call.callee else {
                continue;
            };
            if !matches!(callee.object, Expression::ThisExpression(_))
                || call.type_arguments.is_some()
                || call.optional
                || callee.optional
            {
                continue;
            }
            let method = callee.property.name.as_str();
            if env
                .locals
                .ambiguous_methods
                .get(class.as_str())
                .is_some_and(|s| s.contains(method))
            {
                continue;
            }
            let Some(ThisMember::Method(Some(ret))) = env
                .locals
                .members
                .get(class.as_str())
                .and_then(|m| m.get(method))
            else {
                continue;
            };
            let TSType::TSTypeReference(r) = ret else {
                continue;
            };
            let (TSTypeName::IdentifierReference(id), Some(args)) = (&r.type_name, &r.type_arguments)
            else {
                continue;
            };
            if id.name != "Promise" || args.params.len() != 1 {
                continue;
            }
            let promised = &args.params[0];
            let kind = if matches!(promised, TSType::TSBooleanKeyword(_)) {
                ReturnVar::Bool
            } else if let Some(strings) = options_of(env, promised) {
                ReturnVar::Options(strings)
            } else {
                continue;
            };
            let boolean = matches!(kind, ReturnVar::Bool);
            if !uses_are_understood(env, &class, func, name.as_str(), boolean) {
                continue;
            }
            // A property read more than once may be narrowed where it is returned
            // (`if (r.p === '/home') return r.p` returns the literal): only one read once is known.
            let kind = match kind {
                ReturnVar::Options(mut strings) => {
                    let mut reads = PropReads {
                        var: name.as_str(),
                        counts: FxHashMap::default(),
                    };
                    reads.visit_function(func, ScopeFlags::Function);
                    strings.retain(|p| reads.counts.get(p.as_str()) == Some(&1));
                    ReturnVar::Options(strings)
                }
                kind => kind,
            };
            out.insert(name.to_string(), kind);
        }
    }
    out
}

/// How often each `var.p` is written in a function.
struct PropReads<'v> {
    var: &'v str,
    counts: FxHashMap<String, usize>,
}

impl<'c> Visit<'c> for PropReads<'_> {
    fn visit_static_member_expression(&mut self, it: &StaticMemberExpression<'c>) {
        if matches!(&it.object, Expression::Identifier(i) if i.name == self.var) {
            *self.counts.entry(it.property.name.to_string()).or_default() += 1;
        }
        oxc::ast_visit::walk::walk_static_member_expression(self, it);
    }
}

/// For a type that is a union of `true`, `false` and plain interfaces: the names of the
/// properties that exactly one interface has, non-optional and written `string`.
fn options_of(env: &TypeEnv, node: &TSType) -> Option<rustc_hash::FxHashSet<String>> {
    let ty = env.eval(node).ok()?;
    let K::Union(members, _, _) = &*ty.0 else {
        return None;
    };
    let mut interfaces: Vec<Rc<Vec<IfaceProp>>> = Vec::new();
    for m in members {
        match &*m.0 {
            K::True | K::False => {}
            K::Ref { id, .. } => interfaces.push(env.reg.ref_props.borrow().get(id)?.clone()),
            _ => return None,
        }
    }
    let mut out = rustc_hash::FxHashSet::default();
    for list in &interfaces {
        if list.iter().any(|p| p.name == "then") {
            return None;
        }
        for p in list.iter() {
            let owners = interfaces
                .iter()
                .filter(|l| l.iter().any(|q| q.name == p.name))
                .count();
            if owners == 1 && !p.optional && p.string_typed {
                out.insert(p.name.clone());
            }
        }
    }
    Some(out)
}

/// Whether `var` is bound once in `func` and every mention of it is one that cannot change the
/// type it has where it is returned (`boolean`: `if (var)` with nothing that can jump, and
/// `return var`) or read a property of (otherwise: `var.p`, `var === true`, `typeof var === 's'`).
fn uses_are_understood(env: &TypeEnv, class: &str, func: &Function, var: &str, boolean: bool) -> bool {
    struct Uses<'e, 'a, 'b, 'v> {
        env: &'e TypeEnv<'e, 'a, 'b>,
        class: &'v str,
        var: &'v str,
        boolean: bool,
        bindings: usize,
        mentions: usize,
        understood: usize,
    }
    /// A statement that cannot leave the enclosing flow early (`return`, `throw`, `break`,
    /// `continue`), nor call something that might never return: a call is understood when it
    /// is `this.m()` of a method that is not declared to return `never` or a type predicate.
    struct Jumps<'e, 'a, 'b, 'v> {
        env: &'e TypeEnv<'e, 'a, 'b>,
        class: &'v str,
        found: bool,
    }
    impl<'c> Visit<'c> for Jumps<'_, '_, '_, '_> {
        fn visit_return_statement(&mut self, _: &ReturnStatement<'c>) {
            self.found = true;
        }
        fn visit_throw_statement(&mut self, _: &oxc::ast::ast::ThrowStatement<'c>) {
            self.found = true;
        }
        fn visit_break_statement(&mut self, _: &oxc::ast::ast::BreakStatement<'c>) {
            self.found = true;
        }
        fn visit_continue_statement(&mut self, _: &oxc::ast::ast::ContinueStatement<'c>) {
            self.found = true;
        }
        fn visit_labeled_statement(&mut self, _: &oxc::ast::ast::LabeledStatement<'c>) {
            self.found = true;
        }
        fn visit_call_expression(&mut self, it: &oxc::ast::ast::CallExpression<'c>) {
            let plain = match &it.callee {
                Expression::StaticMemberExpression(m)
                    if matches!(m.object, Expression::ThisExpression(_)) =>
                {
                    match self
                        .env
                        .locals
                        .members
                        .get(self.class)
                        .and_then(|c| c.get(m.property.name.as_str()))
                    {
                        Some(ThisMember::Method(None)) => true,
                        Some(ThisMember::Method(Some(t))) => matches!(
                            t,
                            TSType::TSVoidKeyword(_)
                                | TSType::TSBooleanKeyword(_)
                                | TSType::TSStringKeyword(_)
                                | TSType::TSNumberKeyword(_)
                        ),
                        _ => false,
                    }
                }
                _ => false,
            };
            if !plain {
                self.found = true;
            }
            oxc::ast_visit::walk::walk_call_expression(self, it);
        }
    }
    impl Uses<'_, '_, '_, '_> {
        fn jump_free(&self, s: &Statement) -> bool {
            let mut v = Jumps {
                env: self.env,
                class: self.class,
                found: false,
            };
            v.visit_statement(s);
            !v.found
        }
    }
    impl<'c> Visit<'c> for Uses<'_, '_, '_, '_> {
        fn visit_binding_identifier(&mut self, it: &oxc::ast::ast::BindingIdentifier<'c>) {
            if it.name == self.var {
                self.bindings += 1;
            }
        }
        fn visit_identifier_reference(&mut self, it: &oxc::ast::ast::IdentifierReference<'c>) {
            if it.name == self.var {
                self.mentions += 1;
            }
        }
        fn visit_if_statement(&mut self, it: &oxc::ast::ast::IfStatement<'c>) {
            if self.boolean
                && matches!(&it.test, Expression::Identifier(i) if i.name == self.var)
                && self.jump_free(&it.consequent)
                && it.alternate.as_ref().is_none_or(|a| self.jump_free(a))
            {
                self.understood += 1;
            }
            oxc::ast_visit::walk::walk_if_statement(self, it);
        }
        fn visit_return_statement(&mut self, it: &ReturnStatement<'c>) {
            if self.boolean
                && matches!(&it.argument, Some(Expression::Identifier(i)) if i.name == self.var)
            {
                self.understood += 1;
            }
            oxc::ast_visit::walk::walk_return_statement(self, it);
        }
        fn visit_static_member_expression(&mut self, it: &StaticMemberExpression<'c>) {
            if !self.boolean && matches!(&it.object, Expression::Identifier(i) if i.name == self.var) {
                self.understood += 1;
            }
            oxc::ast_visit::walk::walk_static_member_expression(self, it);
        }
        fn visit_binary_expression(&mut self, it: &oxc::ast::ast::BinaryExpression<'c>) {
            use oxc::ast::ast::BinaryOperator as B;
            if !self.boolean
                && matches!(
                    it.operator,
                    B::StrictEquality | B::StrictInequality | B::Equality | B::Inequality
                )
            {
                let var = self.var;
                let is_var = |e: &Expression| matches!(e, Expression::Identifier(i) if i.name == var);
                let is_typeof = |e: &Expression| {
                    matches!(e, Expression::UnaryExpression(u)
                        if matches!(u.operator, UnaryOperator::Typeof) && is_var(&u.argument))
                };
                let boolean = |e: &Expression| matches!(e, Expression::BooleanLiteral(_));
                let string = |e: &Expression| matches!(e, Expression::StringLiteral(_));
                if (is_var(&it.left) && boolean(&it.right))
                    || (is_var(&it.right) && boolean(&it.left))
                    || (is_typeof(&it.left) && string(&it.right))
                    || (is_typeof(&it.right) && string(&it.left))
                {
                    self.understood += 1;
                }
            }
            oxc::ast_visit::walk::walk_binary_expression(self, it);
        }
    }
    let mut uses = Uses {
        env,
        class,
        var,
        boolean,
        bindings: 0,
        mentions: 0,
        understood: 0,
    };
    uses.visit_function(func, ScopeFlags::Function);
    uses.bindings == 1 && uses.mentions == uses.understood
}

/// A `@Method()`'s `complexType` (`parseMethodDecorator`).
pub fn method_type(
    env: &TypeEnv,
    site: &Site,
    m: &MethodDefinition,
    docs: &[Vec<JsDoc>],
) -> Res<MethodComplexType> {
    let func = &m.value;
    if func.this_param.is_some() {
        return unsupported("a method with a `this` parameter");
    }
    let Some(type_params) = &func.type_parameters else {
        return method_type_in_scope(env, site, m, docs, "");
    };

    // The method's type parameters are in scope for its signature, and printed in front of it.
    let depth = env.params.borrow().len();
    for p in &type_params.params {
        if p.r#const || p.r#in || p.out {
            env.params.borrow_mut().truncate(depth);
            return unsupported("a type parameter with a modifier");
        }
        let ty = Ty::new(K::TypeParam(p.name.name.to_string(), env.reg.fresh()));
        env.params.borrow_mut().push((p.name.name.to_string(), ty));
    }
    let result = (|| {
        let mut texts = Vec::new();
        for p in &type_params.params {
            let mut text = p.name.name.to_string();
            for (keyword, ty) in [(" extends ", &p.constraint), (" = ", &p.default)] {
                let Some(ty) = ty else { continue };
                // The checker reuses the type node a bound or default was written with.
                let written = env.node_text(ty)?;
                text.push_str(keyword);
                text.push_str(&written);
            }
            texts.push(text);
        }
        method_type_in_scope(env, site, m, docs, &format!("<{}>", texts.join(", ")))
    })();
    env.params.borrow_mut().truncate(depth);
    result
}

/// Whether a type is `void` or a union that has `void` but not `undefined`.
fn void_without_undefined(ty: &Ty) -> bool {
    match &*ty.0 {
        K::Void => true,
        K::Union(ms, _, _) => {
            ms.iter().any(|m| matches!(&*m.0, K::Void))
                && !ms.iter().any(|m| matches!(&*m.0, K::Undefined))
        }
        _ => false,
    }
}

fn method_type_in_scope(
    env: &TypeEnv,
    site: &Site,
    m: &MethodDefinition,
    docs: &[Vec<JsDoc>],
    type_params: &str,
) -> Res<MethodComplexType> {
    let func = &m.value;
    let check = |ty: &Ty| -> Res<String> {
        if env.resolving() && print_order_depends_on_program(ty) {
            return unsupported(
                "a union whose members the checker orders by when it first met them",
            );
        }
        type_to_string(ty)
    };

    let mut parameters = Vec::new();
    let mut shown = Vec::new();
    for p in &func.params.items {
        let Some(name) = p.pattern.get_identifier_name() else {
            return unsupported("a destructured parameter");
        };
        let (ty, text) = match (&p.type_annotation, &p.initializer) {
            (Some(t), _) => (
                env.eval(&t.type_annotation)?,
                env.node_text(&t.type_annotation)?,
            ),
            (None, None) => (Ty::any(), "any".to_owned()),
            // The type of the initializer, widened.
            (None, Some(init)) => match &**init {
                Expression::StringLiteral(_) => (Ty::new(K::String), "string".to_owned()),
                Expression::NumericLiteral(_) => (Ty::new(K::Number), "number".to_owned()),
                Expression::BooleanLiteral(_) => (boolean(), "boolean".to_owned()),
                _ => return unsupported("a parameter typed by its default value"),
            },
        };
        // The checker prints an optional parameter's written type node as it is, unless the type
        // is `void` or a union with `void` and no `undefined`: the `undefined` the parameter adds
        // does not strip back off (`void` has the facts of `undefined`), so the type is printed
        // with it (`y?: string | void | undefined`, `y?: V | undefined`).
        let adds_to_void = p.optional && env.strict && void_without_undefined(&ty);
        let ty = if p.optional {
            env.with_undefined(ty)
        } else {
            ty
        };
        let type_text = check(&ty)?;
        let text = if adds_to_void { type_text.clone() } else { text };
        parameters.push(MethodParameter {
            name: name.to_string(),
            type_text,
            docs: param_docs(docs, name.as_str()),
        });
        shown.push(format!(
            "{name}{}: {text}",
            if p.optional || p.initializer.is_some() {
                "?"
            } else {
                ""
            }
        ));
    }
    if let Some(rest) = &func.params.rest {
        let Some(name) = rest.rest.argument.get_identifier_name() else {
            return unsupported("a destructured rest parameter");
        };
        let (ty, text) = match &rest.type_annotation {
            Some(t) => (
                env.eval(&t.type_annotation)?,
                env.node_text(&t.type_annotation)?,
            ),
            None => (env.array(Ty::any()), "any[]".to_owned()),
        };
        parameters.push(MethodParameter {
            name: name.to_string(),
            type_text: check(&ty)?,
            docs: param_docs(docs, name.as_str()),
        });
        shown.push(format!("...{name}: {text}"));
    }

    let mut inferred_names = Vec::new();
    let (mut returned, shown_return) = match &func.return_type {
        Some(t) => (
            check(&env.eval(&t.type_annotation)?)?,
            env.node_text(&t.type_annotation)?,
        ),
        None if returns_value(func) => {
            let text = inferred_return(env, func, &mut inferred_names)?;
            (text.clone(), text)
        }
        // `async` without a return type: `any` where `Promise` is missing (the single-file program).
        None if func.r#async && !env.resolving() => ("any".to_owned(), "any".to_owned()),
        None if func.r#async => ("Promise<void>".to_owned(), "Promise<void>".to_owned()),
        None => ("void".to_owned(), "void".to_owned()),
    };
    let printed_return = returned.clone();
    // A method that returns nothing is made to return a promise (with a warning).
    let was_void = returned == "void";
    if was_void {
        returned = "Promise<void>".to_owned();
    }

    // Stencil reads the references of the return type node it builds from the type (what is
    // printed, not what was written) before those of the whole method.
    let mut names = RefNames::default();
    if func.return_type.is_some() {
        names = RefNames::of_printed(&printed_return, &func.return_type.as_ref().unwrap().type_annotation)?;
    } else if !inferred_names.is_empty() {
        // The inferred return type is a type node of its own, built from the type.
        names.names.append(&mut inferred_names);
    } else if func.r#async && env.resolving() {
        // The inferred `Promise<void>` is a type node of its own: it names `Promise`.
        names.names.push("Promise".to_owned());
    }
    names.visit_method_definition(m);
    let mut signature = format!("{type_params}({}) => {shown_return}", shown.join(", "));
    if was_void && signature.ends_with("=> void") {
        signature.truncate(signature.len() - "void".len());
        signature.push_str("Promise<void>");
    }
    Ok(MethodComplexType {
        signature,
        parameters,
        references: references(names, site)?,
        return_type: returned,
    })
}

/// A property key as the checker prints it: a quoted name keeps the quote its declaration used.
fn key_text(key: &oxc::ast::ast::PropertyKey, name: &str) -> String {
    let text = property_name(name);
    if let oxc::ast::ast::PropertyKey::StringLiteral(lit) = key {
        if text.starts_with('"') && lit.raw.as_ref().is_some_and(|r| r.starts_with('\'')) {
            return format!(
                "'{}'",
                text[1..text.len() - 1]
                    .replace("\\\"", "\"")
                    .replace('\'', "\\'")
            );
        }
    }
    text
}
