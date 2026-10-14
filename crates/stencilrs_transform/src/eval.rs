//! Decorator argument evaluation: a port of Stencil's `getDecoratorParameters` and
//! `objectLiteralToObjectMap` (`decorators-to-static/decorator-utils.ts`,
//! `transformers/transform-utils.ts:295-388`).
//!
//! Inside object literals Stencil only converts strings, no-substitution templates, `true`,
//! `false`, arrays, nested objects and identifiers. Everything else (numbers, `null`,
//! property accesses, calls, `as` expressions) is kept as the raw AST node, so a check like
//! `attribute === null` never matches. That is reproduced here: those values become an
//! opaque `{"__node": "<source>"}` object. Identifiers become `{"__identifier": "<name>"}`
//! (Stencil's `getIdentifierValue`), except `undefined`, which leaves the key out.

use oxc::ast::ast::{Argument, ArrayExpressionElement, Expression, ObjectPropertyKind, PropertyKey};
use oxc::span::GetSpan;
use serde_json::{Map, Value, json};

/// A top-level decorator argument (`@Prop({...})`, `@Watch('x')`, `@Listen('click', {...})`).
pub enum Arg {
    Value(Value),
    /// An identifier or property access: Stencil asks the type checker for its literal value.
    NeedsConstEval,
    /// Anything else: Stencil throws `invalid decorator argument`.
    Invalid,
}

pub fn eval_argument(arg: &Argument, source: &str) -> Arg {
    let Some(expr) = arg.as_expression() else { return Arg::Invalid };
    match expr.get_inner_expression() {
        Expression::StringLiteral(s) => Arg::Value(Value::String(s.value.to_string())),
        Expression::ObjectExpression(_) => Arg::Value(object_value(expr.get_inner_expression(), source)),
        Expression::Identifier(_) | Expression::StaticMemberExpression(_) => Arg::NeedsConstEval,
        _ => Arg::Invalid,
    }
}

fn object_value(expr: &Expression, source: &str) -> Value {
    match expr {
        Expression::ObjectExpression(obj) => {
            let mut map = Map::new();
            for prop in &obj.properties {
                let ObjectPropertyKind::ObjectProperty(p) = prop else { continue };
                let Some(key) = property_key_name(&p.key) else { continue };
                if p.shorthand {
                    map.insert(key.clone(), json!({ "__identifier": key }));
                    continue;
                }
                if let Some(v) = member_value(&p.value, source) {
                    map.insert(key, v);
                }
            }
            Value::Object(map)
        }
        _ => opaque(expr, source),
    }
}

/// `None` means the key is set to `undefined`.
fn member_value(expr: &Expression, source: &str) -> Option<Value> {
    Some(match expr {
        Expression::StringLiteral(s) => Value::String(s.value.to_string()),
        Expression::TemplateLiteral(t) if t.expressions.is_empty() => Value::String(
            t.quasis.iter().map(|q| q.value.cooked.as_ref().map_or("", |c| c.as_str())).collect(),
        ),
        Expression::BooleanLiteral(b) => Value::Bool(b.value),
        Expression::ArrayExpression(arr) => Value::Array(
            arr.elements
                .iter()
                .filter_map(|el| match el {
                    ArrayExpressionElement::SpreadElement(_) | ArrayExpressionElement::Elision(_) => None,
                    other => other.as_expression().and_then(|e| array_element(e, source)),
                })
                .collect(),
        ),
        Expression::ObjectExpression(_) => object_value(expr, source),
        Expression::Identifier(id) => match id.name.as_str() {
            "undefined" => return None,
            name => json!({ "__identifier": name }),
        },
        _ => opaque(expr, source),
    })
}

/// Port of `arrayLiteralToArray`: strings, numbers, booleans, nested arrays and objects.
fn array_element(expr: &Expression, source: &str) -> Option<Value> {
    Some(match expr {
        Expression::StringLiteral(s) => Value::String(s.value.to_string()),
        Expression::NumericLiteral(n) => json!(n.value),
        Expression::BooleanLiteral(b) => Value::Bool(b.value),
        Expression::ArrayExpression(_) | Expression::ObjectExpression(_) => member_value(expr, source)?,
        _ => opaque(expr, source),
    })
}

fn opaque(expr: &Expression, source: &str) -> Value {
    json!({ "__node": expr.span().source_text(source) })
}

pub fn property_key_name(key: &PropertyKey) -> Option<String> {
    match key {
        PropertyKey::StaticIdentifier(id) => Some(id.name.to_string()),
        PropertyKey::StringLiteral(s) => Some(s.value.to_string()),
        PropertyKey::NumericLiteral(n) => Some(n.value.to_string()),
        _ => None,
    }
}
