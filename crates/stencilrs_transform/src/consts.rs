//! Literal types of expressions, as Stencil reads them from TypeScript's checker for
//! identifier decorator arguments (`@Watch(PROP)`, `getDecoratorParameter`), computed member
//! names (`@Prop() [KEY]`, `tsPropDeclName`) and `resolveVar()`.
//!
//! The checker gives an expression a literal type when it is a string or number literal, a
//! negated number, a template whose parts are all literal, or names something that has one:
//! a `const` (its written literal type, or its initializer's), a member of an enum, a property
//! of an `as const` object, a `static readonly` class field. Everything else widens to
//! `string` / `number` and has no value here. Only this module's own declarations are known:
//! in Stencil's single-file program, imports are unresolved.

use oxc::ast::ast::{
    BinaryOperator, Expression, ObjectExpression, ObjectPropertyKind, PropertyKey, TSEnumDeclaration,
    TSEnumMemberName, TSLiteral, TSType, TSTypeName, UnaryOperator,
};

use crate::eval::property_key_name;
use crate::locals::{LocalType, Locals, StaticField};
use crate::resolve::ValueSummary;

#[derive(Clone, Debug, PartialEq)]
pub enum Lit {
    Str(String),
    Num(f64),
}

impl Lit {
    /// `String(value)` in JavaScript.
    pub fn to_js_string(&self) -> String {
        match self {
            Lit::Str(s) => s.clone(),
            Lit::Num(n) => js_number(*n),
        }
    }
}

/// `Number.prototype.toString()` for the values a literal type can hold.
pub fn js_number(n: f64) -> String {
    if n.is_nan() {
        return "NaN".into();
    }
    if n.is_infinite() {
        return if n > 0.0 { "Infinity".into() } else { "-Infinity".into() };
    }
    if n == 0.0 {
        return "0".into();
    }
    let abs = n.abs();
    if (1e-6..1e21).contains(&abs) {
        // Rust prints the shortest round-trip digits without an exponent in this range, as JS does.
        return format!("{n}");
    }
    // Exponent form: `1e+21`, `1.5e-7`.
    let s = format!("{n:e}");
    match s.split_once('e') {
        Some((mantissa, exp)) if !exp.starts_with('-') => format!("{mantissa}e+{exp}"),
        _ => s,
    }
}

/// The literal type of `expr`, if it has one.
pub fn literal(expr: &Expression, locals: &Locals) -> Option<Lit> {
    literal_depth(expr, locals, 0)
}

/// Guards against `const A = B; const B = A;`.
const MAX_DEPTH: u32 = 32;

fn literal_depth(expr: &Expression, locals: &Locals, depth: u32) -> Option<Lit> {
    if depth > MAX_DEPTH {
        return None;
    }
    let next = depth + 1;
    match expr {
        Expression::StringLiteral(s) => Some(Lit::Str(s.value.to_string())),
        Expression::NumericLiteral(n) => Some(Lit::Num(n.value)),
        Expression::UnaryExpression(u) if u.operator == UnaryOperator::UnaryNegation => match &u.argument {
            Expression::NumericLiteral(n) => Some(Lit::Num(-n.value)),
            _ => None,
        },
        Expression::TemplateLiteral(t) => {
            let mut out = String::new();
            for (i, quasi) in t.quasis.iter().enumerate() {
                out.push_str(quasi.value.cooked.as_ref()?.as_str());
                if let Some(e) = t.expressions.get(i) {
                    out.push_str(&literal_depth(e, locals, next)?.to_js_string());
                }
            }
            Some(Lit::Str(out))
        }
        Expression::ParenthesizedExpression(p) => literal_depth(&p.expression, locals, next),
        Expression::TSSatisfiesExpression(s) => literal_depth(&s.expression, locals, next),
        Expression::TSNonNullExpression(n) => literal_depth(&n.expression, locals, next),
        Expression::TSAsExpression(a) => {
            if is_as_const(&a.type_annotation) {
                literal_depth(&a.expression, locals, next)
            } else {
                type_literal(&a.type_annotation)
            }
        }
        Expression::Identifier(id) => name_literal_depth(id.name.as_str(), locals, next),
        Expression::StaticMemberExpression(m) => member(&m.object, m.property.name.as_str(), locals, next),
        Expression::ComputedMemberExpression(m) => match &m.expression {
            Expression::StringLiteral(key) => member(&m.object, key.value.as_str(), locals, next),
            _ => None,
        },
        _ => None,
    }
}

/// The literal value of the `const` (or imported value, in build-accurate mode) named `name`.
pub fn name_literal(name: &str, locals: &Locals) -> Option<Lit> {
    name_literal_depth(name, locals, 0)
}

fn name_literal_depth(name: &str, locals: &Locals, depth: u32) -> Option<Lit> {
    if let Some(t) = locals.const_annotations.get(name) {
        return type_literal(t);
    }
    if let Some(init) = locals.const_init(name) {
        return literal_depth(init, locals, depth);
    }
    if locals.values.contains_key(name) {
        return None;
    }
    locals.imported_value(name)?.literal
}

/// The literal values of an enum's members or a class's `static readonly` fields.
pub fn static_member_literals(name: &str, locals: &Locals) -> Vec<(String, Option<Lit>)> {
    if let Some(LocalType::Enum(e)) = locals.types.get(name) {
        return enum_values(e, locals);
    }
    locals
        .statics
        .get(name)
        .map(|statics| statics.iter().map(|f| (f.name.clone(), static_literal(f, locals, 0))).collect())
        .unwrap_or_default()
}

/// A mutable field widens; a readonly one keeps its literal type.
fn static_literal(field: &StaticField, locals: &Locals, depth: u32) -> Option<Lit> {
    match field.annotation {
        Some(t) => type_literal(t),
        None if field.readonly => literal_depth(field.init?, locals, depth),
        None => None,
    }
}

/// An imported value (in build-accurate mode), followed through `.member` accesses.
fn imported_member(object: &Expression, name: &str, locals: &Locals) -> Option<Lit> {
    fn summary(expr: &Expression, locals: &Locals) -> Option<ValueSummary> {
        match expr {
            Expression::Identifier(id) if !locals.values.contains_key(id.name.as_str()) => locals.imported_value(id.name.as_str()),
            Expression::StaticMemberExpression(m) => summary(&m.object, locals)?.members.get(m.property.name.as_str()).cloned(),
            _ => None,
        }
    }
    summary(object, locals)?.members.get(name)?.literal.clone()
}

/// `object.name`: an enum member, a `static readonly` field, or a property of an `as const` object.
fn member(object: &Expression, name: &str, locals: &Locals, depth: u32) -> Option<Lit> {
    if let Some(lit) = imported_member(object, name, locals) {
        return Some(lit);
    }
    if let Expression::Identifier(id) = object {
        let target = id.name.as_str();
        if let Some(LocalType::Enum(e)) = locals.types.get(target) {
            return enum_member(e, name, locals, depth);
        }
        if let Some(statics) = locals.statics.get(target) {
            return static_literal(statics.iter().find(|f| f.name == name)?, locals, depth);
        }
    }
    let (obj, as_const) = const_object(object, locals, depth)?;
    let value = object_property(obj, name)?;
    if as_const {
        return literal_depth(value, locals, depth);
    }
    // In a mutable object a property widens, unless it says `as const` itself.
    match value {
        Expression::TSAsExpression(_) => literal_depth(value, locals, depth),
        _ => None,
    }
}

/// The object literal an expression names, and whether it is read-only (`as const`, here or
/// on an enclosing object).
fn const_object<'e, 'a>(expr: &'e Expression<'a>, locals: &'e Locals<'a, 'e>, depth: u32) -> Option<(&'e ObjectExpression<'a>, bool)> {
    if depth > MAX_DEPTH {
        return None;
    }
    match expr {
        Expression::ObjectExpression(o) => Some((o, false)),
        Expression::ParenthesizedExpression(p) => const_object(&p.expression, locals, depth + 1),
        Expression::TSSatisfiesExpression(s) => const_object(&s.expression, locals, depth + 1),
        Expression::TSAsExpression(a) if is_as_const(&a.type_annotation) => {
            const_object(&a.expression, locals, depth + 1).map(|(o, _)| (o, true))
        }
        Expression::Identifier(id) if !locals.const_annotations.contains_key(id.name.as_str()) => {
            const_object(locals.const_init(id.name.as_str())?, locals, depth + 1)
        }
        Expression::StaticMemberExpression(m) => {
            let (parent, as_const) = const_object(&m.object, locals, depth + 1)?;
            let (o, inner) = const_object(object_property(parent, m.property.name.as_str())?, locals, depth + 1)?;
            Some((o, as_const || inner))
        }
        _ => None,
    }
}

fn object_property<'e, 'a>(obj: &'e ObjectExpression<'a>, name: &str) -> Option<&'e Expression<'a>> {
    obj.properties.iter().rev().find_map(|p| match p {
        ObjectPropertyKind::ObjectProperty(p) if !p.computed && !p.shorthand && property_key_name(&p.key).as_deref() == Some(name) => Some(&p.value),
        _ => None,
    })
}

pub fn is_as_const(t: &TSType) -> bool {
    matches!(t, TSType::TSTypeReference(r) if matches!(&r.type_name, TSTypeName::IdentifierReference(id) if id.name == "const"))
}

/// The value of a literal type annotation (`'a'`, `1`, `-1`).
fn type_literal(t: &TSType) -> Option<Lit> {
    let TSType::TSLiteralType(l) = t else { return None };
    match &l.literal {
        TSLiteral::StringLiteral(s) => Some(Lit::Str(s.value.to_string())),
        TSLiteral::NumericLiteral(n) => Some(Lit::Num(n.value)),
        TSLiteral::TemplateLiteral(t) if t.expressions.is_empty() => {
            Some(Lit::Str(t.quasis.iter().filter_map(|q| q.value.cooked.as_ref().map(|c| c.to_string())).collect()))
        }
        TSLiteral::UnaryExpression(u) if u.operator == UnaryOperator::UnaryNegation => match &u.argument {
            Expression::NumericLiteral(n) => Some(Lit::Num(-n.value)),
            _ => None,
        },
        _ => None,
    }
}

/// The value of enum member `name`.
fn enum_member(e: &TSEnumDeclaration, name: &str, locals: &Locals, depth: u32) -> Option<Lit> {
    enum_values_depth(e, locals, depth).into_iter().find(|(k, _)| k == name).and_then(|(_, v)| v)
}

/// Every member of an enum with its value: TypeScript's constant enum evaluation (literals,
/// earlier members, other constants, arithmetic), numbering members without an initializer
/// from the previous one. `None` for a member that isn't constant.
pub fn enum_values(e: &TSEnumDeclaration, locals: &Locals) -> Vec<(String, Option<Lit>)> {
    enum_values_depth(e, locals, 0)
}

fn enum_values_depth(e: &TSEnumDeclaration, locals: &Locals, depth: u32) -> Vec<(String, Option<Lit>)> {
    let mut values: Vec<(String, Option<Lit>)> = Vec::new();
    let mut next = Some(0.0);
    for m in &e.body.members {
        let key = match &m.id {
            TSEnumMemberName::Identifier(id) => id.name.to_string(),
            TSEnumMemberName::String(s) | TSEnumMemberName::ComputedString(s) => s.value.to_string(),
            TSEnumMemberName::ComputedTemplateString(t) => t.quasis.iter().filter_map(|q| q.value.cooked.as_ref().map(|c| c.to_string())).collect(),
        };
        let value = match &m.initializer {
            Some(init) => enum_expr(init, e, &values, locals, depth + 1),
            None => next.map(Lit::Num),
        };
        next = match &value {
            Some(Lit::Num(n)) => Some(n + 1.0),
            _ => None,
        };
        values.push((key, value));
    }
    values
}

fn enum_expr(expr: &Expression, e: &TSEnumDeclaration, earlier: &[(String, Option<Lit>)], locals: &Locals, depth: u32) -> Option<Lit> {
    if depth > MAX_DEPTH {
        return None;
    }
    let recurse = |x: &Expression| enum_expr(x, e, earlier, locals, depth + 1);
    let earlier_value = |name: &str| earlier.iter().rev().find(|(k, _)| k == name).and_then(|(_, v)| v.clone());
    match expr {
        Expression::Identifier(id) => earlier_value(id.name.as_str()).or_else(|| literal_depth(expr, locals, depth)),
        Expression::StaticMemberExpression(m) if matches!(&m.object, Expression::Identifier(o) if o.name == e.id.name) => {
            earlier_value(m.property.name.as_str())
        }
        Expression::ParenthesizedExpression(p) => recurse(&p.expression),
        Expression::UnaryExpression(u) => {
            let Lit::Num(n) = recurse(&u.argument)? else { return None };
            Some(Lit::Num(match u.operator {
                UnaryOperator::UnaryNegation => -n,
                UnaryOperator::UnaryPlus => n,
                UnaryOperator::BitwiseNot => !to_int32(n) as f64,
                _ => return None,
            }))
        }
        Expression::BinaryExpression(b) => {
            let (l, r) = (recurse(&b.left)?, recurse(&b.right)?);
            match (l, r) {
                (Lit::Num(l), Lit::Num(r)) => Some(Lit::Num(match b.operator {
                    BinaryOperator::Addition => l + r,
                    BinaryOperator::Subtraction => l - r,
                    BinaryOperator::Multiplication => l * r,
                    BinaryOperator::Division => l / r,
                    BinaryOperator::Remainder => l % r,
                    BinaryOperator::Exponential => l.powf(r),
                    BinaryOperator::ShiftLeft => to_int32(l).wrapping_shl(to_uint32(r) & 31) as f64,
                    BinaryOperator::ShiftRight => to_int32(l).wrapping_shr(to_uint32(r) & 31) as f64,
                    BinaryOperator::ShiftRightZeroFill => to_uint32(l).wrapping_shr(to_uint32(r) & 31) as f64,
                    BinaryOperator::BitwiseAnd => (to_int32(l) & to_int32(r)) as f64,
                    BinaryOperator::BitwiseOR => (to_int32(l) | to_int32(r)) as f64,
                    BinaryOperator::BitwiseXOR => (to_int32(l) ^ to_int32(r)) as f64,
                    _ => return None,
                })),
                (l, r) if b.operator == BinaryOperator::Addition => Some(Lit::Str(l.to_js_string() + &r.to_js_string())),
                _ => None,
            }
        }
        _ => literal_depth(expr, locals, depth),
    }
}

/// ECMAScript `ToInt32`.
fn to_int32(n: f64) -> i32 {
    to_uint32(n) as i32
}

/// ECMAScript `ToUint32`.
fn to_uint32(n: f64) -> u32 {
    if !n.is_finite() {
        return 0;
    }
    n.trunc().rem_euclid(4_294_967_296.0) as u32
}

/// Reorder `items` as a JavaScript object orders its keys: array-index keys (`"0"`, `"7"`)
/// first, ascending, then the rest in insertion order. Stencil's member metadata goes through
/// objects keyed by name.
pub fn order_like_object_keys<T>(items: &mut [T], key: impl Fn(&T) -> &str) {
    items.sort_by_key(|item| array_index(key(item)).map_or((1, 0), |i| (0, i)));
}

fn array_index(key: &str) -> Option<u32> {
    let canonical = key == "0" || (!key.starts_with('0') && !key.is_empty() && key.bytes().all(|b| b.is_ascii_digit()));
    key.parse::<u32>().ok().filter(|&i| canonical && i != u32::MAX)
}

/// A computed member name's source text with its brackets, as `getText()` gives it (`[KEY]`).
pub fn computed_key_text(key: &PropertyKey, source: &str) -> String {
    use oxc::span::GetSpan;
    let span = key.span();
    let bytes = source.as_bytes();
    let mut start = span.start as usize;
    while start > 0 && bytes[start - 1] != b'[' {
        start -= 1;
    }
    let mut end = span.end as usize;
    while end < bytes.len() && bytes[end] != b']' {
        end += 1;
    }
    source[start.saturating_sub(1)..(end + 1).min(source.len())].to_owned()
}

#[cfg(test)]
mod tests {
    use super::js_number;

    #[test]
    fn numbers_print_as_javascript_does() {
        assert_eq!(js_number(7.0), "7");
        assert_eq!(js_number(-2.0), "-2");
        assert_eq!(js_number(1.5), "1.5");
        assert_eq!(js_number(0.1), "0.1");
        assert_eq!(js_number(1e21), "1e+21");
        assert_eq!(js_number(1e-7), "1e-7");
        assert_eq!(js_number(123456789012.0), "123456789012");
    }
}
