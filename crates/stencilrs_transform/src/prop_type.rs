//! Syntactic port of Stencil's `propTypeFromTSType`
//! (`decorators-to-static/prop-decorator.ts:275-376`).
//!
//! Stencil asks the TypeChecker for the prop's type and checks its flags: a union counts as
//! string / number / boolean when any member does, more than one of those is `any`, and none
//! of them is `unknown`. Here the same rules run over the written annotation, or over the
//! initializer the way TypeScript would infer it. Names declared in the same file are
//! followed; anything else (imports, globals such as `Date`) is `any`, which is what
//! Stencil's single-file `transpileSync` program produces for an unresolved name.

use oxc::ast::ast::{
    Expression, ObjectPropertyKind, PropertyKey, TSEnumDeclaration, TSLiteral, TSSignature,
    TSType, TSTypeName, TSTypeOperatorOperator, TSTypeQueryExprName, UnaryOperator,
};
use oxc::span::GetSpan;

use crate::locals::{LocalType, LocalValue, Locals};
use crate::meta::PropType;

#[derive(Default, Clone, Copy)]
struct Flags {
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

    fn into_prop_type(self) -> PropType {
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
        // Without the lib, `Array` is missing and an array literal prints as `{}`.
        Expression::ArrayExpression(_) => (PropType::Unknown, "{}".into()),
        Expression::ObjectExpression(obj) => (PropType::Unknown, print_object_literal(obj, locals, source, depth)),
        Expression::ParenthesizedExpression(p) => infer(&p.expression, locals, source, depth + 1),
        Expression::TSNonNullExpression(e) => infer(&e.expression, locals, source, depth + 1),
        Expression::TSSatisfiesExpression(e) => infer(&e.expression, locals, source, depth + 1),
        Expression::TSAsExpression(e) => asserted(&e.type_annotation, locals, source),
        Expression::TSTypeAssertion(e) => asserted(&e.type_annotation, locals, source),
        Expression::Identifier(id) => match locals.values.get(id.name.as_str()) {
            Some(LocalValue::Const(init)) | Some(LocalValue::Let(Some(init))) => infer(init, locals, source, depth + 1),
            Some(LocalValue::Object) => named(PropType::Unknown),
            // Unresolved names, imports and `undefined` (widened to `any`).
            _ => named(PropType::Any),
        },
        // Calls, `new`, member access and everything else depend on types the single-file
        // program cannot see.
        _ => named(PropType::Any),
    }
}

fn asserted(ty: &TSType, locals: &Locals, source: &str) -> (PropType, String) {
    if matches!(ty, TSType::TSTypeReference(r) if matches!(&r.type_name, TSTypeName::IdentifierReference(id) if id.name == "const")) {
        return named(PropType::Any);
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
        TSType::TSTypeReference(r) => reference_flags(&r.type_name, locals, depth),
        TSType::TSTypeOperatorType(op) => match op.operator {
            TSTypeOperatorOperator::Keyof => keyof_flags(&op.type_annotation, locals, depth),
            _ => Flags::NONE,
        },
        TSType::TSTypeQuery(q) => match &q.expr_name {
            TSTypeQueryExprName::IdentifierReference(id) => match id.name.as_str() {
                "globalThis" => Flags::NONE,
                name => match locals.values.get(name) {
                    Some(LocalValue::Const(init)) | Some(LocalValue::Let(Some(init))) => {
                        Flags::from_prop_type(infer(init, locals, "", depth + 1).0)
                    }
                    Some(LocalValue::Object) => Flags::NONE,
                    _ => Flags::ANY,
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
        | TSType::TSInferType(_) => Flags::ANY,
        // Object-like or non-primitive types (arrays, tuples, functions, literals,
        // intersections, null, undefined, void, never, unknown, symbol, bigint, object).
        _ => Flags::NONE,
    }
}

impl Flags {
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

/// `keyof T`: the kinds of T's member names. Unresolved `T` is `any`, and `keyof any` is
/// `string | number | symbol`, which is `any` again.
fn keyof_flags(ty: &TSType, locals: &Locals, depth: u8) -> Flags {
    let from_keys = |keys: &mut dyn Iterator<Item = KeyKind>| {
        let mut f = Flags::NONE;
        for k in keys {
            match k {
                KeyKind::String => f.string = true,
                KeyKind::Number => f.number = true,
                KeyKind::Any => f.any = true,
            }
        }
        f
    };
    match ty {
        TSType::TSTypeLiteral(lit) => from_keys(&mut signature_keys(&lit.members)),
        TSType::TSTypeReference(r) => match &r.type_name {
            TSTypeName::IdentifierReference(id) => match locals.types.get(id.name.as_str()) {
                Some(LocalType::Interface(members)) => from_keys(&mut signature_keys(members)),
                Some(LocalType::Class(members)) => {
                    if members.is_empty() {
                        Flags::NONE
                    } else {
                        Flags::STRING
                    }
                }
                Some(LocalType::Alias(inner)) => keyof_flags(inner, locals, depth + 1),
                Some(LocalType::Enum(_)) => Flags::NONE,
                None => Flags::ANY,
            },
            _ => Flags::ANY,
        },
        _ => Flags::ANY,
    }
}

enum KeyKind {
    String,
    Number,
    Any,
}

fn signature_keys<'s>(members: &'s [TSSignature]) -> impl Iterator<Item = KeyKind> + 's {
    members.iter().map(|m| {
        let key = match m {
            TSSignature::TSPropertySignature(p) => Some(&p.key),
            TSSignature::TSMethodSignature(p) => Some(&p.key),
            _ => None,
        };
        match key {
            Some(PropertyKey::NumericLiteral(_)) => KeyKind::Number,
            Some(PropertyKey::StaticIdentifier(_) | PropertyKey::StringLiteral(_)) => KeyKind::String,
            _ => KeyKind::Any,
        }
    })
}

fn reference_flags(name: &TSTypeName, locals: &Locals, depth: u8) -> Flags {
    match name {
        TSTypeName::IdentifierReference(id) => match locals.types.get(id.name.as_str()) {
            Some(LocalType::Alias(ty)) => flags_of(ty, locals, depth + 1),
            Some(LocalType::Enum(decl)) => enum_flags(decl),
            Some(LocalType::Interface(_) | LocalType::Class(_)) => Flags::NONE,
            None => Flags::ANY,
        },
        // `Mode.Default`: a member of a local enum has that enum's kind.
        TSTypeName::QualifiedName(q) => match &q.left {
            TSTypeName::IdentifierReference(id) => match locals.types.get(id.name.as_str()) {
                Some(LocalType::Enum(decl)) => enum_flags(decl),
                _ => Flags::ANY,
            },
            _ => Flags::ANY,
        },
        TSTypeName::ThisExpression(_) => Flags::NONE,
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
