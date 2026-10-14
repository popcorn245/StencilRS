//! Port of Stencil's `resolveInitializerText` (`decorators-to-static/prop-decorator.ts:430-660`):
//! the `defaultValue` text of a prop. Primitive literals, object and array literals, `const`
//! references and `OBJ.key` / `OBJ['key']` lookups are followed to their literal source text;
//! anything else falls back to the initializer as written. Only same-file `const`s resolve,
//! as in the single-file program.

use oxc::ast::ast::{Expression, ObjectExpression, ObjectPropertyKind, PropertyKey, UnaryOperator};
use oxc::span::GetSpan;

use crate::locals::Locals;

const MAX_RESOLVE_DEPTH: u8 = 5;

pub fn initializer_text(init: &Expression, locals: &Locals, source: &str) -> String {
    resolve_literal_text(init, locals, source, 0).unwrap_or_else(|| text(init, source))
}

fn text(e: &Expression, source: &str) -> String {
    e.span().source_text(source).to_owned()
}

/// `'x' as const`, `('x')`, `<T>x`, `x satisfies T`, `x!` → `x`.
fn unwrap<'a, 'b>(mut e: &'b Expression<'a>) -> &'b Expression<'a> {
    loop {
        e = match e {
            Expression::TSAsExpression(x) => &x.expression,
            Expression::ParenthesizedExpression(x) => &x.expression,
            Expression::TSTypeAssertion(x) => &x.expression,
            Expression::TSSatisfiesExpression(x) => &x.expression,
            Expression::TSNonNullExpression(x) => &x.expression,
            _ => return e,
        };
    }
}

fn is_primitive_literal(e: &Expression) -> bool {
    match e {
        Expression::StringLiteral(_) | Expression::NumericLiteral(_) | Expression::BooleanLiteral(_) | Expression::NullLiteral(_) => true,
        Expression::TemplateLiteral(t) => t.expressions.is_empty(),
        Expression::UnaryExpression(u) => {
            matches!(u.operator, UnaryOperator::UnaryNegation | UnaryOperator::UnaryPlus)
                && matches!(u.argument, Expression::NumericLiteral(_))
        }
        _ => false,
    }
}

fn resolve_literal_text(node: &Expression, locals: &Locals, source: &str, depth: u8) -> Option<String> {
    if depth > MAX_RESOLVE_DEPTH {
        return None;
    }
    let node = unwrap(node);
    if is_primitive_literal(node) || matches!(node, Expression::ObjectExpression(_) | Expression::ArrayExpression(_)) {
        return Some(text(node, source));
    }
    match node {
        Expression::Identifier(id) => match locals.const_init(id.name.as_str()) {
            Some(init) => resolve_literal_text(init, locals, source, depth + 1),
            None if id.name == "undefined" => Some("undefined".into()),
            None => None,
        },
        Expression::StaticMemberExpression(m) => {
            let obj = resolve_object_literal(&m.object, locals, depth + 1)?;
            let prop = find_member(obj, m.property.name.as_str())?;
            resolve_literal_text(prop, locals, source, depth + 1)
        }
        Expression::ComputedMemberExpression(m) => {
            let key = match unwrap(&m.expression) {
                Expression::StringLiteral(s) => s.value.to_string(),
                Expression::TemplateLiteral(t) if t.expressions.is_empty() => {
                    t.quasis.iter().map(|q| q.value.raw.as_str()).collect()
                }
                Expression::NumericLiteral(n) => n.raw.as_ref().map_or_else(|| n.value.to_string(), |r| r.to_string()),
                _ => return None,
            };
            let obj = resolve_object_literal(&m.object, locals, depth + 1)?;
            let prop = find_member(obj, &key)?;
            resolve_literal_text(prop, locals, source, depth + 1)
        }
        _ => None,
    }
}

fn resolve_object_literal<'a, 'b>(node: &'b Expression<'a>, locals: &Locals<'a, 'b>, depth: u8) -> Option<&'b ObjectExpression<'a>> {
    if depth > MAX_RESOLVE_DEPTH {
        return None;
    }
    match unwrap(node) {
        Expression::ObjectExpression(obj) => Some(obj),
        Expression::Identifier(id) => resolve_object_literal(locals.const_init(id.name.as_str())?, locals, depth + 1),
        _ => None,
    }
}

fn find_member<'a, 'b>(obj: &'b ObjectExpression<'a>, key: &str) -> Option<&'b Expression<'a>> {
    obj.properties.iter().rev().find_map(|p| match p {
        ObjectPropertyKind::ObjectProperty(p) if !p.computed || matches!(p.key, PropertyKey::StringLiteral(_)) => {
            (crate::eval::property_key_name(&p.key).as_deref() == Some(key)).then_some(&p.value)
        }
        _ => None,
    })
}
