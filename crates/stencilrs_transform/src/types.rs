//! A small model of the TypeScript types a component's props, events and methods carry, and the
//! two printers Stencil runs over them (`typeToString` and `resolveType`/`parseDocsType`,
//! `transformers/transform-utils.ts`).
//!
//! Stencil asks the checker for `complexType.resolved`; here a type annotation is evaluated
//! syntactically (`complex_type.rs`) into a [`Ty`] and printed the way the checker prints it.
//! A type the model does not cover is reported as [`Unsupported`], and the caller flags the
//! member for Stencil's own compiler instead of guessing.

use std::cell::{Cell, RefCell};
use std::collections::{BTreeSet, HashMap};
use std::fmt::Write as _;
use std::rc::Rc;

/// A type the model does not reproduce. The member is reported as not ported yet.
#[derive(Debug, Clone)]
pub struct Unsupported(pub String);

pub type Res<T> = Result<T, Unsupported>;

pub fn unsupported<T>(what: impl Into<String>) -> Res<T> {
    Err(Unsupported(what.into()))
}

/// Type ids. TypeScript sorts a union's members by id (the order the checker created the
/// types), so the order of nested unions follows from it. The intrinsics come first, in the
/// order the checker creates them; everything else is numbered as it is first evaluated.
const ID_UNKNOWN: u32 = 7;
const ID_UNDEFINED: u32 = 8;
const ID_NULL: u32 = 14;
const ID_STRING: u32 = 16;
const ID_NUMBER: u32 = 17;
const ID_BIGINT: u32 = 18;
const ID_FALSE: u32 = 19;
const ID_TRUE: u32 = 21;
const ID_SYMBOL: u32 = 24;
const ID_VOID: u32 = 25;
const ID_NEVER: u32 = 26;
const ID_OBJECT: u32 = 29;
const FIRST_ID: u32 = 100;

/// Ids for the types created while one file (and the modules it imports) is analysed.
#[derive(Default)]
pub struct Registry {
    next: Cell<u32>,
    interned: RefCell<HashMap<String, u32>>,
}

impl Registry {
    pub fn fresh(&self) -> u32 {
        let n = self.next.get();
        self.next.set(n + 1);
        FIRST_ID + n
    }

    /// The id of the type with this identity: one type per key, like the checker's caches.
    pub fn intern(&self, key: &str) -> u32 {
        if let Some(id) = self.interned.borrow().get(key) {
            return *id;
        }
        let id = self.fresh();
        self.interned.borrow_mut().insert(key.to_owned(), id);
        id
    }
}

#[derive(Clone, Debug)]
pub struct Ty(pub Rc<K>);

#[derive(Debug)]
pub enum K {
    Any,
    Unknown,
    Never,
    Void,
    Undefined,
    Null,
    String,
    Number,
    BigInt,
    Symbol,
    /// `object`.
    NonPrimitive,
    /// `false | true` as the printer writes it; never a member of a union.
    Boolean,
    True,
    False,
    /// A literal type and its id.
    Str(String, u32),
    /// A number literal as the checker prints it (`1.5`, `-1`, `16` for `0x10`).
    Num(String, u32),
    /// Member `i` of a union enum.
    EnumLit(Rc<EnumInfo>, usize),
    /// A union enum as a whole.
    Enum(Rc<EnumInfo>),
    /// Members sorted by id and flattened, the alias it was written as, and its origin: the
    /// members it was written with when some of them are named unions (`Mode | undefined`),
    /// which is how the checker prints it.
    Union(Vec<Ty>, Option<Rc<Alias>>, Option<Vec<Ty>>),
    /// `T[]` and `Array<T>`, with its type id.
    Array(Ty, u32),
    /// An interface, class or lib object type, printed by name.
    Ref { name: String, args: Vec<Ty>, id: u32 },
    /// A name the program cannot resolve: `any`, printed by its written name.
    Unresolved { name: String, args: Vec<Ty> },
    Anon(Anon),
    /// A type parameter of an imported generic alias, before substitution.
    Param(usize),
}

#[derive(Debug)]
pub struct Alias {
    pub name: String,
    pub args: Vec<Ty>,
    /// The type id the alias's type was given when the checker created it.
    pub id: u32,
}

#[derive(Debug)]
pub struct Anon {
    pub id: u32,
    pub shape: Shape,
    pub alias: Option<Rc<Alias>>,
}

#[derive(Debug)]
pub enum Shape {
    Object(Vec<Member>),
    Function(Sig),
    Tuple(Vec<TupleElem>),
    /// Printed as is: `{}` for an array without the lib, a template literal.
    Text(String),
    /// A lib mapped type (`Record<K, V>`): always printed by its alias.
    Opaque,
}

#[derive(Debug)]
pub struct Member {
    /// The key as it is printed.
    pub name: String,
    pub optional: bool,
    pub readonly: bool,
    pub kind: MemberKind,
}

#[derive(Debug)]
pub enum MemberKind {
    Prop(Ty),
    Method(Sig),
    Index { param: String, key: Ty, value: Ty },
    Call(Sig),
}

#[derive(Debug)]
pub struct Sig {
    pub params: Vec<Param>,
    pub ret: Ty,
}

#[derive(Debug)]
pub struct Param {
    pub name: String,
    pub optional: bool,
    pub rest: bool,
    pub ty: Ty,
}

#[derive(Debug)]
pub struct TupleElem {
    pub label: Option<String>,
    pub ty: Ty,
    pub optional: bool,
    pub rest: bool,
}

/// A union enum: every member is a literal.
#[derive(Debug)]
pub struct EnumInfo {
    pub name: String,
    /// Member name and whether its value is a string.
    pub members: Vec<(String, bool)>,
    pub base_id: u32,
}

impl Ty {
    pub fn new(k: K) -> Ty {
        Ty(Rc::new(k))
    }

    pub fn any() -> Ty {
        Ty::new(K::Any)
    }

    pub fn id(&self) -> u32 {
        match &*self.0 {
            K::Any | K::Unresolved { .. } | K::Param(_) => 1,
            K::Unknown => ID_UNKNOWN,
            K::Undefined => ID_UNDEFINED,
            K::Null => ID_NULL,
            K::String => ID_STRING,
            K::Number => ID_NUMBER,
            K::BigInt => ID_BIGINT,
            K::False | K::Boolean => ID_FALSE,
            K::True => ID_TRUE,
            K::Symbol => ID_SYMBOL,
            K::Void => ID_VOID,
            K::Never => ID_NEVER,
            K::NonPrimitive => ID_OBJECT,
            K::Str(_, id) | K::Num(_, id) => *id,
            K::EnumLit(e, i) => e.base_id + *i as u32,
            K::Enum(e) => e.base_id + e.members.len() as u32,
            K::Ref { id, .. } => *id,
            K::Anon(a) => a.id,
            // A union's id is the one its alias type was created with; the others are flattened away.
            K::Array(_, id) => *id,
            K::Union(_, alias, _) => alias.as_ref().map_or(u32::MAX, |a| a.id),
        }
    }

    /// Identity for caches and de-duplication.
    pub fn key(&self) -> String {
        match &*self.0 {
            K::Union(ms, _, _) => format!("u[{}]", ms.iter().map(Ty::key).collect::<Vec<_>>().join(",")),
            K::Array(t, _) => format!("a[{}]", t.key()),
            K::Ref { name, args, id } => format!("r{id}:{name}<{}>", args.iter().map(Ty::key).collect::<Vec<_>>().join(",")),
            K::Unresolved { name, args } => format!("x:{name}<{}>", args.iter().map(Ty::key).collect::<Vec<_>>().join(",")),
            K::Enum(e) => format!("e{}", e.base_id),
            K::Param(i) => format!("p{i}"),
            _ => format!("t{}", self.id()),
        }
    }

    pub fn is_any(&self) -> bool {
        matches!(&*self.0, K::Any | K::Unresolved { .. })
    }

    fn is_function(&self) -> bool {
        matches!(&*self.0, K::Anon(a) if matches!(a.shape, Shape::Function(_)))
    }


    /// The type as the alias it was written as, unless it already is one.
    pub fn with_alias(&self, alias: Rc<Alias>) -> Ty {
        match &*self.0 {
            K::Union(ms, None, origin) => Ty::new(K::Union(ms.clone(), Some(alias), origin.clone())),
            K::Anon(a) if a.alias.is_none() => Ty::new(K::Anon(Anon { id: a.id, shape: clone_shape(&a.shape), alias: Some(alias) })),
            _ => self.clone(),
        }
    }
}

fn clone_sig(s: &Sig) -> Sig {
    Sig {
        params: s.params.iter().map(|p| Param { name: p.name.clone(), optional: p.optional, rest: p.rest, ty: p.ty.clone() }).collect(),
        ret: s.ret.clone(),
    }
}

fn clone_shape(s: &Shape) -> Shape {
    match s {
        Shape::Object(ms) => Shape::Object(
            ms.iter()
                .map(|m| Member {
                    name: m.name.clone(),
                    optional: m.optional,
                    readonly: m.readonly,
                    kind: match &m.kind {
                        MemberKind::Prop(t) => MemberKind::Prop(t.clone()),
                        MemberKind::Method(s) => MemberKind::Method(clone_sig(s)),
                        MemberKind::Index { param, key, value } => MemberKind::Index { param: param.clone(), key: key.clone(), value: value.clone() },
                        MemberKind::Call(s) => MemberKind::Call(clone_sig(s)),
                    },
                })
                .collect(),
        ),
        Shape::Function(s) => Shape::Function(clone_sig(s)),
        Shape::Tuple(es) => Shape::Tuple(es.iter().map(|e| TupleElem { label: e.label.clone(), ty: e.ty.clone(), optional: e.optional, rest: e.rest }).collect()),
        Shape::Text(t) => Shape::Text(t.clone()),
        Shape::Opaque => Shape::Opaque,
    }
}

/// The named unions among the types a union is made of (`addNamedUnions`): those with an alias,
/// and the named parts of those made from named parts.
fn named_unions(types: &[Ty], out: &mut Vec<Ty>) {
    for t in types {
        if let K::Union(_, alias, origin) = &*t.0 {
            if alias.is_some() {
                if !out.iter().any(|o| Rc::ptr_eq(&o.0, &t.0)) {
                    out.push(t.clone());
                }
            } else if let Some(origin) = origin {
                named_unions(origin, out);
            }
        }
    }
}

/// `getUnionType` with literal reduction. `strict` is `strictNullChecks`: without it `null` and
/// `undefined` vanish from a union that has other members.
pub fn union_of(types: Vec<Ty>, strict: bool, alias: Option<Rc<Alias>>) -> Ty {
    if types.iter().any(contains_param) {
        // A generic alias's definition: put together once its parameters are known (`Subst`).
        let mut seen: Vec<String> = Vec::new();
        let kept: Vec<Ty> = types
            .into_iter()
            .filter(|t| {
                let key = t.key();
                let new = !seen.contains(&key);
                seen.push(key);
                new
            })
            .collect();
        return Ty::new(K::Union(kept, alias, None));
    }
    let mut flat: Vec<Ty> = Vec::new();
    for t in &types {
        match &*t.0 {
            K::Union(ms, _, _) => flat.extend(ms.iter().cloned()),
            K::Enum(e) => flat.extend((0..e.members.len()).map(|i| Ty::new(K::EnumLit(e.clone(), i)))),
            _ => flat.push(t.clone()),
        }
    }
    if flat.iter().any(Ty::is_any) {
        // The checker keeps the error type of an unresolved name; either prints as `any`.
        return Ty::any();
    }
    if flat.iter().any(|t| matches!(&*t.0, K::Unknown)) {
        return Ty::new(K::Unknown);
    }
    flat.retain(|t| !matches!(&*t.0, K::Never));
    if !strict {
        let has_null = flat.iter().any(|t| matches!(&*t.0, K::Null));
        let has_undefined = flat.iter().any(|t| matches!(&*t.0, K::Undefined));
        let others = flat.iter().any(|t| !matches!(&*t.0, K::Null | K::Undefined));
        if others {
            flat.retain(|t| !matches!(&*t.0, K::Null | K::Undefined));
        } else if has_null {
            return Ty::new(K::Null);
        } else if has_undefined {
            return Ty::new(K::Undefined);
        }
    }
    // `removeRedundantLiteralTypes`: a primitive absorbs its literals, `void` absorbs `undefined`.
    let has = |f: &dyn Fn(&K) -> bool, flat: &[Ty]| flat.iter().any(|t| f(&t.0));
    // (bigint literal types fall back to Stencil, so `bigint` has none to absorb.)
    let (string, number, void) = (
        has(&|k| matches!(k, K::String), &flat),
        has(&|k| matches!(k, K::Number), &flat),
        has(&|k| matches!(k, K::Void), &flat),
    );
    flat.retain(|t| match &*t.0 {
        K::Str(..) => !string,
        K::Num(..) => !number,
        K::EnumLit(e, i) => !(if e.members[*i].1 { string } else { number }),
        K::Undefined => !void,
        _ => true,
    });
    flat.sort_by_key(Ty::id);
    flat.dedup_by_key(|t| t.id());
    match flat.len() {
        0 => return Ty::new(K::Never),
        1 => return flat.remove(0),
        _ => {}
    }

    // A union made from named unions is printed by them: `Mode | undefined`, not `"a" | "b" | undefined`.
    let mut origin = None;
    if types.iter().any(|t| matches!(&*t.0, K::Union(..))) {
        let mut named = Vec::new();
        named_unions(&types, &mut named);
        let covered = |t: &Ty| {
            named.iter().any(|u| match &*u.0 {
                K::Union(ms, _, _) => ms.iter().any(|m| m.id() == t.id()),
                _ => false,
            })
        };
        let reduced: Vec<Ty> = flat.iter().filter(|t| !covered(t)).cloned().collect();
        if alias.is_none() && named.len() == 1 && reduced.is_empty() {
            return named.remove(0);
        }
        let named_members: usize = named.iter().map(|u| if let K::Union(ms, _, _) = &*u.0 { ms.len() } else { 0 }).sum();
        if !named.is_empty() && named_members + reduced.len() == flat.len() {
            let mut parts = reduced;
            parts.extend(named);
            parts.sort_by_key(Ty::id);
            origin = Some(parts);
        }
    }
    Ty::new(K::Union(flat, alias, origin))
}

/// `boolean`.
pub fn boolean() -> Ty {
    Ty::new(K::Union(vec![Ty::new(K::False), Ty::new(K::True)], None, None))
}

/// `"text"` the way the printer writes a string literal type (`escapeNonAsciiString`).
pub fn quote(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{b}' => out.push_str("\\v"),
            '\u{c}' => out.push_str("\\f"),
            '\u{8}' => out.push_str("\\b"),
            '\0' => out.push_str("\\0"),
            c if c.is_ascii() && !c.is_ascii_control() => out.push(c),
            c => {
                let mut buf = [0u16; 2];
                for unit in c.encode_utf16(&mut buf) {
                    let _ = write!(out, "\\u{unit:04X}");
                }
            }
        }
    }
    out.push('"');
    out
}

/// A numeric literal as JavaScript prints its value (`0x10` → `16`, `1.50` → `1.5`).
pub fn js_number(text: &str) -> Option<String> {
    let t = text.replace('_', "");
    let value: f64 = if let Some(h) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
        u64::from_str_radix(h, 16).ok()? as f64
    } else if let Some(b) = t.strip_prefix("0b").or_else(|| t.strip_prefix("0B")) {
        u64::from_str_radix(b, 2).ok()? as f64
    } else if let Some(o) = t.strip_prefix("0o").or_else(|| t.strip_prefix("0O")) {
        u64::from_str_radix(o, 8).ok()? as f64
    } else {
        t.parse().ok()?
    };
    if !value.is_finite() || value.abs() >= 1e21 || (value != 0.0 && value.abs() < 1e-6) {
        return None;
    }
    Some(format!("{value}"))
}

fn is_identifier(s: &str) -> bool {
    let mut chars = s.chars();
    chars.next().is_some_and(|c| c == '_' || c == '$' || c.is_alphabetic()) && chars.all(|c| c == '_' || c == '$' || c.is_alphanumeric())
}

/// A property name as the printer writes it.
pub fn property_name(name: &str) -> String {
    if is_identifier(name) || name.parse::<u64>().is_ok_and(|n| n.to_string() == name) { name.to_owned() } else { quote(name) }
}

/// `typeToString`, collecting the names it prints as type references.
#[derive(Default)]
pub struct Printer {
    pub names: Vec<String>,
}

impl Printer {
    /// `top`: the outermost type of `typeToString(…, InTypeAlias)`, which prints an alias's
    /// definition instead of its name.
    pub fn print(&mut self, ty: &Ty, top: bool) -> Res<String> {
        Ok(match &*ty.0 {
            K::Any => "any".into(),
            K::Unknown => "unknown".into(),
            K::Never => "never".into(),
            K::Void => "void".into(),
            K::Undefined => "undefined".into(),
            K::Null => "null".into(),
            K::String => "string".into(),
            K::Number => "number".into(),
            K::BigInt => "bigint".into(),
            K::Symbol => "symbol".into(),
            K::NonPrimitive => "object".into(),
            K::Boolean => "boolean".into(),
            K::True => "true".into(),
            K::False => "false".into(),
            K::Str(s, _) => quote(s),
            K::Num(n, _) => n.clone(),
            K::EnumLit(e, i) => {
                self.names.push(e.name.clone());
                format!("{}.{}", e.name, e.members[*i].0)
            }
            K::Enum(e) => {
                self.names.push(e.name.clone());
                e.name.clone()
            }
            K::Union(ms, alias, origin) => match alias {
                Some(a) if !top => self.alias(a)?,
                _ => self.union(origin.as_deref().unwrap_or(ms))?,
            },
            K::Array(el, _) => {
                let inner = self.print(el, false)?;
                if matches!(&*el.0, K::Union(ms, None, origin) if self.formatted_len(origin.as_deref().unwrap_or(ms)) > 1) || el.is_function() { format!("({inner})[]") } else { format!("{inner}[]") }
            }
            K::Ref { name, args, .. } | K::Unresolved { name, args } => {
                self.names.push(name.clone());
                self.generic(name, args)?
            }
            K::Anon(a) => match &a.alias {
                Some(alias) if !top => self.alias(alias)?,
                _ => self.shape(&a.shape)?,
            },
            K::Param(_) => return unsupported("an unresolved type parameter"),
        })
    }

    fn generic(&mut self, name: &str, args: &[Ty]) -> Res<String> {
        if args.is_empty() {
            return Ok(name.to_owned());
        }
        let printed: Res<Vec<String>> = args.iter().map(|a| self.print(a, false)).collect();
        Ok(format!("{name}<{}>", printed?.join(", ")))
    }

    fn alias(&mut self, alias: &Alias) -> Res<String> {
        self.names.push(alias.name.clone());
        self.generic(&alias.name, &alias.args)
    }

    /// The members of a union after `formatUnionTypes`: `true | false` is `boolean`, a whole
    /// enum is its name, `null` and `undefined` come last.
    fn format_union(&mut self, ms: &[Ty]) -> Vec<Ty> {
        let mut out: Vec<Ty> = Vec::new();
        let (mut null, mut undefined) = (false, false);
        let mut i = 0;
        while i < ms.len() {
            let m = &ms[i];
            match &*m.0 {
                K::Null => null = true,
                K::Undefined => undefined = true,
                K::False if matches!(ms.get(i + 1).map(|t| &*t.0), Some(K::True)) => {
                    out.push(Ty::new(K::Boolean));
                    i += 1;
                }
                K::EnumLit(e, 0) if i + e.members.len() <= ms.len() && matches!(&*ms[i + e.members.len() - 1].0, K::EnumLit(e2, j) if Rc::ptr_eq(e, e2) && *j == e.members.len() - 1) => {
                    out.push(Ty::new(K::Enum(e.clone())));
                    i += e.members.len() - 1;
                }
                _ => out.push(m.clone()),
            }
            i += 1;
        }
        if null {
            out.push(Ty::new(K::Null));
        }
        if undefined {
            out.push(Ty::new(K::Undefined));
        }
        out
    }

    fn formatted_len(&mut self, ms: &[Ty]) -> usize {
        self.format_union(ms).len()
    }

    fn union(&mut self, ms: &[Ty]) -> Res<String> {
        let formatted = self.format_union(ms);
        let mut parts = Vec::new();
        for m in &formatted {
            let p = self.print(m, false)?;
            parts.push(if m.is_function() { format!("({p})") } else { p });
        }
        Ok(parts.join(" | "))
    }

    fn shape(&mut self, shape: &Shape) -> Res<String> {
        match shape {
            Shape::Text(t) => Ok(t.clone()),
            Shape::Opaque => unsupported("a mapped type printed structurally"),
            Shape::Function(sig) => Ok(format!("{} => {}", self.params(&sig.params)?, self.print(&sig.ret, false)?)),
            Shape::Tuple(elems) => {
                let mut parts = Vec::new();
                for e in elems {
                    let t = self.print(&e.ty, false)?;
                    let mut p = String::new();
                    if e.rest {
                        p.push_str("...");
                    }
                    if let Some(l) = &e.label {
                        p.push_str(l);
                        p.push_str(if e.optional { "?: " } else { ": " });
                        p.push_str(&t);
                    } else {
                        p.push_str(&t);
                        if e.optional {
                            p.push('?');
                        }
                    }
                    parts.push(p);
                }
                Ok(format!("[{}]", parts.join(", ")))
            }
            Shape::Object(members) => {
                if members.is_empty() {
                    return Ok("{}".into());
                }
                // An object type that is only one call signature prints as a function type.
                if let [Member { kind: MemberKind::Call(sig), .. }] = members.as_slice() {
                    return Ok(format!("{} => {}", self.params(&sig.params)?, self.print(&sig.ret, false)?));
                }
                // Call signatures, then index signatures, then the properties in order.
                let mut ordered: Vec<&Member> = members.iter().filter(|m| matches!(m.kind, MemberKind::Call(_))).collect();
                ordered.extend(members.iter().filter(|m| matches!(m.kind, MemberKind::Index { .. })));
                ordered.extend(members.iter().filter(|m| matches!(m.kind, MemberKind::Prop(_) | MemberKind::Method(_))));
                let mut out = String::from("{ ");
                for m in ordered {
                    if m.readonly {
                        out.push_str("readonly ");
                    }
                    match &m.kind {
                        MemberKind::Prop(t) => {
                            let _ = write!(out, "{}{}: {};", m.name, if m.optional { "?" } else { "" }, self.print(t, false)?);
                        }
                        MemberKind::Method(sig) => {
                            let _ = write!(out, "{}{}{}: {};", m.name, if m.optional { "?" } else { "" }, self.params(&sig.params)?, self.print(&sig.ret, false)?);
                        }
                        MemberKind::Call(sig) => {
                            let _ = write!(out, "{}: {};", self.params(&sig.params)?, self.print(&sig.ret, false)?);
                        }
                        MemberKind::Index { param, key, value } => {
                            let _ = write!(out, "[{param}: {}]: {};", self.print(key, false)?, self.print(value, false)?);
                        }
                    }
                    out.push(' ');
                }
                out.push('}');
                Ok(out)
            }
        }
    }

    fn params(&mut self, params: &[Param]) -> Res<String> {
        let mut parts = Vec::new();
        for p in params {
            let t = self.print(&p.ty, false)?;
            parts.push(format!("{}{}{}: {t}", if p.rest { "..." } else { "" }, p.name, if p.optional { "?" } else { "" }));
        }
        Ok(format!("({})", parts.join(", ")))
    }
}

/// `typeToString(type)` with Stencil's flags.
pub fn type_to_string(ty: &Ty) -> Res<String> {
    Printer::default().print(ty, true)
}

/// `parseDocsType`: the parts `resolveType` sorts and joins.
fn parse_docs_type(ty: &Ty, parts: &mut BTreeSet<String>) -> Res<()> {
    match &*ty.0 {
        K::Union(ms, _, _) => {
            for m in ms {
                parse_docs_type(m, parts)?;
            }
        }
        K::Enum(e) => {
            for (name, _) in &e.members {
                parts.insert(format!("{}.{name}", e.name));
            }
        }
        K::Array(el, _) => {
            let mut inner = BTreeSet::new();
            parse_docs_type(el, &mut inner)?;
            let has_true = inner.remove("true");
            let has_false = inner.remove("false");
            if has_true || has_false {
                inner.insert("boolean".into());
            }
            let joined = inner.iter().cloned().collect::<Vec<_>>().join(" | ");
            parts.insert(if inner.len() > 1 { format!("({joined})[]") } else { format!("{joined}[]") });
        }
        K::Anon(Anon { alias: Some(alias), .. }) if !alias.args.is_empty() => {
            for arg in &alias.args {
                parse_docs_type(arg, parts)?;
            }
        }
        K::Unresolved { args, .. } if !args.is_empty() => {
            for arg in args {
                parse_docs_type(arg, parts)?;
            }
        }
        _ => {
            parts.insert(type_to_string(ty)?);
        }
    }
    Ok(())
}

/// `resolveType` for a type that is not written as `T[]`.
pub fn resolve_type(ty: &Ty) -> Res<String> {
    let mut set = BTreeSet::new();
    parse_docs_type(ty, &mut set)?;
    let has_true = set.remove("true");
    let has_false = set.remove("false");
    if has_true || has_false {
        set.insert("boolean".into());
    }
    let mut parts: Vec<String> = set.into_iter().collect();
    if parts.len() > 1 {
        parts = parts.into_iter().map(|p| if p.contains("=>") { format!("({p})") } else { p }).collect();
    }
    Ok(parts.join(" | "))
}

/// Whether a nested union lists its members in an order only the whole program determines:
/// TypeScript sorts them by type id, which is the order the checker first created the types in,
/// and for literals and object types that depends on every file it looked at before. A union
/// printed inside another type with more than one such member is such a case.
pub fn order_depends_on_program(ty: &Ty) -> bool {
    order_depends(ty, false)
}

fn order_depends(ty: &Ty, whole: bool) -> bool {
    // Members of the same enum are created together, so they count once.
    fn free(ms: &[Ty]) -> usize {
        let mut enums: Vec<*const EnumInfo> = Vec::new();
        let mut count = 0;
        for m in ms {
            match &*m.0 {
                K::EnumLit(e, _) => {
                    let p = Rc::as_ptr(e);
                    if !enums.contains(&p) {
                        enums.push(p);
                        count += 1;
                    }
                }
                _ if m.id() >= FIRST_ID => count += 1,
                _ => {}
            }
        }
        count
    }
    // `nested`: the union is printed as part of another type (so its members are in id order);
    // `top`: this is the type `typeToString` was called with, which prints an alias's definition.
    fn walk(ty: &Ty, nested: bool, top: bool) -> bool {
        match &*ty.0 {
            K::Union(ms, alias, origin) => {
                let shown = origin.as_deref().unwrap_or(ms);
                if alias.is_some() && nested && !top {
                    // The alias is printed by name, but its object members are still ordered by
                    // when the checker first built them, which is not the order they are written in.
                    return shown.iter().filter(|m| matches!(&*m.0, K::Anon(_))).count() > 1;
                }
                (nested && free(shown) > 1) || shown.iter().any(|m| walk(m, true, false))
            }
            K::Array(t, _) => walk(t, nested, false),
            K::Ref { args, .. } | K::Unresolved { args, .. } => args.iter().any(|a| walk(a, true, false)),
            K::Anon(a) => {
                if a.alias.is_some() && nested && !top {
                    return false;
                }
                match &a.shape {
                    Shape::Object(ms) => ms.iter().any(|m| match &m.kind {
                        MemberKind::Prop(t) => walk(t, true, false),
                        MemberKind::Method(s) | MemberKind::Call(s) => sig_depends(s),
                        MemberKind::Index { key, value, .. } => walk(key, true, false) || walk(value, true, false),
                    }),
                    Shape::Function(s) => sig_depends(s),
                    Shape::Tuple(es) => es.iter().any(|e| walk(&e.ty, true, false)),
                    _ => false,
                }
            }
            _ => false,
        }
    }
    fn sig_depends(s: &Sig) -> bool {
        s.params.iter().any(|p| walk(&p.ty, true, false)) || walk(&s.ret, true, false)
    }
    // `resolveType` takes the top-level union apart and sorts the parts as text, so only
    // unions nested in what is printed count.
    match &*ty.0 {
        _ if whole => walk(ty, true, true),
        K::Union(ms, _, origin) => origin.as_deref().unwrap_or(ms).iter().any(|m| walk(m, true, false)),
        _ => walk(ty, false, true),
    }
}

/// Replaces the type parameters (`K::Param`) of a generic alias's definition.
pub struct Subst<'r> {
    pub reg: &'r Registry,
    pub strict: bool,
    pub args: &'r [Ty],
}

pub fn contains_param(ty: &Ty) -> bool {
    match &*ty.0 {
        K::Param(_) => true,
        K::Union(ms, alias, _) => ms.iter().any(contains_param) || alias.as_ref().is_some_and(|a| a.args.iter().any(contains_param)),
        K::Array(t, _) => contains_param(t),
        K::Ref { args, .. } | K::Unresolved { args, .. } => args.iter().any(contains_param),
        K::Anon(a) => {
            a.alias.as_ref().is_some_and(|al| al.args.iter().any(contains_param))
                || match &a.shape {
                    Shape::Object(ms) => ms.iter().any(|m| match &m.kind {
                        MemberKind::Prop(t) => contains_param(t),
                        MemberKind::Method(s) | MemberKind::Call(s) => sig_has_param(s),
                        MemberKind::Index { key, value, .. } => contains_param(key) || contains_param(value),
                    }),
                    Shape::Function(s) => sig_has_param(s),
                    Shape::Tuple(es) => es.iter().any(|e| contains_param(&e.ty)),
                    _ => false,
                }
        }
        _ => false,
    }
}

fn sig_has_param(s: &Sig) -> bool {
    s.params.iter().any(|p| contains_param(&p.ty)) || contains_param(&s.ret)
}

impl Subst<'_> {
    pub fn apply(&self, ty: &Ty) -> Ty {
        if !contains_param(ty) {
            return ty.clone();
        }
        match &*ty.0 {
            K::Param(i) => self.args.get(*i).cloned().unwrap_or_else(Ty::any),
            K::Union(ms, alias, _) => union_of(ms.iter().map(|m| self.apply(m)).collect(), self.strict, self.alias(alias)),
            K::Array(t, _) => {
                let el = self.apply(t);
                let id = self.reg.intern(&format!("array<{}>", el.key()));
                Ty::new(K::Array(el, id))
            }
            K::Ref { name, args, .. } => {
                let args: Vec<Ty> = args.iter().map(|a| self.apply(a)).collect();
                let id = self.reg.intern(&format!("ref {name}<{}>", args.iter().map(Ty::key).collect::<Vec<_>>().join(",")));
                Ty::new(K::Ref { name: name.clone(), args, id })
            }
            K::Unresolved { name, args } => Ty::new(K::Unresolved { name: name.clone(), args: args.iter().map(|a| self.apply(a)).collect() }),
            K::Anon(a) => {
                let shape = match &a.shape {
                    Shape::Object(ms) => Shape::Object(ms.iter().map(|m| Member { name: m.name.clone(), optional: m.optional, readonly: m.readonly, kind: self.member(&m.kind) }).collect()),
                    Shape::Function(s) => Shape::Function(self.sig(s)),
                    Shape::Tuple(es) => Shape::Tuple(es.iter().map(|e| TupleElem { label: e.label.clone(), ty: self.apply(&e.ty), optional: e.optional, rest: e.rest }).collect()),
                    other => clone_shape(other),
                };
                Ty::new(K::Anon(Anon { id: self.reg.fresh(), shape, alias: self.alias(&a.alias) }))
            }
            _ => ty.clone(),
        }
    }

    fn alias(&self, alias: &Option<Rc<Alias>>) -> Option<Rc<Alias>> {
        alias.as_ref().map(|a| Rc::new(Alias { name: a.name.clone(), args: a.args.iter().map(|t| self.apply(t)).collect(), id: self.reg.fresh() }))
    }

    fn sig(&self, s: &Sig) -> Sig {
        Sig {
            params: s.params.iter().map(|p| Param { name: p.name.clone(), optional: p.optional, rest: p.rest, ty: self.apply(&p.ty) }).collect(),
            ret: self.apply(&s.ret),
        }
    }

    fn member(&self, kind: &MemberKind) -> MemberKind {
        match kind {
            MemberKind::Prop(t) => MemberKind::Prop(self.apply(t)),
            MemberKind::Method(s) => MemberKind::Method(self.sig(s)),
            MemberKind::Call(s) => MemberKind::Call(self.sig(s)),
            MemberKind::Index { param, key, value } => MemberKind::Index { param: param.clone(), key: self.apply(key), value: self.apply(value) },
        }
    }
}

/// `order_depends_on_program` for a type printed whole (`typeToString`), where the top-level
/// union is in id order too.
pub fn print_order_depends_on_program(ty: &Ty) -> bool {
    order_depends(ty, true)
}
