//! Syntactic port of Stencil's `propTypeFromTSType`
//! (`decorators-to-static/prop-decorator.ts:275-376`).
//!
//! Stencil asks the TypeChecker for the prop's type and checks its flags: a union counts as
//! string / number / boolean when any member does, more than one of those is `any`, and none
//! of them is `unknown`. Here the same rules run over the written annotation, or over the
//! initializer the way TypeScript would infer it.
//!
//! Two modes, chosen by whether `Locals` has a resolver:
//! - single-file (Stencil's `transpileSync`): only same-file names resolve; imports and globals
//!   such as `Date` are unresolved, which TypeScript types as `any`.
//! - build-accurate (`stencil build`): relative imports are followed, and lib types (`Date`,
//!   `Record<…>`, `HTMLElement`, …) are object types, so `unknown`.

use oxc::ast::ast::{
    Expression, ObjectPropertyKind, PropertyKey, TSEnumDeclaration, TSLiteral,
    TSSignature, TSType, TSTypeName, TSTypeOperatorOperator, TSTypeQueryExprName, TSTypeReference,
    UnaryOperator,
};
use oxc::span::GetSpan;

use crate::locals::{LocalType, LocalValue, Locals};
use crate::meta::PropType;

#[derive(Debug, Default, Clone, Copy)]
pub struct Flags {
    any: bool,
    string: bool,
    number: bool,
    boolean: bool,
}

impl Flags {
    const ANY: Flags = Flags { any: true, string: false, number: false, boolean: false };
    const STRING: Flags = Flags { any: false, string: true, number: false, boolean: false };
    const NUMBER: Flags = Flags { any: false, string: false, number: true, boolean: false };
    const BOOLEAN: Flags = Flags { any: false, string: false, number: false, boolean: true };
    const NONE: Flags = Flags { any: false, string: false, number: false, boolean: false };

    fn merge(&mut self, other: Flags) {
        self.any |= other.any;
        self.string |= other.string;
        self.number |= other.number;
        self.boolean |= other.boolean;
    }

    pub fn into_prop_type(self) -> PropType {
        if self.any {
            return PropType::Any;
        }
        match (self.string, self.number, self.boolean) {
            (true, false, false) => PropType::String,
            (false, true, false) => PropType::Number,
            (false, false, true) => PropType::Boolean,
            (false, false, false) => PropType::Unknown,
            _ => PropType::Any,
        }
    }

    fn from_prop_type(t: PropType) -> Flags {
        match t {
            PropType::Any => Flags::ANY,
            PropType::String => Flags::STRING,
            PropType::Number => Flags::NUMBER,
            PropType::Boolean => Flags::BOOLEAN,
            PropType::Unknown => Flags::NONE,
        }
    }
}

const MAX_DEPTH: u8 = 16;

/// Classify a prop from its written type annotation.
pub fn classify_annotation(ty: &TSType, locals: &Locals) -> PropType {
    flags_of(ty, locals, 0).into_prop_type()
}

/// A prop with no annotation: its widened initializer type, and how `typeToString` prints it
/// (`complexType.original`).
pub fn classify_initializer(init: Option<&Expression>, locals: &Locals, source: &str) -> (PropType, String) {
    match init {
        // No annotation and no initializer is an implicit `any`.
        None => (PropType::Any, "any".into()),
        Some(e) => infer(e, locals, source, 0),
    }
}

/// The widened type of an expression, and how it prints.
pub fn infer_expression(e: &Expression, locals: &Locals, source: &str) -> (PropType, String) {
    infer(e, locals, source, 0)
}

/// Flags of a type name as it resolves from this module (alias, enum, interface, import, lib).
pub fn name_flags(name: &str, locals: &Locals) -> Flags {
    identifier_flags(name, None, locals, 0)
}

/// Flags of `keyof <name>`.
pub fn keyof_name_flags(name: &str, locals: &Locals) -> Flags {
    keyof_identifier(name, locals, 0)
}

fn named(t: PropType) -> (PropType, String) {
    let name = match t {
        PropType::Any => "any",
        PropType::Boolean => "boolean",
        PropType::Number => "number",
        PropType::String => "string",
        PropType::Unknown => "unknown",
    };
    (t, name.into())
}

fn infer(expr: &Expression, locals: &Locals, source: &str, depth: u8) -> (PropType, String) {
    if depth > MAX_DEPTH {
        return named(PropType::Any);
    }
    match expr {
        Expression::StringLiteral(_) | Expression::TemplateLiteral(_) => named(PropType::String),
        Expression::NumericLiteral(_) => named(PropType::Number),
        Expression::UnaryExpression(u) => match u.operator {
            UnaryOperator::UnaryNegation | UnaryOperator::UnaryPlus | UnaryOperator::BitwiseNot => named(PropType::Number),
            UnaryOperator::LogicalNot => named(PropType::Boolean),
            UnaryOperator::Typeof => named(PropType::String),
            _ => named(PropType::Any),
        },
        Expression::BooleanLiteral(_) => named(PropType::Boolean),
        Expression::NullLiteral(_) => (PropType::Unknown, "null".into()),
        // Single-file: without the lib, `Array` is missing and an array literal prints as `{}`.
        Expression::ArrayExpression(_) if !locals.resolving() => (PropType::Unknown, "{}".into()),
        Expression::ArrayExpression(_) => (PropType::Unknown, "any[]".into()),
        Expression::ObjectExpression(obj) => (PropType::Unknown, print_object_literal(obj, locals, source, depth)),
        Expression::ParenthesizedExpression(p) => infer(&p.expression, locals, source, depth + 1),
        Expression::TSNonNullExpression(e) => infer(&e.expression, locals, source, depth + 1),
        Expression::TSSatisfiesExpression(e) => infer(&e.expression, locals, source, depth + 1),
        Expression::TSAsExpression(e) => asserted(&e.type_annotation, &e.expression, locals, source, depth),
        Expression::TSTypeAssertion(e) => asserted(&e.type_annotation, &e.expression, locals, source, depth),
        Expression::Identifier(id) => match locals.values.get(id.name.as_str()) {
            Some(LocalValue::Const(init)) | Some(LocalValue::Let(Some(init))) => infer(init, locals, source, depth + 1),
            Some(LocalValue::Object | LocalValue::Function(_)) => named(PropType::Unknown),
            Some(LocalValue::Let(None)) => named(PropType::Any),
            None => match locals.imported_value(id.name.as_str()) {
                Some(v) if v.prop_type.is_some() => (v.prop_type.unwrap(), v.original),
                // Unresolved names, imports and `undefined` (widened to `any`).
                _ => named(PropType::Any),
            },
        },
        Expression::StaticMemberExpression(m) => match &m.object {
            Expression::Identifier(obj) => match member_value(obj.name.as_str(), m.property.name.as_str(), locals, source, depth) {
                Some(v) => v,
                None => named(PropType::Any),
            },
            _ => named(PropType::Any),
        },
        Expression::CallExpression(call) => match &call.callee {
            Expression::Identifier(f) => match locals.values.get(f.name.as_str()) {
                Some(LocalValue::Function(Some(ret))) => (classify_annotation(ret, locals), ret.span().source_text(source).to_owned()),
                Some(_) => named(PropType::Any),
                None => match locals.imported_value(f.name.as_str()).and_then(|v| v.returns) {
                    Some(r) => r,
                    None => named(PropType::Any),
                },
            },
            _ => named(PropType::Any),
        },
        // Build-accurate: `new X()` is an object.
        Expression::NewExpression(_) if locals.resolving() => named(PropType::Unknown),
        // Everything else depends on types the single-file program cannot see.
        _ => named(PropType::Any),
    }
}

/// `OBJ.member` for a same-file `const OBJ = { … }` or an imported one.
fn member_value(obj: &str, member: &str, locals: &Locals, source: &str, depth: u8) -> Option<(PropType, String)> {
    if let Some(init) = locals.const_init(obj) {
        let (as_const, inner) = strip_as_const(init);
        let Expression::ObjectExpression(o) = inner else { return None };
        let value = o.properties.iter().rev().find_map(|p| match p {
            ObjectPropertyKind::ObjectProperty(p) if crate::eval::property_key_name(&p.key).as_deref() == Some(member) => Some(&p.value),
            _ => None,
        })?;
        let (t, printed) = infer(value, locals, source, depth + 1);
        let printed = if as_const && is_literal(value) { value.span().source_text(source).to_owned() } else { printed };
        return Some((t, printed));
    }
    let v = locals.imported_value(obj)?.members.get(member)?.clone();
    Some((v.prop_type?, v.original))
}

fn strip_as_const<'x, 'a>(e: &'x Expression<'a>) -> (bool, &'x Expression<'a>) {
    match e {
        Expression::TSAsExpression(a) => {
            let c = matches!(&a.type_annotation, TSType::TSTypeReference(r) if matches!(&r.type_name, TSTypeName::IdentifierReference(id) if id.name == "const"));
            let (c2, inner) = strip_as_const(&a.expression);
            (c || c2, inner)
        }
        Expression::TSSatisfiesExpression(s) => strip_as_const(&s.expression),
        Expression::ParenthesizedExpression(p) => strip_as_const(&p.expression),
        other => (false, other),
    }
}

fn is_literal(e: &Expression) -> bool {
    matches!(e, Expression::StringLiteral(_) | Expression::NumericLiteral(_) | Expression::BooleanLiteral(_))
        || matches!(e, Expression::UnaryExpression(u) if matches!(u.argument, Expression::NumericLiteral(_)))
}

fn asserted(ty: &TSType, expr: &Expression, locals: &Locals, source: &str, depth: u8) -> (PropType, String) {
    if matches!(ty, TSType::TSTypeReference(r) if matches!(&r.type_name, TSTypeName::IdentifierReference(id) if id.name == "const")) {
        return if locals.resolving() { infer(expr, locals, source, depth + 1) } else { named(PropType::Any) };
    }
    (classify_annotation(ty, locals), ty.span().source_text(source).to_owned())
}

/// How TypeScript prints the widened type of an object literal: `{ a: number; b: string; }`.
fn print_object_literal(obj: &oxc::ast::ast::ObjectExpression, locals: &Locals, source: &str, depth: u8) -> String {
    if obj.properties.is_empty() {
        return "{}".into();
    }
    let mut parts = Vec::new();
    for prop in &obj.properties {
        let ObjectPropertyKind::ObjectProperty(p) = prop else { return obj.span.source_text(source).to_owned() };
        let Some(key) = crate::eval::property_key_name(&p.key) else { return obj.span.source_text(source).to_owned() };
        let (_, ty) = infer(&p.value, locals, source, depth + 1);
        parts.push(format!("{key}: {ty};"));
    }
    format!("{{ {} }}", parts.join(" "))
}

fn flags_of(ty: &TSType, locals: &Locals, depth: u8) -> Flags {
    if depth > MAX_DEPTH {
        return Flags::ANY;
    }
    match ty {
        TSType::TSAnyKeyword(_) => Flags::ANY,
        TSType::TSStringKeyword(_) | TSType::TSTemplateLiteralType(_) => Flags::STRING,
        TSType::TSNumberKeyword(_) => Flags::NUMBER,
        TSType::TSBooleanKeyword(_) => Flags::BOOLEAN,
        TSType::TSLiteralType(lit) => match &lit.literal {
            TSLiteral::StringLiteral(_) | TSLiteral::TemplateLiteral(_) => Flags::STRING,
            TSLiteral::NumericLiteral(_) => Flags::NUMBER,
            TSLiteral::UnaryExpression(u) if matches!(u.argument, Expression::NumericLiteral(_)) => Flags::NUMBER,
            TSLiteral::BooleanLiteral(_) => Flags::BOOLEAN,
            _ => Flags::NONE,
        },
        TSType::TSUnionType(union) => {
            let mut f = Flags::NONE;
            for member in &union.types {
                f.merge(flags_of(member, locals, depth + 1));
            }
            f
        }
        TSType::TSParenthesizedType(p) => flags_of(&p.type_annotation, locals, depth + 1),
        TSType::TSTypeReference(r) => reference_flags(r, locals, depth),
        TSType::TSTypeOperatorType(op) => match op.operator {
            TSTypeOperatorOperator::Keyof => keyof_flags(&op.type_annotation, locals, depth),
            _ => Flags::NONE,
        },
        TSType::TSTypeQuery(q) => match &q.expr_name {
            TSTypeQueryExprName::IdentifierReference(id) => match id.name.as_str() {
                "globalThis" => Flags::NONE,
                name => match locals.values.get(name) {
                    Some(LocalValue::Const(init)) | Some(LocalValue::Let(Some(init))) => Flags::from_prop_type(infer(init, locals, "", depth + 1).0),
                    Some(LocalValue::Object | LocalValue::Function(_)) => Flags::NONE,
                    _ => match locals.imported_value(name).and_then(|v| v.prop_type) {
                        Some(t) => Flags::from_prop_type(t),
                        None => Flags::ANY,
                    },
                },
            },
            _ => Flags::ANY,
        },
        // Types the checker could only answer with full resolution: in the single-file
        // program they come out as `any`.
        TSType::TSIndexedAccessType(_)
        | TSType::TSConditionalType(_)
        | TSType::TSImportType(_)
        | TSType::TSMappedType(_)
        | TSType::TSInferType(_) => {
            if locals.resolving() {
                Flags::NONE
            } else {
                Flags::ANY
            }
        }
        // Object-like or non-primitive types (arrays, tuples, functions, literals,
        // intersections, null, undefined, void, never, unknown, symbol, bigint, object).
        _ => Flags::NONE,
    }
}

/// `keyof T`: the kinds of T's member names. Unresolved `T` is `any`, and `keyof any` is
/// `string | number | symbol`, which is `any` again.
fn keyof_flags(ty: &TSType, locals: &Locals, depth: u8) -> Flags {
    match ty {
        TSType::TSTypeLiteral(lit) => signature_flags(&lit.members),
        TSType::TSTypeReference(r) => match &r.type_name {
            TSTypeName::IdentifierReference(id) => keyof_identifier(id.name.as_str(), locals, depth),
            _ => Flags::ANY,
        },
        // `keyof typeof OBJ` for a `const OBJ = { … }`: its keys.
        TSType::TSTypeQuery(q) => match &q.expr_name {
            TSTypeQueryExprName::IdentifierReference(id) => match locals.const_init(id.name.as_str()) {
                Some(init) => match strip_as_const(init).1 {
                    Expression::ObjectExpression(obj) => {
                        let mut f = Flags::NONE;
                        for p in &obj.properties {
                            match p {
                                ObjectPropertyKind::ObjectProperty(p) => match &p.key {
                                    PropertyKey::NumericLiteral(_) => f.number = true,
                                    PropertyKey::StaticIdentifier(_) | PropertyKey::StringLiteral(_) => f.string = true,
                                    _ => f.any = true,
                                },
                                ObjectPropertyKind::SpreadProperty(_) => f.any = true,
                            }
                        }
                        f
                    }
                    _ => Flags::ANY,
                },
                None => match locals.imported_value(id.name.as_str()) {
                    Some(v) if !v.members.is_empty() => Flags::STRING,
                    _ => Flags::ANY,
                },
            },
            _ => Flags::ANY,
        },
        _ => Flags::ANY,
    }
}

fn keyof_identifier(name: &str, locals: &Locals, depth: u8) -> Flags {
    if depth > MAX_DEPTH {
        return Flags::ANY;
    }
    match locals.types.get(name) {
        Some(LocalType::Interface(members)) => signature_flags(members),
        Some(LocalType::Class(members)) => {
            if members.is_empty() {
                Flags::NONE
            } else {
                Flags::STRING
            }
        }
        Some(LocalType::Alias(inner)) => keyof_flags(inner, locals, depth + 1),
        Some(LocalType::Enum(_)) => Flags::NONE,
        None => match locals.imported_type(name) {
            Some(t) => t.keyof,
            None => Flags::ANY,
        },
    }
}

fn signature_flags(members: &[TSSignature]) -> Flags {
    let mut f = Flags::NONE;
    for m in members {
        let key = match m {
            TSSignature::TSPropertySignature(p) => Some(&p.key),
            TSSignature::TSMethodSignature(p) => Some(&p.key),
            _ => None,
        };
        match key {
            Some(PropertyKey::NumericLiteral(_)) => f.number = true,
            Some(PropertyKey::StaticIdentifier(_) | PropertyKey::StringLiteral(_)) => f.string = true,
            _ => f.any = true,
        }
    }
    f
}

fn reference_flags(r: &TSTypeReference, locals: &Locals, depth: u8) -> Flags {
    match &r.type_name {
        TSTypeName::IdentifierReference(id) => {
            let first_arg = r.type_arguments.as_ref().and_then(|a| a.params.first());
            identifier_flags(id.name.as_str(), first_arg, locals, depth)
        }
        // `Mode.Default`: a member of a local or imported enum has that enum's kind.
        TSTypeName::QualifiedName(q) => match &q.left {
            TSTypeName::IdentifierReference(id) => match locals.types.get(id.name.as_str()) {
                Some(LocalType::Enum(decl)) => enum_flags(decl),
                Some(_) if locals.resolving() => Flags::NONE,
                Some(_) => Flags::ANY,
                None => match locals.imported_type(id.name.as_str()) {
                    Some(t) => t.flags,
                    None if locals.resolving() && !locals.is_unresolved_import(id.name.as_str()) => Flags::NONE,
                    None => Flags::ANY,
                },
            },
            _ => Flags::ANY,
        },
        TSTypeName::ThisExpression(_) => Flags::NONE,
    }
}

fn identifier_flags(name: &str, first_arg: Option<&TSType>, locals: &Locals, depth: u8) -> Flags {
    if depth > MAX_DEPTH {
        return Flags::ANY;
    }
    match locals.types.get(name) {
        Some(LocalType::Alias(ty)) => return flags_of(ty, locals, depth + 1),
        Some(LocalType::Enum(decl)) => return enum_flags(decl),
        Some(LocalType::Interface(_) | LocalType::Class(_)) => return Flags::NONE,
        None => {}
    }
    if let Some(t) = locals.imported_type(name) {
        return t.flags;
    }
    if !locals.resolving() || locals.is_unresolved_import(name) {
        // Single-file program, or an import we cannot follow (a package): `any`.
        return Flags::ANY;
    }
    // Build-accurate: a lib type.
    match name {
        "Uppercase" | "Lowercase" | "Capitalize" | "Uncapitalize" => Flags::STRING,
        "PropertyKey" => Flags { string: true, number: true, ..Flags::NONE },
        "NonNullable" | "Readonly" | "NoInfer" => first_arg.map_or(Flags::NONE, |t| flags_of(t, locals, depth + 1)),
        "String" => Flags::STRING,
        "Number" => Flags::NUMBER,
        "Boolean" => Flags::BOOLEAN,
        _ => Flags::NONE,
    }
}

fn enum_flags(decl: &TSEnumDeclaration) -> Flags {
    let mut f = Flags::NONE;
    for member in &decl.body.members {
        match &member.initializer {
            Some(Expression::StringLiteral(_) | Expression::TemplateLiteral(_)) => f.string = true,
            _ => f.number = true,
        }
    }
    if decl.body.members.is_empty() {
        f.number = true;
    }
    f
}
