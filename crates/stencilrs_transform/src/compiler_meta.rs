//! `componentMetadata: 'compilerstatic'`: the compiler's metadata for a component, written as
//! `static get COMPILER_META()` on its class. Stencil's `newSpecPage` reads it to register
//! components without a build (`@stencil/unplugin`'s `spec-page` mode).
//!
//! Ports `addComponentMetaStatic` and the part of `parseStaticComponentMeta` that fills the
//! metadata: the build conditionals (`setComponentBuildConditionals`), the vdom facts
//! (`gatherVdomMeta`), the styles (`parseStaticStyles`) and the key order of the object.
//!
//! Not ported here, and written as placeholders: the JSDoc (`docs`) and the resolved types of
//! members (`complexType.resolved`, `references`, a method's whole `complexType`). They need the
//! type checker; see issue #8. `internal` follows from `docs`, so it is `false`.

use oxc::ast::ast::{Argument, CallExpression, Class, Expression, ObjectPropertyKind, PropertyKey, StringLiteral, VariableDeclarator};
use oxc::ast_visit::{Visit, walk};
use oxc::parser::Parser;
use oxc::span::SourceType;
use serde_json::Value;

use crate::analyze::style_url_modes;
use crate::codegen::normalize_path;
use crate::meta::{ComponentMeta, Encapsulation, PropType};

/// A JavaScript value, printed the way `convertValueToLiteral` does (`undefined` included).
pub enum J {
    Undefined,
    Null,
    Bool(bool),
    Str(String),
    Arr(Vec<J>),
    Obj(Vec<(&'static str, J)>),
}

impl J {
    fn str(s: impl Into<String>) -> J {
        J::Str(s.into())
    }

    fn opt_str(s: Option<&str>) -> J {
        s.map_or(J::Undefined, J::str)
    }

    fn strs(list: &[String]) -> J {
        J::Arr(list.iter().map(J::str).collect())
    }

    pub fn print(&self, out: &mut String) {
        match self {
            J::Undefined => out.push_str("undefined"),
            J::Null => out.push_str("null"),
            J::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
            J::Str(s) => out.push_str(&serde_json::to_string(s).expect("string")),
            J::Arr(items) => {
                out.push('[');
                for (i, item) in items.iter().enumerate() {
                    if i > 0 {
                        out.push_str(", ");
                    }
                    item.print(out);
                }
                out.push(']');
            }
            J::Obj(fields) => {
                out.push_str("{ ");
                for (i, (k, v)) in fields.iter().enumerate() {
                    if i > 0 {
                        out.push_str(", ");
                    }
                    out.push_str(&serde_json::to_string(k).expect("string"));
                    out.push_str(": ");
                    v.print(out);
                }
                out.push_str(" }");
            }
        }
    }
}

/// What `gatherVdomMeta` and `parseCallExpression` found in a component's class.
#[derive(Debug, Default, Clone)]
pub struct VdomMeta {
    pub render: bool,
    pub functional: bool,
    pub attribute: bool,
    pub class: bool,
    pub key: bool,
    pub listener: bool,
    pub prop_or_attr: bool,
    pub prop_or_attr_prefix: bool,
    pub reference: bool,
    pub style: bool,
    pub xlink: bool,
    pub text: bool,
    pub attr_names: Vec<String>,
    pub tag_names: Vec<String>,
    pub parts: Vec<String>,
    pub slots: Vec<String>,
}

impl VdomMeta {
    fn all_attrs(&mut self) {
        self.class = true;
        self.key = true;
        self.listener = true;
        self.prop_or_attr = true;
        self.prop_or_attr_prefix = true;
        self.reference = true;
        self.style = true;
        self.xlink = true;
    }

    pub fn has_slot(&self) -> bool {
        self.tag_names.iter().any(|t| t == "slot")
    }
}

/// The vdom facts of the class named `class_name` in already-compiled `code`: Stencil reads
/// them off the `h()` calls its own JSX transform wrote, which is what `code` has.
pub fn scan_vdom(code: &str, class_name: &str) -> VdomMeta {
    let allocator = oxc::allocator::Allocator::default();
    let parsed = Parser::new(&allocator, code, SourceType::mjs()).parse();
    let mut find = FindClass { name: class_name, scan: Scan::default(), done: false };
    find.visit_program(&parsed.program);
    let mut meta = find.scan.meta;
    for list in [&mut meta.attr_names, &mut meta.tag_names, &mut meta.parts, &mut meta.slots] {
        let mut seen: Vec<String> = Vec::new();
        for item in list.drain(..) {
            if !seen.contains(&item) {
                seen.push(item);
            }
        }
        *list = seen;
    }
    meta
}

/// Scans the class a component is: `class X {}` or `const X = class {}` (`export`ed or not).
struct FindClass<'n> {
    name: &'n str,
    scan: Scan,
    done: bool,
}

impl<'a> Visit<'a> for FindClass<'_> {
    fn visit_class(&mut self, it: &Class<'a>) {
        if !self.done && it.id.as_ref().is_some_and(|id| id.name == self.name) {
            self.done = true;
            self.scan.visit_class(it);
        } else {
            walk::walk_class(self, it);
        }
    }

    fn visit_variable_declarator(&mut self, it: &VariableDeclarator<'a>) {
        if !self.done && it.id.get_identifier_name().is_some_and(|n| n == self.name) {
            if let Some(Expression::ClassExpression(class)) = &it.init {
                self.done = true;
                self.scan.visit_class(class);
                return;
            }
        }
        walk::walk_variable_declarator(self, it);
    }
}

#[derive(Default)]
struct Scan {
    meta: VdomMeta,
}

fn static_string(e: &Expression) -> Option<String> {
    match e {
        Expression::StringLiteral(s) => Some(s.value.to_string()),
        Expression::TemplateLiteral(t) if t.expressions.is_empty() => t.quasis.first().and_then(|q| q.value.cooked.as_ref()).map(|c| c.to_string()),
        _ => None,
    }
}

impl Scan {
    /// `parseCallExpression` → `visitCallExpressionArgs`.
    fn call(&mut self, it: &CallExpression) {
        if it.arguments.is_empty() {
            return;
        }
        let name = match &it.callee {
            Expression::Identifier(id) => id.name.as_str(),
            Expression::StaticMemberExpression(m) => m.property.name.as_str(),
            _ => return,
        };
        let args = &it.arguments;
        match name {
            "h" | "__stencil_h" | "createElement" | "jsx" | "jsxs" | "_jsx" | "_jsxs" => {
                if let Some(Expression::StringLiteral(tag)) = args[0].as_expression() {
                    self.meta.tag_names.push(tag.value.to_lowercase());
                }
                if name != "createElement" {
                    self.gather(args);
                    if matches!(name, "jsx" | "jsxs" | "_jsx" | "_jsxs") && args.len() > 2 {
                        self.meta.key = true;
                    }
                }
            }
            "createElementNS" if args.len() > 1 => {
                if let Some(Expression::StringLiteral(tag)) = args[1].as_expression() {
                    self.meta.tag_names.push(tag.value.to_lowercase());
                }
            }
            _ => {}
        }
    }

    /// `gatherVdomMeta`
    fn gather(&mut self, args: &[Argument]) {
        let m = &mut self.meta;
        m.render = true;
        let tag = args[0].as_expression();
        let slot_tag = matches!(tag, Some(Expression::StringLiteral(s)) if s.value == "slot");
        let is_host = matches!(tag, Some(Expression::Identifier(id)) if id.name == "Host");
        if !matches!(tag, Some(Expression::StringLiteral(_))) && !is_host {
            m.functional = true;
        }
        if args.len() > 1 {
            match args[1].as_expression() {
                Some(Expression::CallExpression(_) | Expression::Identifier(_)) => {
                    m.attribute = true;
                    m.all_attrs();
                }
                Some(Expression::ObjectExpression(obj)) => {
                    let mut slot_name: Option<String> = None;
                    let mut dynamic_slot_name = false;
                    for prop in &obj.properties {
                        m.attribute = true;
                        let ObjectPropertyKind::ObjectProperty(p) = prop else {
                            m.all_attrs();
                            dynamic_slot_name |= slot_tag;
                            continue;
                        };
                        if p.computed {
                            m.all_attrs();
                            dynamic_slot_name |= slot_tag;
                            continue;
                        }
                        let name = match &p.key {
                            PropertyKey::StaticIdentifier(id) => id.name.to_string(),
                            PropertyKey::StringLiteral(s) => s.value.to_string(),
                            PropertyKey::NumericLiteral(n) => n.value.to_string(),
                            _ => String::new(),
                        };
                        if name.is_empty() {
                            continue;
                        }
                        // A `PropertyAssignment`: not shorthand, not a method or accessor.
                        let assignment = !p.shorthand && !p.method && p.kind == oxc::ast::ast::PropertyKind::Init;
                        match name.as_str() {
                            "key" => m.key = true,
                            "ref" => m.reference = true,
                            "class" | "className" => m.class = true,
                            "style" => m.style = true,
                            _ if is_listener_name(&name) => m.listener = true,
                            _ if name.starts_with("xlink") => {
                                m.xlink = true;
                                m.prop_or_attr = true;
                            }
                            _ if name.starts_with("attr:") || name.starts_with("prop:") => m.prop_or_attr_prefix = true,
                            _ => m.prop_or_attr = true,
                        }
                        if name == "part" && assignment {
                            if let Some(value) = static_string(&p.value) {
                                m.parts.extend(value.split(' ').filter(|s| !s.is_empty()).map(str::to_owned));
                            }
                        }
                        if slot_tag && name == "name" && assignment {
                            match static_string(&p.value) {
                                Some(v) => slot_name = Some(v),
                                None => dynamic_slot_name = true,
                            }
                        }
                        m.attr_names.push(name);
                    }
                    if slot_tag && !dynamic_slot_name {
                        m.slots.push(slot_name.unwrap_or_default());
                    }
                }
                _ if slot_tag => m.slots.push(String::new()),
                _ => {}
            }
        } else if slot_tag {
            m.slots.push(String::new());
        }
        if !m.text {
            for arg in args.iter().skip(2) {
                let is_h_call = matches!(arg.as_expression(), Some(Expression::CallExpression(c)) if matches!(&c.callee, Expression::Identifier(id) if id.name == "h"));
                if !is_h_call {
                    m.text = true;
                    break;
                }
            }
        }
    }
}

/// `/^on(-|[A-Z])/`
fn is_listener_name(name: &str) -> bool {
    name.strip_prefix("on").and_then(|rest| rest.chars().next()).is_some_and(|c| c == '-' || c.is_ascii_uppercase())
}

impl<'a> Visit<'a> for Scan {
    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        self.call(it);
        walk::walk_call_expression(self, it);
    }

    // `parseStringLiteral`
    fn visit_string_literal(&mut self, it: &StringLiteral<'a>) {
        if it.value.contains("</") {
            if it.value.contains("<slot") {
                self.meta.tag_names.push("slot".into());
            }
            if it.value.contains("<svg") {
                self.meta.tag_names.push("svg".into());
            }
        }
    }
}

/// What the metadata needs that only code generation knows.
pub struct MetaInput<'a> {
    pub cmp: &'a ComponentMeta,
    pub vdom: &'a VdomMeta,
    /// The path the module is compiled under, which style paths resolve against.
    pub file: &'a str,
    pub has_modern_property_decls: bool,
    /// The class has an `extends` clause, resolvable or not.
    pub has_heritage: bool,
}

fn prop_type(t: PropType) -> &'static str {
    match t {
        PropType::Any => "any",
        PropType::Boolean => "boolean",
        PropType::Number => "number",
        PropType::String => "string",
        PropType::Unknown => "unknown",
    }
}

fn docs(tags_first: bool) -> J {
    if tags_first {
        J::Obj(vec![("tags", J::Arr(vec![])), ("text", J::str(""))])
    } else {
        J::Obj(vec![("text", J::str("")), ("tags", J::Arr(vec![]))])
    }
}

/// `{ original, resolved, references }`. `resolved` is the type as written: the resolved type
/// needs the type checker (#8).
fn complex_type(original: &str) -> J {
    J::Obj(vec![("original", J::str(original)), ("resolved", J::str(original)), ("references", J::Obj(vec![]))])
}

/// `parseStaticStyles`: the component's style modes, inline `$` first, then the stylesheets by
/// mode; sorted by mode name. Also whether any mode other than `$` is named.
fn styles(input: &MetaInput) -> (J, bool) {
    let cmp = input.cmp;
    let id = cmp.tag_name.to_uppercase();
    let mut out: Vec<(String, J)> = Vec::new();
    if let Some(Value::String(s)) = cmp.options.get("styles") {
        let s = s.trim();
        if !s.is_empty() {
            out.push((
                "$".into(),
                J::Obj(vec![
                    ("modeName", J::str("$")),
                    ("styleId", J::str(&id)),
                    ("styleStr", J::str(s)),
                    ("styleIdentifier", J::Null),
                    ("externalStyles", J::Arr(vec![])),
                ]),
            ));
        }
    }
    let dir = input.file.replace('\\', "/");
    let dir = dir.rsplit_once('/').map_or("", |(d, _)| d);
    for (mode, urls) in style_url_modes(&cmp.options) {
        let external: Vec<J> = urls
            .iter()
            .map(|u| u.trim())
            .filter(|u| !u.is_empty())
            .map(|url| {
                let joined = if url.starts_with('/') || dir.is_empty() { url.to_owned() } else { format!("{dir}/{url}") };
                J::Obj(vec![
                    ("absolutePath", J::str(normalize_path(&joined))),
                    ("relativePath", J::str(normalize_path(url))),
                    ("originalComponentPath", J::str(url)),
                ])
            })
            .collect();
        if external.is_empty() {
            continue;
        }
        let style_id = if mode == "$" { id.clone() } else { format!("{id}#{mode}") };
        out.push((
            mode.clone(),
            J::Obj(vec![
                ("modeName", J::str(&mode)),
                ("styleId", J::str(style_id)),
                ("styleStr", J::Null),
                ("styleIdentifier", J::Null),
                ("externalStyles", J::Arr(external)),
            ]),
        ));
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    let has_mode = out.iter().any(|(m, _)| m != "$");
    (J::Arr(out.into_iter().map(|(_, j)| j).collect()), has_mode)
}

/// The class's `static get COMPILER_META()`, member text.
pub fn getter(input: &MetaInput) -> String {
    let (cmp, vd) = (input.cmp, input.vdom);
    let enc = cmp.options.get("encapsulation");
    let enc_flag = |key: &str| enc.and_then(|e| e.get(key)) == Some(&Value::Bool(true));
    let shadow = cmp.encapsulation == Encapsulation::Shadow;
    let has = |m: &str| cmp.class_methods.iter().any(|c| c == m);

    // `parseStaticPatches`: shadow components have none; the others, in the order written.
    let patches = match enc.and_then(|e| e.get("patches")) {
        Some(Value::Array(list)) if !shadow => {
            let mut set: Vec<&'static str> = Vec::new();
            for p in list.iter().filter_map(Value::as_str) {
                let name = match p {
                    "all" => "all",
                    "children" => "children",
                    "clone" => "clone",
                    "insert" => "insert",
                    _ => continue,
                };
                if !set.contains(&name) {
                    set.push(name);
                }
            }
            if set.is_empty() { J::Null } else { J::Obj(set.into_iter().map(|n| (n, J::Bool(true))).collect()) }
        }
        _ => J::Null,
    };
    let patch_flag = |name: &str| matches!(&patches, J::Obj(f) if f.iter().any(|(k, _)| *k == name));
    let [patch_all, patch_children, patch_clone, patch_insert] = ["all", "children", "clone", "insert"].map(patch_flag);

    let properties = J::Arr(
        cmp.properties
            .iter()
            .map(|p| {
                J::Obj(vec![
                    ("name", J::str(&p.name)),
                    ("type", J::str(prop_type(p.prop_type))),
                    ("attribute", J::opt_str(p.attribute.as_deref())),
                    ("reflect", J::Bool(p.reflect)),
                    ("mutable", J::Bool(p.mutable)),
                    ("required", J::Bool(p.required)),
                    ("optional", J::Bool(p.optional)),
                    ("defaultValue", J::opt_str(p.default_value.as_deref())),
                    ("complexType", complex_type(&p.complex_type_original)),
                    ("docs", docs(true)),
                    ("internal", J::Bool(false)),
                    ("getter", J::Bool(p.getter)),
                    ("setter", J::Bool(p.setter)),
                ])
            })
            .collect(),
    );
    let states = J::Arr(cmp.states.iter().map(|s| J::Obj(vec![("name", J::str(&s.name))])).collect());
    let methods = J::Arr(
        cmp.methods
            .iter()
            .map(|m| {
                J::Obj(vec![
                    ("name", J::str(&m.name)),
                    ("docs", docs(false)),
                    (
                        "complexType",
                        J::Obj(vec![("signature", J::str("")), ("parameters", J::Arr(vec![])), ("references", J::Obj(vec![])), ("return", J::str(""))]),
                    ),
                    ("internal", J::Bool(false)),
                ])
            })
            .collect(),
    );
    let listeners = J::Arr(
        cmp.listeners
            .iter()
            .map(|l| {
                J::Obj(vec![
                    ("name", J::str(&l.name)),
                    ("method", J::str(&l.method)),
                    ("capture", J::Bool(l.capture)),
                    ("passive", J::Bool(l.passive)),
                    ("target", J::opt_str(l.target.as_deref())),
                ])
            })
            .collect(),
    );
    let events = J::Arr(
        cmp.events
            .iter()
            .map(|e| {
                J::Obj(vec![
                    ("name", J::str(&e.name)),
                    ("method", J::str(&e.method)),
                    ("bubbles", J::Bool(e.bubbles)),
                    ("cancelable", J::Bool(e.cancelable)),
                    ("composed", J::Bool(e.composed)),
                    ("docs", docs(true)),
                    ("complexType", complex_type(&e.complex_type_original)),
                    ("internal", J::Bool(false)),
                ])
            })
            .collect(),
    );
    let watchers = J::Arr(
        cmp.watchers
            .iter()
            .map(|w| J::Obj(vec![("propName", J::str(&w.prop_name)), ("methodName", J::str(&w.method_name)), ("handlerOptions", J::Undefined)]))
            .collect(),
    );
    let translators = |list: &[crate::meta::WatcherMeta]| {
        J::Arr(list.iter().map(|w| J::Obj(vec![("propName", J::str(&w.prop_name)), ("methodName", J::str(&w.method_name))])).collect())
    };
    let custom_states = J::Arr(
        cmp.attach_internals_custom_states
            .iter()
            .map(|s| J::Obj(vec![("name", J::str(&s.name)), ("initialValue", J::Bool(s.initial_value)), ("docs", J::str(&s.docs))]))
            .collect(),
    );

    let (styles, has_mode) = styles(input);
    let global_styles = J::Arr(
        cmp.global_styles
            .iter()
            .map(|g| J::Obj(vec![("absolutePath", g.absolute_path.as_deref().map_or(J::Null, J::str)), ("styleStr", g.style_str.as_deref().map_or(J::Null, J::str))]))
            .collect(),
    );
    let has_style = matches!(&styles, J::Arr(a) if !a.is_empty());
    let has_prop = !cmp.properties.is_empty();
    let has_state = !cmp.states.is_empty();
    let has_method = !cmp.methods.is_empty();
    let has_listener = !cmp.listeners.is_empty();
    let has_lifecycle = ["componentWillLoad", "componentDidLoad", "componentShouldUpdate", "componentWillUpdate", "componentDidUpdate", "componentWillRender", "componentDidRender", "connectedCallback", "disconnectedCallback"]
        .iter()
        .any(|m| has(m));
    // `hasElement` is never set by Stencil's metadata pass.
    let has_member = has_prop || has_state || has_method || cmp.form_associated;
    let is_plain = !has_member && !has_style && !has_lifecycle && !has_listener && !vd.render && !input.has_heritage;
    let target = |t: &str| cmp.listeners.iter().any(|l| l.target.as_deref() == Some(t));
    let b = J::Bool;

    let fields: Vec<(&'static str, J)> = vec![
        ("attachInternalsMemberName", cmp.attach_internals_member_name.as_deref().map_or(J::Null, J::str)),
        ("attachInternalsCustomStates", custom_states),
        ("formAssociated", b(cmp.form_associated)),
        ("tagName", J::str(&cmp.tag_name)),
        ("componentClassName", J::str(&cmp.component_class_name)),
        ("elementRef", cmp.element_ref.as_deref().map_or(J::Null, J::str)),
        ("encapsulation", J::str(match cmp.encapsulation {
            Encapsulation::None => "none",
            Encapsulation::Scoped => "scoped",
            Encapsulation::Shadow => "shadow",
        })),
        ("shadowDelegatesFocus", b(shadow && enc_flag("delegatesFocus"))),
        ("shadowClonable", b(shadow && enc_flag("clonable"))),
        ("shadowSerializable", b(shadow && enc_flag("serializable"))),
        ("shadowMode", if shadow { J::str(if enc.and_then(|e| e.get("mode")).and_then(Value::as_str) == Some("closed") { "closed" } else { "open" }) } else { J::Null }),
        ("slotAssignment", if shadow && enc.and_then(|e| e.get("slotAssignment")).and_then(Value::as_str) == Some("manual") { J::str("manual") } else { J::Null }),
        ("patches", patches),
        ("properties", properties),
        ("virtualProperties", J::Arr(vec![])),
        ("states", states),
        ("methods", methods),
        ("listeners", listeners),
        ("events", events),
        ("watchers", watchers),
        ("doesExtend", b(cmp.does_extend)),
        ("styles", styles),
        ("globalStyles", global_styles),
        ("internal", b(false)),
        ("sourceMapPath", J::Null),
        ("serializers", translators(&cmp.serializers)),
        ("deserializers", translators(&cmp.deserializers)),
        ("hasAttributeChangedCallbackFn", b(has("attributeChangedCallback"))),
        ("hasComponentWillLoadFn", b(has("componentWillLoad"))),
        ("hasComponentDidLoadFn", b(has("componentDidLoad"))),
        ("hasComponentShouldUpdateFn", b(has("componentShouldUpdate"))),
        ("hasComponentWillUpdateFn", b(has("componentWillUpdate"))),
        ("hasComponentDidUpdateFn", b(has("componentDidUpdate"))),
        ("hasComponentWillRenderFn", b(has("componentWillRender"))),
        ("hasComponentDidRenderFn", b(has("componentDidRender"))),
        ("hasConnectedCallbackFn", b(has("connectedCallback"))),
        ("hasDeserializer", b(!cmp.deserializers.is_empty())),
        ("hasDisconnectedCallbackFn", b(has("disconnectedCallback"))),
        ("hasElement", b(false)),
        ("hasEvent", b(!cmp.events.is_empty())),
        ("hasLifecycle", b(has_lifecycle)),
        ("hasListener", b(has_listener)),
        ("hasListenerTarget", b(cmp.listeners.iter().any(|l| l.target.as_deref().is_some_and(|t| !t.is_empty())))),
        ("hasListenerTargetWindow", b(target("window"))),
        ("hasListenerTargetDocument", b(target("document"))),
        ("hasListenerTargetBody", b(target("body"))),
        ("hasMember", b(has_member)),
        ("hasMethod", b(has_method)),
        ("hasMode", b(has_mode)),
        ("hasModernPropertyDecls", b(input.has_modern_property_decls)),
        ("hasAttribute", b(cmp.properties.iter().any(|p| p.attribute.is_some()))),
        ("hasProp", b(has_prop)),
        ("hasPropNumber", b(cmp.properties.iter().any(|p| p.prop_type == PropType::Number))),
        ("hasPropBoolean", b(cmp.properties.iter().any(|p| p.prop_type == PropType::Boolean))),
        ("hasPropString", b(cmp.properties.iter().any(|p| p.prop_type == PropType::String))),
        ("hasPropMutable", b(cmp.properties.iter().any(|p| p.mutable))),
        ("hasReflect", b(cmp.properties.iter().any(|p| p.reflect))),
        ("hasRenderFn", b(has("render"))),
        ("hasSerializer", b(!cmp.serializers.is_empty())),
        ("hasSlot", b(vd.has_slot())),
        ("hasState", b(has_state)),
        ("hasStyle", b(has_style)),
        ("hasVdomAttribute", b(vd.attribute)),
        ("hasVdomXlink", b(vd.xlink)),
        ("hasVdomClass", b(vd.class)),
        ("hasVdomFunctional", b(vd.functional)),
        ("hasVdomKey", b(vd.key)),
        ("hasVdomListener", b(vd.listener)),
        ("hasVdomPropOrAttr", b(vd.prop_or_attr)),
        ("hasVdomPropOrAttrPrefix", b(vd.prop_or_attr_prefix)),
        ("hasVdomRef", b(vd.reference)),
        ("hasVdomRender", b(vd.render)),
        ("hasVdomStyle", b(vd.style)),
        ("hasVdomText", b(vd.text)),
        ("hasSignalsImport", b(false)),
        ("hasWatchCallback", b(!cmp.watchers.is_empty())),
        ("isPlain", b(is_plain)),
        ("htmlAttrNames", J::strs(&vd.attr_names)),
        ("htmlTagNames", J::strs(&vd.tag_names)),
        ("htmlParts", J::strs(&vd.parts)),
        ("htmlSlots", J::strs(&vd.slots)),
        ("isUpdateable", b(has_prop || has_state)),
        ("dependents", J::Arr(vec![])),
        ("directDependents", J::Arr(vec![])),
        ("directDependencies", J::Arr(vec![])),
        ("hasPatchAll", b(patch_all)),
        ("hasPatchChildren", b(patch_children)),
        ("hasPatchClone", b(patch_clone)),
        ("hasPatchInsert", b(patch_insert)),
    ];
    let mut out = String::from("static get COMPILER_META() { return ");
    J::Obj(fields).print(&mut out);
    out.push_str("; }");
    out
}
