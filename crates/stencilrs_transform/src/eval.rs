//! Decorator argument evaluation: the syntactic half of Stencil's `getDecoratorParameters`
//! (`decorators-to-static/decorator-utils.ts`). Literals and object/array literals become
//! JSON values. Identifier arguments (`@Watch(CONST)`, `@Listen(Enum.X)`) need a const
//! evaluator and are not supported yet.

use oxc::ast::ast::{Argument, ArrayExpressionElement, Expression, ObjectPropertyKind, PropertyKey};
use serde_json::{Map, Number, Value};

pub fn eval_argument(arg: &Argument) -> Option<Value> {
    arg.as_expression().and_then(eval_expression)
}

pub fn eval_expression(expr: &Expression) -> Option<Value> {
    Some(match expr {
        Expression::StringLiteral(s) => Value::String(s.value.to_string()),
        Expression::TemplateLiteral(t) if t.expressions.is_empty() => Value::String(
            t.quasis.iter().map(|q| q.value.cooked.as_ref().map_or("", |c| c.as_str())).collect(),
        ),
        Expression::NumericLiteral(n) => Value::Number(Number::from_f64(n.value)?),
        Expression::BooleanLiteral(b) => Value::Bool(b.value),
        Expression::NullLiteral(_) => Value::Null,
        Expression::ParenthesizedExpression(p) => return eval_expression(&p.expression),
        Expression::ArrayExpression(arr) => Value::Array(
            arr.elements
                .iter()
                .map(|el| match el {
                    ArrayExpressionElement::SpreadElement(_) | ArrayExpressionElement::Elision(_) => None,
                    other => other.as_expression().and_then(eval_expression),
                })
                .collect::<Option<Vec<_>>>()?,
        ),
        Expression::ObjectExpression(obj) => {
            let mut map = Map::new();
            for prop in &obj.properties {
                let ObjectPropertyKind::ObjectProperty(p) = prop else { return None };
                let key = property_key_name(&p.key)?;
                map.insert(key, eval_expression(&p.value)?);
            }
            Value::Object(map)
        }
        _ => return None,
    })
}

pub fn property_key_name(key: &PropertyKey) -> Option<String> {
    match key {
        PropertyKey::StaticIdentifier(id) => Some(id.name.to_string()),
        PropertyKey::StringLiteral(s) => Some(s.value.to_string()),
        PropertyKey::NumericLiteral(n) => Some(n.value.to_string()),
        _ => None,
    }
}
