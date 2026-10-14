//! Syntactic port of Stencil's `propTypeFromTSType`
//! (`decorators-to-static/prop-decorator.ts:275-376`).
//!
//! Stencil asks the TypeChecker for the prop's type and checks its flags: a union counts as
//! string / number / boolean when any member does, more than one of those is `any`, and none
//! of them is `unknown`. Here the same rules run over the written annotation. Names declared
//! in the same file (type aliases, enums, interfaces, classes) are followed; anything else
//! (imports, globals such as `Date`) is `any`, which is what Stencil's single-file
//! `transpileSync` produces for an unresolved type.

use std::collections::HashMap;

use oxc::ast::ast::{
    Expression, TSEnumDeclaration, TSLiteral, TSType, TSTypeName, UnaryOperator,
};

use crate::meta::PropType;

/// A type name declared at the top level of the file being analysed.
pub enum LocalType<'a, 'b> {
    Alias(&'b TSType<'a>),
    Enum(&'b TSEnumDeclaration<'a>),
    /// Interfaces and classes: object types, never string / number / boolean.
    Object,
}

pub type LocalTypes<'a, 'b> = HashMap<&'a str, LocalType<'a, 'b>>;

#[derive(Default, Clone, Copy)]
struct Flags {
    any: bool,
    string: bool,
    number: bool,
    boolean: bool,
}

impl Flags {
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
pub fn classify_annotation(ty: &TSType, locals: &LocalTypes) -> PropType {
    flags_of(ty, locals, 0).into_prop_type()
}

/// Classify a prop with no annotation from its initializer, the way TypeScript widens it.
pub fn classify_initializer(init: Option<&Expression>) -> PropType {
    match init {
        // No annotation and no initializer is an implicit `any`.
        None => PropType::Any,
        Some(Expression::StringLiteral(_) | Expression::TemplateLiteral(_)) => PropType::String,
        Some(Expression::NumericLiteral(_)) => PropType::Number,
        Some(Expression::UnaryExpression(u))
            if u.operator == UnaryOperator::UnaryNegation
                && matches!(u.argument, Expression::NumericLiteral(_)) =>
        {
            PropType::Number
        }
        Some(Expression::BooleanLiteral(_)) => PropType::Boolean,
        Some(_) => PropType::Unknown,
    }
}

fn flags_of(ty: &TSType, locals: &LocalTypes, depth: u8) -> Flags {
    if depth > MAX_DEPTH {
        return Flags { any: true, ..Flags::default() };
    }
    let mut f = Flags::default();
    match ty {
        TSType::TSAnyKeyword(_) => f.any = true,
        TSType::TSStringKeyword(_) | TSType::TSTemplateLiteralType(_) => f.string = true,
        TSType::TSNumberKeyword(_) => f.number = true,
        TSType::TSBooleanKeyword(_) => f.boolean = true,
        TSType::TSLiteralType(lit) => match &lit.literal {
            TSLiteral::StringLiteral(_) | TSLiteral::TemplateLiteral(_) => f.string = true,
            TSLiteral::NumericLiteral(_) => f.number = true,
            TSLiteral::UnaryExpression(u) if matches!(u.argument, Expression::NumericLiteral(_)) => {
                f.number = true;
            }
            TSLiteral::BooleanLiteral(_) => f.boolean = true,
            _ => {}
        },
        TSType::TSUnionType(union) => {
            for member in &union.types {
                f.merge(flags_of(member, locals, depth + 1));
            }
        }
        TSType::TSParenthesizedType(p) => return flags_of(&p.type_annotation, locals, depth + 1),
        TSType::TSTypeReference(r) => return reference_flags(&r.type_name, locals, depth),
        // Types the checker could only answer with full resolution: in the single-file
        // program they come out as `any`.
        TSType::TSTypeQuery(_)
        | TSType::TSIndexedAccessType(_)
        | TSType::TSConditionalType(_)
        | TSType::TSImportType(_)
        | TSType::TSTypeOperatorType(_)
        | TSType::TSMappedType(_)
        | TSType::TSInferType(_) => f.any = true,
        // Object-like or non-primitive types (arrays, tuples, functions, literals,
        // intersections, null, undefined, void, never, unknown, symbol, bigint, object).
        _ => {}
    }
    f
}

fn reference_flags(name: &TSTypeName, locals: &LocalTypes, depth: u8) -> Flags {
    let any = Flags { any: true, ..Flags::default() };
    match name {
        TSTypeName::IdentifierReference(id) => match locals.get(id.name.as_str()) {
            Some(LocalType::Alias(ty)) => flags_of(ty, locals, depth + 1),
            Some(LocalType::Enum(decl)) => enum_flags(decl),
            Some(LocalType::Object) => Flags::default(),
            None => any,
        },
        // `Mode.Default`: a member of a local enum has that enum's kind.
        TSTypeName::QualifiedName(q) => match &q.left {
            TSTypeName::IdentifierReference(id) => match locals.get(id.name.as_str()) {
                Some(LocalType::Enum(decl)) => enum_flags(decl),
                _ => any,
            },
            _ => any,
        },
        TSTypeName::ThisExpression(_) => Flags::default(),
    }
}

fn enum_flags(decl: &TSEnumDeclaration) -> Flags {
    let mut f = Flags::default();
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
