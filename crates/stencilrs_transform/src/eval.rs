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

use oxc::ast::ast::{Argument, ArrayExpressionElement, CallExpression, Expression, ObjectExpression, ObjectPropertyKind, PropertyKey};
use oxc::span::{GetSpan, Span};
use serde_json::{Map, Value, json};

use crate::consts::{Lit, literal};
use crate::locals::{LocalType, LocalValue, Locals};

/// A top-level decorator argument (`@Prop({...})`, `@Watch('x')`, `@Listen('click', {...})`).
pub enum Arg {
    Value(Value),
    /// An identifier or property access with a literal type, read through the checker; or
    /// what `resolveVar()` resolved.
    Lit(Lit),
    /// Stencil throws, and the whole transform fails with this one message.
    Throw(String),
}

/// `getDecoratorParameter`: string and object literals as written, `resolveVar(x)`, and
/// identifiers or property accesses whose type is a literal. The argument must be exactly
/// one of those: `('x')` or `{...} as Opts` is invalid.
pub fn eval_argument(arg: &Argument, source: &str, locals: &Locals) -> Arg {
    let Some(expr) = arg.as_expression() else { return invalid(arg.span(), source) };
    match expr {
        Expression::StringLiteral(s) => Arg::Value(Value::String(s.value.to_string())),
        Expression::ObjectExpression(_) => Arg::Value(object_value(expr, source)),
        Expression::CallExpression(call) if is_resolve_var(&call.callee) => resolve_var(call, source, locals),
        Expression::Identifier(_) | Expression::StaticMemberExpression(_) => match literal(expr, locals) {
            Some(lit) => Arg::Lit(lit),
            None => invalid(expr.span(), source),
        },
        _ => invalid(expr.span(), source),
    }
}

fn invalid(span: Span, source: &str) -> Arg {
    Arg::Throw(format!("Error: invalid decorator argument: {}", span.source_text(source)))
}

fn is_resolve_var(callee: &Expression) -> bool {
    match callee {
        Expression::Identifier(id) => id.name == "resolveVar",
        Expression::StaticMemberExpression(m) => m.property.name == "resolveVar",
        _ => false,
    }
}

/// `resolveVariableValue`: the string value of a variable (`const` or `let`, from its literal
/// type or its initializer) or of an object, enum or class property.
fn resolve_var(call: &CallExpression, source: &str, locals: &Locals) -> Arg {
    let unresolved = |text: &str| {
        Arg::Throw(format!(
            "Error: resolveVar() cannot resolve the value of \"{text}\" at compile time. Only const variables and object properties with string literal values are supported."
        ))
    };
    let [arg] = call.arguments.as_slice() else {
        return Arg::Throw("Error: resolveVar() expects exactly one argument.".into());
    };
    let Some(expr) = arg.as_expression() else { return unresolved(arg.span().source_text(source)) };
    let text = expr.span().source_text(source);
    if matches!(expr, Expression::Identifier(_) | Expression::StaticMemberExpression(_)) {
        if let Some(Lit::Str(s)) = literal(expr, locals) {
            return Arg::Lit(Lit::Str(s));
        }
    }
    match expr {
        Expression::Identifier(id) => {
            let init = match locals.values.get(id.name.as_str()) {
                Some(LocalValue::Const(init)) => Some(*init),
                Some(LocalValue::Let(init)) => *init,
                _ => None,
            };
            match init.and_then(|i| string_value(i, locals)) {
                Some(s) => Arg::Lit(Lit::Str(s)),
                None => unresolved(text),
            }
        }
        Expression::StaticMemberExpression(m) => {
            let name = m.property.name.as_str();
            match has_property(&m.object, name, locals) {
                None => Arg::Throw(format!(
                    "Error: resolveVar() cannot find property \"{name}\" on object \"{}\" at compile time.",
                    m.object.span().source_text(source)
                )),
                // A class field's initializer counts even when its type widened.
                Some(Some(init)) => match string_value(init, locals) {
                    Some(s) => Arg::Lit(Lit::Str(s)),
                    None => unresolved(text),
                },
                Some(None) => unresolved(text),
            }
        }
        _ => Arg::Throw(format!(
            "Error: resolveVar() can only be used with const variables or object properties. \"{text}\" is not supported."
        )),
    }
}

/// `extractStringFromExpression`.
fn string_value(expr: &Expression, locals: &Locals) -> Option<String> {
    match literal(expr, locals)? {
        Lit::Str(s) => Some(s),
        Lit::Num(_) => None,
    }
}

/// Whether the checker finds property `name` on `object`'s type (`getPropertyOfType`):
/// `None` when it doesn't; otherwise the initializer to fall back on, for class fields.
fn has_property<'e, 'a>(object: &'e Expression<'a>, name: &str, locals: &'e Locals<'a, 'e>) -> Option<Option<&'e Expression<'a>>> {
    if let Expression::Identifier(id) = object {
        let target = id.name.as_str();
        if let Some(LocalType::Enum(e)) = locals.types.get(target) {
            return e.body.members.iter().any(|m| m.id.static_name() == name).then_some(None);
        }
        if let Some(statics) = locals.statics.get(target) {
            return statics.iter().find(|f| f.name == name).map(|f| f.init);
        }
        if !locals.values.contains_key(target) {
            // Build-accurate mode: an imported object, enum or class.
            return locals.imported_value(target)?.members.contains_key(name).then_some(None);
        }
    }
    let obj = match object {
        Expression::Identifier(id) => match locals.values.get(id.name.as_str()) {
            Some(LocalValue::Const(init)) | Some(LocalValue::Let(Some(init))) => object_literal(init)?,
            _ => return None,
        },
        _ => object_literal(object)?,
    };
    obj.properties
        .iter()
        .any(|p| matches!(p, ObjectPropertyKind::ObjectProperty(p) if property_key_name(&p.key).as_deref() == Some(name)))
        .then_some(None)
}

fn object_literal<'e, 'a>(expr: &'e Expression<'a>) -> Option<&'e ObjectExpression<'a>> {
    match expr {
        Expression::ObjectExpression(o) => Some(o),
        Expression::ParenthesizedExpression(p) => object_literal(&p.expression),
        Expression::TSAsExpression(a) => object_literal(&a.expression),
        Expression::TSSatisfiesExpression(s) => object_literal(&s.expression),
        _ => None,
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
