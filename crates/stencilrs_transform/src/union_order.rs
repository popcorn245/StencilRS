//! The order of a union's members under TypeScript's `stableTypeOrdering` option (the only order
//! TypeScript 7 has): `compareTypes` and its helpers (`compareTypeNames`, `compareSymbols`,
//! `compareTypeLists`, `compareTupleTypes`) instead of the type ids the checker happened to hand
//! out. The order is a function of the types alone.
//!
//! The comparator reaches for things the model does not have: the declaration position of two
//! anonymous object types, whether two types of the same name are the same symbol, the node of a
//! deferred array type, the final `t1.id - t2.id`. Wherever it would, [`compare`] answers `None`
//! and the caller reports `stencilrs:` (Stencil's own compiler decides) instead of guessing.

use crate::types::{Alias, Anon, K, Shape, Ty};
use rustc_hash::{FxHashMap, FxHashSet};
use std::cell::RefCell;
use std::cmp::Ordering;

/// What the comparator knows beyond the types themselves, for the registry (one program) that
/// is being analysed on this thread.
#[derive(Default)]
struct State {
    generation: u64,
    on: bool,
    /// The declaration a type id's name comes from (`file::Name`, `lib Name`): two types with the
    /// same name are the same symbol only when these are equal.
    symbols: FxHashMap<u32, String>,
    /// Array and tuple types written inside a type alias's definition. The checker defers their
    /// resolution (`isDeferredTypeReferenceNode`) and then orders them by their nodes.
    born_in_alias: FxHashSet<u32>,
    alias_depth: u32,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

/// Makes `generation` the registry the thread-local state describes (dropping what it knew about
/// another one), with the option as the program sets it.
pub fn activate(generation: u64, on: bool) {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        if s.generation != generation {
            *s = State {
                generation,
                ..State::default()
            };
        }
        s.on = on;
    });
}

pub fn enabled() -> bool {
    STATE.with(|s| s.borrow().on)
}

fn touch<R>(generation: u64, f: impl FnOnce(&mut State) -> R) -> R {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        if s.generation != generation {
            *s = State {
                generation,
                ..State::default()
            };
        }
        f(&mut s)
    })
}

pub fn set_symbol(generation: u64, id: u32, key: String) {
    touch(generation, |s| {
        s.symbols.insert(id, key);
    });
}

pub fn copy_symbol(generation: u64, from: u32, to: u32) {
    touch(generation, |s| {
        if let Some(k) = s.symbols.get(&from).cloned() {
            s.symbols.insert(to, k);
        }
    });
}

pub fn enter_alias(generation: u64) {
    touch(generation, |s| s.alias_depth += 1);
}

pub fn leave_alias(generation: u64) {
    touch(generation, |s| {
        s.alias_depth = s.alias_depth.saturating_sub(1)
    });
}

/// Notes an array or tuple type created now, which is deferred when inside an alias definition.
pub fn note_created(generation: u64, id: u32) {
    touch(generation, |s| {
        if s.alias_depth > 0 {
            s.born_in_alias.insert(id);
        }
    });
}

/// An instantiation of a deferred type stays deferred.
pub fn copy_born(generation: u64, from: u32, to: u32) {
    touch(generation, |s| {
        if s.born_in_alias.contains(&from) {
            s.born_in_alias.insert(to);
        }
    });
}

fn symbol_of(id: u32) -> Option<String> {
    STATE.with(|s| s.borrow().symbols.get(&id).cloned())
}

fn is_deferred(id: u32) -> bool {
    STATE.with(|s| s.borrow().born_in_alias.contains(&id))
}

// TypeFlags (TypeScript 6.0).
const ANY: u32 = 1;
const UNKNOWN: u32 = 2;
const UNDEFINED: u32 = 4;
const NULL: u32 = 8;
const VOID: u32 = 16;
const STRING: u32 = 32;
const NUMBER: u32 = 64;
const BIGINT: u32 = 128;
const BOOLEAN: u32 = 256;
const ES_SYMBOL: u32 = 512;
const STRING_LITERAL: u32 = 1024;
const NUMBER_LITERAL: u32 = 2048;
const BOOLEAN_LITERAL: u32 = 8192;
const ENUM: u32 = 65536;
const NON_PRIMITIVE: u32 = 131072;
const NEVER: u32 = 262144;
const TYPE_PARAMETER: u32 = 524288;
const OBJECT: u32 = 1048576;
const UNION: u32 = 134217728;
const INTERSECTION: u32 = 268435456;

fn is_boolean_union(ms: &[Ty]) -> bool {
    matches!(ms, [a, b] if matches!(&*a.0, K::False) && matches!(&*b.0, K::True))
}

/// `getSortOrderFlags`; `None` for a type whose flags the model cannot tell (a template literal).
fn sort_flags(t: &Ty) -> Option<u32> {
    Some(match &*t.0 {
        K::Any | K::Unresolved { .. } | K::Param(_) => ANY,
        K::Unknown => UNKNOWN,
        K::Undefined => UNDEFINED,
        K::Null => NULL,
        K::Void => VOID,
        K::String => STRING,
        K::Number => NUMBER,
        K::BigInt => BIGINT,
        K::Boolean => UNION | BOOLEAN,
        K::Symbol => ES_SYMBOL,
        K::Str(..) => STRING_LITERAL,
        K::Num(..) => NUMBER_LITERAL,
        K::True | K::False => BOOLEAN_LITERAL,
        K::EnumLit(..) => ENUM,
        K::Enum(_) => return None,
        K::NonPrimitive => NON_PRIMITIVE,
        K::Never => NEVER,
        K::TypeParam(..) => TYPE_PARAMETER,
        K::Ref { .. } | K::Array(..) => OBJECT,
        K::Union(ms, _, _) => {
            if is_boolean_union(ms) {
                UNION | BOOLEAN
            } else {
                UNION
            }
        }
        K::Anon(a) => match &a.shape {
            Shape::Intersection(_) => INTERSECTION,
            Shape::Text(_) => return None,
            _ => OBJECT,
        },
    })
}

/// The symbol `getTypeNameSymbol` finds: its name, the declaration it is (when known) and the
/// alias type arguments the type carries.
struct Name<'a> {
    name: &'a str,
    symbol: Option<String>,
    alias_args: Option<&'a [Ty]>,
}

fn alias_name(a: &Alias) -> Name<'_> {
    Name {
        name: &a.name,
        symbol: symbol_of(a.id),
        alias_args: if a.args.is_empty() && a.declared.is_empty() {
            None
        } else {
            Some(&a.args)
        },
    }
}

fn name_of(t: &Ty) -> Option<Name<'_>> {
    match &*t.0 {
        K::Union(_, Some(a), _) => Some(alias_name(a)),
        K::Anon(Anon { alias: Some(a), .. }) => Some(alias_name(a)),
        K::Ref { name, id, .. } => Some(Name {
            name,
            symbol: symbol_of(*id),
            alias_args: None,
        }),
        K::Array(..) => Some(Name {
            name: "Array",
            symbol: Some("lib Array".into()),
            alias_args: None,
        }),
        K::TypeParam(name, id) => Some(Name {
            name,
            symbol: Some(format!("type parameter {id}")),
            alias_args: None,
        }),
        _ => None,
    }
}

/// JavaScript's `<` on strings: by UTF-16 code unit.
fn cmp_js(a: &str, b: &str) -> Ordering {
    a.encode_utf16().cmp(b.encode_utf16())
}

/// `compareTypeLists`.
fn compare_lists(a: &[Ty], b: &[Ty]) -> Option<Ordering> {
    if a.len() != b.len() {
        return Some(a.len().cmp(&b.len()));
    }
    for (x, y) in a.iter().zip(b) {
        match compare(x, y)? {
            Ordering::Equal => {}
            o => return Some(o),
        }
    }
    Some(Ordering::Equal)
}

fn same_type(a: &Ty, b: &Ty) -> bool {
    std::rc::Rc::ptr_eq(&a.0, &b.0)
        || (std::mem::discriminant(&*a.0) == std::mem::discriminant(&*b.0) && a.key() == b.key())
}

/// `compareTypes`, or `None` where the answer needs something the model does not have.
pub fn compare(a: &Ty, b: &Ty) -> Option<Ordering> {
    if same_type(a, b) {
        return Some(Ordering::Equal);
    }
    let (fa, fb) = (sort_flags(a)?, sort_flags(b)?);
    if fa != fb {
        return Some(fa.cmp(&fb));
    }
    // `compareTypeNames`.
    let mut same_symbol = false;
    match (name_of(a), name_of(b)) {
        (None, None) => {}
        (None, Some(_)) => return Some(Ordering::Greater),
        (Some(_), None) => return Some(Ordering::Less),
        (Some(x), Some(y)) => {
            if x.name != y.name {
                return Some(cmp_js(x.name, y.name));
            }
            // The same name: the same symbol only when both are known to be.
            match (&x.symbol, &y.symbol) {
                (Some(s), Some(t)) if s == t => same_symbol = true,
                _ => return None,
            }
            match (x.alias_args, y.alias_args) {
                (Some(p), Some(q)) => match compare_lists(p, q)? {
                    Ordering::Equal => {}
                    o => return Some(o),
                },
                (None, None) => {}
                _ => return None,
            }
        }
    }
    match (&*a.0, &*b.0) {
        (K::Str(x, _), K::Str(y, _)) => Some(cmp_js(x, y)),
        (K::Num(x, _), K::Num(y, _)) => {
            let (x, y): (f64, f64) = (x.parse().ok()?, y.parse().ok()?);
            x.partial_cmp(&y)
        }
        (K::False, K::True) => Some(Ordering::Less),
        (K::True, K::False) => Some(Ordering::Greater),
        (K::EnumLit(e1, i), K::EnumLit(e2, j)) if std::rc::Rc::ptr_eq(e1, e2) => Some(i.cmp(j)),
        // Two enums: ordered by where they are declared, which the model does not know.
        (K::EnumLit(..), K::EnumLit(..)) => None,
        // Same flags and nothing else to tell them apart: the same intrinsic type.
        (
            K::Any
            | K::Unresolved { .. }
            | K::Unknown
            | K::Undefined
            | K::Null
            | K::Void
            | K::String
            | K::Number
            | K::BigInt
            | K::Symbol
            | K::NonPrimitive
            | K::Never,
            _,
        ) => Some(Ordering::Equal),
        (K::Union(x, _, ox), K::Union(y, _, oy)) => {
            if ox.is_some() || oy.is_some() {
                return None;
            }
            match compare_lists(x, y)? {
                Ordering::Equal => None,
                o => Some(o),
            }
        }
        // Object types. Reached with the same flags and either the same symbol or no name.
        (K::Array(x, ix), K::Array(y, iy)) if same_symbol => {
            if is_deferred(*ix) || is_deferred(*iy) {
                return None;
            }
            match compare(x, y)? {
                Ordering::Equal => None,
                o => Some(o),
            }
        }
        (K::Ref { args: x, .. }, K::Ref { args: y, .. }) if same_symbol => {
            match compare_lists(x, y)? {
                Ordering::Equal => None,
                o => Some(o),
            }
        }
        (K::Anon(x), K::Anon(y)) => compare_anon(x, y, same_symbol),
        _ => None,
    }
}

/// The element types of a tuple with only required elements, and its labels.
fn plain_tuple(a: &Anon) -> Option<(Vec<Ty>, Vec<Option<&str>>)> {
    let Shape::Tuple(es) = &a.shape else {
        return None;
    };
    if es.iter().any(|e| e.optional || e.rest) {
        return None;
    }
    Some((
        es.iter().map(|e| e.ty.clone()).collect(),
        es.iter().map(|e| e.label.as_deref()).collect(),
    ))
}

fn compare_anon(x: &Anon, y: &Anon, same_symbol: bool) -> Option<Ordering> {
    let (tx, ty) = (
        matches!(x.shape, Shape::Tuple(_)),
        matches!(y.shape, Shape::Tuple(_)),
    );
    match (tx, ty) {
        (true, true) => {
            if is_deferred(x.id) || is_deferred(y.id) {
                return None;
            }
            let ((ex, lx), (ey, ly)) = (plain_tuple(x)?, plain_tuple(y)?);
            // `compareTupleTypes`: the number of elements, then their flags (all required), then
            // the labels of the first, and then the element types.
            if ex.len() != ey.len() {
                return Some(ex.len().cmp(&ey.len()));
            }
            if lx.iter().any(Option::is_some) != ly.iter().any(Option::is_some)
                || lx.iter().any(Option::is_some) != lx.iter().all(Option::is_some)
                || ly.iter().any(Option::is_some) != ly.iter().all(Option::is_some)
            {
                return None;
            }
            for (p, q) in lx.iter().zip(&ly) {
                if let (Some(p), Some(q)) = (p, q) {
                    match cmp_js(p, q) {
                        Ordering::Equal => {}
                        o => return Some(o),
                    }
                }
            }
            match compare_lists(&ex, &ey)? {
                Ordering::Equal => None,
                o => Some(o),
            }
        }
        // `compareSymbols` puts a type with no symbol (a tuple) after one with a symbol.
        (false, true) if !same_symbol && is_unnamed_object(x) => Some(Ordering::Less),
        (true, false) if !same_symbol && is_unnamed_object(y) => Some(Ordering::Greater),
        _ => None,
    }
}

/// An anonymous object type (a type literal or function type) without an alias.
fn is_unnamed_object(a: &Anon) -> bool {
    a.alias.is_none()
        && matches!(
            a.shape,
            Shape::Object(_) | Shape::Function(_) | Shape::Opaque
        )
}

/// Whether the order of a union's members is decided for every pair of them.
pub fn decidable(members: &[Ty]) -> bool {
    for (i, a) in members.iter().enumerate() {
        for b in &members[i + 1..] {
            if compare(a, b).is_none() {
                return false;
            }
        }
    }
    true
}

/// Sorts members the way `stableTypeOrdering` does, as far as the comparator can tell (the order
/// of two members it cannot compare is by id; [`decidable`] says whether that happened).
pub fn sort(members: &mut [Ty]) {
    members.sort_by(|a, b| compare(a, b).unwrap_or_else(|| a.id().cmp(&b.id())));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EnumInfo, Sig, union_of};
    use std::rc::Rc;

    fn on() {
        activate(u64::MAX, true);
    }

    fn lit(s: &str, id: u32) -> Ty {
        Ty::new(K::Str(s.into(), id))
    }

    fn named(name: &str, id: u32) -> Ty {
        set_symbol(u64::MAX, id, format!("test::{name}"));
        Ty::new(K::Ref {
            name: name.into(),
            args: Vec::new(),
            id,
        })
    }

    fn printed(ty: &Ty) -> String {
        crate::types::type_to_string(ty).unwrap()
    }

    #[test]
    fn orders_by_kind_then_name() {
        on();
        let ty = union_of(
            vec![
                Ty::new(K::Undefined),
                named("TouchEvent", 300),
                lit("b", 400),
                Ty::new(K::Number),
                named("MouseEvent", 200),
                Ty::new(K::Symbol),
            ],
            true,
            None,
        );
        assert_eq!(
            printed(&ty),
            "number | symbol | \"b\" | MouseEvent | TouchEvent | undefined"
        );
    }

    #[test]
    fn a_named_type_precedes_a_function_and_enum_members_follow_their_order() {
        on();
        let e = Rc::new(EnumInfo {
            name: "E".into(),
            members: vec![
                ("A".into(), false),
                ("B".into(), false),
                ("C".into(), false),
            ],
            base_id: 500,
        });
        let f = Ty::new(K::Anon(Anon {
            id: 900,
            shape: Shape::Function(Sig {
                params: Vec::new(),
                ret: Ty::new(K::Void),
            }),
            alias: None,
        }));
        let members = vec![
            f.clone(),
            Ty::new(K::EnumLit(e.clone(), 2)),
            named("Zed", 301),
            Ty::new(K::EnumLit(e, 0)),
        ];
        assert!(decidable(&members));
        let mut sorted = members;
        sort(&mut sorted);
        assert!(matches!(&*sorted[0].0, K::EnumLit(_, 0)));
        assert!(matches!(&*sorted[1].0, K::EnumLit(_, 2)));
        assert!(matches!(&*sorted[2].0, K::Ref { .. }));
        assert!(Rc::ptr_eq(&sorted[3].0, &f.0));
    }

    #[test]
    fn what_the_model_cannot_place_is_undecidable() {
        on();
        let anon = |id| {
            Ty::new(K::Anon(Anon {
                id,
                shape: Shape::Object(Vec::new()),
                alias: None,
            }))
        };
        // Two type literals are ordered by where they are written.
        assert!(!decidable(&[anon(900), anon(901)]));
        // Two types of one name that are not known to be one symbol.
        let (a, b) = (named("Same", 310), named("Same", 311));
        set_symbol(u64::MAX, 311, "other::Same".into());
        assert!(!decidable(&[a, b]));
    }
}
