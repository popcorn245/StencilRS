//! Experimental output (`componentExport: 'stencilrs'`): components for the stencilrs runtime
//! (`runtime.js`) instead of Stencil's. Each JSX tree becomes a static template, hoisted to the
//! module, and a call `__rs_t(template, [values])` holding only the dynamic parts, so an update
//! touches what changed and never diffs a virtual DOM. The class becomes
//! `class X extends __rs_Base` registered with `__rs_define(X, meta)`.

use oxc::ast::ast::*;
use oxc::ast_visit::Visit;
use oxc::span::{GetSpan, Span};

use crate::codegen::{
    CodegenOptions2, Generated, MEMBER_DECORATORS_TO_REMOVE, decorator_name, has_decorator, json,
    strip_types_and_jsx, style_import_path, styles_of,
};
use crate::edits::Edits;
use crate::eval::property_key_name;
use crate::meta::{ComponentMeta, Encapsulation, PropType};

pub const RUNTIME_MODULE: &str = "@popcorn245/stencilrs/runtime";

/// `@stencil/core` values the stencilrs runtime provides under the same name.
const RUNTIME_VALUES: [&str; 6] = ["forceUpdate", "getElement", "Build", "writeTask", "readTask", "getAssetPath"];
/// `@stencil/core` names compiled away.
const COMPILED_AWAY: [&str; 1] = ["Component"];

const VOID: [&str; 14] = [
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source",
    "track", "wbr",
];
/// Elements that only live inside `<svg>`: a template rooted at one is parsed inside an `<svg>`.
const SVG_CHILDREN: [&str; 24] = [
    "path", "g", "circle", "rect", "line", "polyline", "polygon", "ellipse", "text", "tspan",
    "use", "defs", "symbol", "clipPath", "mask", "pattern", "linearGradient", "radialGradient",
    "stop", "filter", "foreignObject", "image", "marker", "title",
];

// Part types, as `runtime.js` reads them.
const NODE: u8 = 0;
const ATTR: u8 = 1;
const EVENT: u8 = 2;
const CLASS: u8 = 3;
const STYLE: u8 = 4;
const REF: u8 = 5;
const SPREAD: u8 = 6;
const SLOT: u8 = 7;

pub fn generate(
    program: &Program,
    source: &str,
    components: &[ComponentMeta],
    opts: &CodegenOptions2,
) -> Result<Generated, String> {
    let mut ed = Edits::new(source);
    let text = |s: Span| s.source_text(source);

    // Imports: `@stencil/core` values the runtime has keep their names; decorators and JSX
    // factories go. Types are stripped later.
    let mut aliases = std::collections::HashMap::new();
    let mut last_import_end = 0;
    let mut host_name = "Host".to_owned();
    let mut fragment_name = "Fragment".to_owned();
    for stmt in &program.body {
        let Statement::ImportDeclaration(imp) = stmt else { continue };
        last_import_end = imp.span.end;
        if imp.source.value.as_str() != "@stencil/core" {
            continue;
        }
        let mut keep = Vec::new();
        for spec in imp.specifiers.iter().flatten() {
            let ImportDeclarationSpecifier::ImportSpecifier(s) = spec else {
                return Err("stencilrs runtime: only named imports from @stencil/core are supported".into());
            };
            let imported = s.imported.name();
            let local = s.local.name.to_string();
            match imported.as_str() {
                // Kept for `h()` called directly; elided when only JSX used them.
                "Host" => {
                    host_name = local;
                    keep.push(text(s.span).to_owned());
                }
                "Fragment" => {
                    fragment_name = local;
                    keep.push(text(s.span).to_owned());
                }
                n if MEMBER_DECORATORS_TO_REMOVE.contains(&n) || COMPILED_AWAY.contains(&n) => {
                    aliases.insert(n.to_owned(), local);
                }
                n if RUNTIME_VALUES.contains(&n) => keep.push(text(s.span).to_owned()),
                // Types (`EventEmitter`, `ComponentInterface`...) are removed with the import
                // when only used as types; a value the runtime lacks fails at bundle time.
                _ => keep.push(text(s.span).to_owned()),
            }
        }
        ed.replace(
            imp.span.start,
            imp.span.end,
            if keep.is_empty() {
                String::new()
            } else {
                format!("import {{ {} }} from {};", keep.join(", "), json(RUNTIME_MODULE))
            },
        );
    }
    let dec = |n: &str| aliases.get(n).cloned().unwrap_or_else(|| n.to_owned());
    let component_dec = dec("Component");
    let stencil_decs: Vec<String> = MEMBER_DECORATORS_TO_REMOVE.iter().map(|d| dec(d)).collect();
    let signal_dec = crate::codegen::signal_decorator_local(program);

    let mut jsx = JsxCompiler {
        source,
        templates: Vec::new(),
        host_name,
        fragment_name,
        scope: None,
        emulate_slots: false,
        pending_class: None,
    };
    let mut style_imports = Vec::new();
    let mut after_classes: Vec<(u32, String)> = Vec::new();
    let mut defines = Vec::new();
    // Field spans whose JSX was compiled with the field (skipped by the global JSX pass).
    let mut consumed: Vec<Span> = Vec::new();

    let mut contexts: Vec<JsxContext> = Vec::new();
    let mut classes = Classes(Vec::new());
    classes.visit_program(program);
    for (class, stmt_end) in classes.0 {
        let is_component = has_decorator(&class.decorators, &component_dec);
        let has_members = class.body.body.iter().any(|el| {
            let decs = match el {
                ClassElement::PropertyDefinition(p) => &p.decorators,
                ClassElement::MethodDefinition(m) => &m.decorators,
                _ => return false,
            };
            decs.iter().any(|d| decorator_name(d).is_some_and(|n| stencil_decs.iter().any(|s| s == n)))
        });
        if !is_component && !has_members && !opts.transform_as_base_class {
            continue;
        }
        let name = class.id.as_ref().map(|id| id.name.to_string());
        let cmp = if is_component {
            let n = name.as_deref().ok_or("stencilrs runtime: a component class needs a name")?;
            Some(components.iter().find(|c| c.component_class_name == n).ok_or("component metadata missing")?)
        } else {
            None
        };
        if let Some(cmp) = cmp {
            contexts.push(JsxContext {
                span: class.span,
                // The scope classes only serve the component's own scoped CSS: none without styles.
                scope: (cmp.encapsulation == Encapsulation::Scoped && !styles_of(cmp).is_empty()).then(|| format!("sc-{}", cmp.tag_name)),
                emulate_slots: cmp.encapsulation != Encapsulation::Shadow,
            });
        }
        for d in &class.decorators {
            ed.remove(d.span.start, d.span.end);
        }
        if class.heritage.is_none() {
            let at = class.id.as_ref().map_or(class.span.start + 5, |id| id.span.end);
            ed.insert(at, " extends __rs_Base");
        }

        let mut assignments = Vec::new();
        if let Some(cmp) = cmp {
            for ev in &cmp.events {
                let flags = (ev.cancelable as u8) | ((ev.composed as u8) << 1) | ((ev.bubbles as u8) << 2);
                assignments.push(format!(
                    "this[{}] = __rs_createEvent(this, {}, {flags});",
                    json(&ev.method),
                    json(&ev.name)
                ));
            }
            if let Some(member) = &cmp.attach_internals_member_name {
                assignments.push(format!("this[{}] = this.attachInternals();", json(member)));
                for st in cmp.attach_internals_custom_states.iter().filter(|s| s.initial_value) {
                    assignments.push(format!("this[{}].states.add({});", json(member), json(&st.name)));
                }
            }
        }
        let mut ctor = None;
        let mut field_decorator_calls = Vec::new();
        for el in &class.body.body {
            match el {
                ClassElement::PropertyDefinition(p) if !p.r#static => {
                    let key = property_key_name(&p.key);
                    consumed.push(p.span);
                    let decs: Vec<&str> = p.decorators.iter().filter_map(|d| decorator_name(d)).collect();
                    if cmp.is_some_and(|c| key.is_some() && key == c.element_ref) || decs.contains(&dec("Element").as_str()) {
                        ed.replace(p.span.start, p.span.end, format!("get {}() {{ return this; }}", key.unwrap_or_default()));
                        continue;
                    }
                    ed.remove(p.span.start, p.span.end);
                    if decs.contains(&dec("AttachInternals").as_str()) && cmp.is_some() {
                        continue; // assigned above
                    }
                    if let Some(event) = p.decorators.iter().find(|d| decorator_name(d) == Some(dec("Event").as_str())) {
                        if cmp.is_none_or(|c| !c.events.iter().any(|e| Some(&e.method) == key.as_ref())) {
                            let k = key.clone().ok_or("stencilrs runtime: unsupported event name")?;
                            let (ev_name, flags) = event_options(event, &k, source);
                            assignments.push(format!("this[{}] = __rs_createEvent(this, {}, {flags});", json(&k), json(&ev_name)));
                        }
                        continue;
                    }
                    // Other decorators (e.g. `@Signal()`): applied after the class, as legacy
                    // decorators are with `useDefineForClassFields: false`.
                    for d in &p.decorators {
                        if decorator_name(d).is_some_and(|n| stencil_decs.iter().any(|s| s == n)) {
                            continue;
                        }
                        if let (Some(cls), Some(k)) = (&name, &key) {
                            let _ = &signal_dec;
                            field_decorator_calls.push(format!("{}({cls}.prototype, {});", text(d.expression.span()), json(k)));
                        }
                    }
                    // All instance fields become constructor assignments, in source order, so
                    // none shadows a member accessor and each initializer sees the earlier ones.
                    if let Some(value) = &p.value {
                        jsx.enter(&contexts, value.span());
                        let target = if p.computed {
                            text(p.key.span()).to_owned()
                        } else {
                            json(&key.ok_or("stencilrs runtime: unsupported field name")?)
                        };
                        assignments.push(format!("this[{target}] = {};", jsx.compile_in(value.span(), value)?));
                    }
                }
                ClassElement::MethodDefinition(m) => {
                    for d in m.decorators.iter().filter(|d| {
                        decorator_name(d).is_some_and(|n| stencil_decs.iter().any(|s| s == n))
                    }) {
                        ed.remove(d.span.start, d.span.end);
                    }
                    if m.kind == MethodDefinitionKind::Constructor {
                        ctor = Some(m);
                    }
                }
                _ => {}
            }
        }
        // `super()` passes arguments through, so a mixin's class works in any position.
        match ctor {
            Some(c) => {
                let body = c.value.body.as_ref().ok_or("constructor without a body")?;
                if class.heritage.is_some() && body.statements.iter().any(crate::codegen::is_super_call) {
                    let sup = body.statements.iter().find(|s| crate::codegen::is_super_call(s)).unwrap();
                    ed.insert(sup.span().end, format!(" {} ", assignments.join(" ")));
                } else {
                    ed.insert(body.span.start + 1, format!(" super(); {} ", assignments.join(" ")));
                }
            }
            None => ed.insert(
                class.body.span.start + 1,
                format!(" constructor(...__a) {{ super(...__a); {} }} ", assignments.join(" ")),
            ),
        }
        if !field_decorator_calls.is_empty() {
            after_classes.push((stmt_end, field_decorator_calls.join("\n")));
        }

        let (Some(cmp), Some(name)) = (cmp, name) else { continue };
        if cmp.form_associated {
            ed.insert(class.body.span.start + 1, " static get formAssociated() { return true; } ");
        }
        // Metadata for `__rs_define`.
        let mut members = Vec::new();
        for p in &cmp.properties {
            let t = match p.prop_type {
                PropType::String => 64,
                PropType::Number => 128,
                PropType::Boolean => 256,
                PropType::Any | PropType::Unknown => 512,
            };
            let flags: u32 = 1 | t | if p.mutable { 16 } else { 0 } | if p.reflect { 32 } else { 0 };
            members.push(match &p.attribute {
                Some(a) => format!("{}: [{flags}, {}]", json(&p.name), json(a)),
                None => format!("{}: [{flags}]", json(&p.name)),
            });
        }
        for s in &cmp.states {
            members.push(format!("{}: [2]", json(&s.name)));
        }
        let group = |list: &[crate::meta::WatcherMeta]| {
            let mut out: Vec<(String, Vec<String>)> = Vec::new();
            for w in list {
                match out.iter_mut().find(|(p, _)| *p == w.prop_name) {
                    Some((_, ms)) => ms.push(json(&w.method_name)),
                    None => out.push((w.prop_name.clone(), vec![json(&w.method_name)])),
                }
            }
            out.iter()
                .map(|(p, ms)| format!("{}: [{}]", json(p), ms.join(", ")))
                .collect::<Vec<_>>()
                .join(", ")
        };
        let listeners: Vec<String> = cmp
            .listeners
            .iter()
            .map(|l| match &l.target {
                Some(t) => format!("[{}, {}, {}]", json(&l.name), json(&l.method), json(t)),
                None => format!("[{}, {}]", json(&l.name), json(&l.method)),
            })
            .collect();
        let mut style_parts = Vec::new();
        for style in styles_of(cmp).iter().filter(|s| s.mode == "$") {
            for (i, url) in style.urls.iter().enumerate() {
                let ident = format!("__rs_{}{i}", style.identifier);
                style_imports.push(format!(
                    "import {ident} from {};",
                    json(&style_import_path(&opts.file, url, cmp, &style.mode))
                ));
                style_parts.push(ident);
            }
            if let Some(css) = &style.inline {
                style_parts.push(json(css));
            }
        }
        // The plugin's style modules export `() => css`; the runtime calls what it gets.
        let style = if style_parts.is_empty() {
            "null".to_owned()
        } else {
            format!("[{}]", style_parts.join(", "))
        };
        let delegates = cmp
            .options
            .pointer("/encapsulation/delegatesFocus")
            .or_else(|| cmp.options.get("delegatesFocus"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        defines.push(format!(
            "__rs_define({name}, {{ tag: {}, scoped: {}, shadow: {}, delegatesFocus: {delegates}, style: {style}, members: {{ {} }}, watchers: {{ {} }}, serializers: {{ {} }}, deserializers: {{ {} }}, listeners: [{}] }});",
            json(&cmp.tag_name),
            cmp.encapsulation == Encapsulation::Scoped,
            cmp.encapsulation == Encapsulation::Shadow,
            members.join(", "),
            group(&cmp.watchers),
            group(&cmp.serializers),
            group(&cmp.deserializers),
            listeners.join(", ")
        ));
    }

    // Every JSX tree, wherever it is (render, helper methods, functions in the module).
    let mut found = OutermostJsx::default();
    found.visit_program(program);
    for node in found.0 {
        let sp = node.span();
        if consumed.iter().any(|c| c.start <= sp.start && sp.end <= c.end) {
            continue;
        }
        jsx.enter(&contexts, sp);
        ed.replace(sp.start, sp.end, jsx.compile_root(node)?);
    }

    let header = format!(
        "\nimport {{ Base as __rs_Base, define as __rs_define, template as __rs_template, t as __rs_t, fc as __rs_fc, createEvent as __rs_createEvent }} from {};\n{}\n{}\n",
        json(RUNTIME_MODULE),
        style_imports.join("\n"),
        jsx.templates
            .iter()
            .enumerate()
            .map(|(i, t)| format!("const __rs_tmpl{i} = __rs_template({t});"))
            .collect::<Vec<_>>()
            .join("\n")
    );
    ed.insert(last_import_end, header);
    for (at, calls) in after_classes {
        ed.insert(at, format!("\n{calls}\n"));
    }
    ed.insert(source.len() as u32, format!("\n{}\n", defines.join("\n")));

    let (edited, _offsets) = ed.apply_mapped();
    let (code, _map, _anchors) = strip_types_and_jsx(&edited, opts)?;
    Ok(Generated { code, map: None })
}

/// `@Event()` options of a base class's event: its name and the runtime's flags.
fn event_options(d: &Decorator, member: &str, source: &str) -> (String, u8) {
    let mut name = member.to_owned();
    let (mut bubbles, mut composed, mut cancelable) = (true, true, true);
    if let Expression::CallExpression(call) = &d.expression {
        if let Some(Argument::ObjectExpression(o)) = call.arguments.first() {
            for p in &o.properties {
                let ObjectPropertyKind::ObjectProperty(p) = p else { continue };
                let Some(k) = property_key_name(&p.key) else { continue };
                let v = p.value.span().source_text(source);
                match k.as_str() {
                    "eventName" => {
                        if let Expression::StringLiteral(s) = &p.value {
                            name = s.value.to_string();
                        }
                    }
                    "bubbles" => bubbles = v == "true",
                    "composed" => composed = v == "true",
                    "cancelable" => cancelable = v == "true",
                    _ => {}
                }
            }
        }
    }
    (name, (cancelable as u8) | ((composed as u8) << 1) | ((bubbles as u8) << 2))
}

/// Every class in the module with the end of the statement it is declared in.
struct Classes<'n, 'a>(Vec<(&'n Class<'a>, u32)>);

impl<'n, 'a> Visit<'a> for Classes<'n, 'a> {
    fn visit_statement(&mut self, it: &Statement<'a>) {
        let before = self.0.len();
        oxc::ast_visit::walk::walk_statement(self, it);
        // Statement-level classes: decorator calls go after the statement.
        for c in &mut self.0[before..] {
            if c.1 == u32::MAX {
                c.1 = it.span().end;
            }
        }
    }
    fn visit_class(&mut self, it: &Class<'a>) {
        let it: &'n Class<'a> = unsafe { &*(it as *const _) };
        self.0.push((it, u32::MAX));
        oxc::ast_visit::walk::walk_class(self, it);
    }
}

#[derive(Clone, Copy)]
enum JsxNode<'n, 'a> {
    Element(&'n JSXElement<'a>),
    Fragment(&'n JSXFragment<'a>),
}

impl JsxNode<'_, '_> {
    fn span(&self) -> Span {
        match self {
            JsxNode::Element(e) => e.span,
            JsxNode::Fragment(f) => f.span,
        }
    }
}

/// The JSX trees not inside another JSX tree.
#[derive(Default)]
struct OutermostJsx<'n, 'a>(Vec<JsxNode<'n, 'a>>);

impl<'n, 'a> Visit<'a> for OutermostJsx<'n, 'a> {
    fn visit_jsx_element(&mut self, it: &JSXElement<'a>) {
        // SAFETY of lifetimes: the visitor is only run over nodes that live for 'n.
        let it: &'n JSXElement<'a> = unsafe { &*(it as *const _) };
        self.0.push(JsxNode::Element(it));
    }
    fn visit_jsx_fragment(&mut self, it: &JSXFragment<'a>) {
        let it: &'n JSXFragment<'a> = unsafe { &*(it as *const _) };
        self.0.push(JsxNode::Fragment(it));
    }
}

struct JsxCompiler<'s> {
    source: &'s str,
    /// Each template's arguments: `"html", [parts], svg, host`.
    templates: Vec<String>,
    host_name: String,
    fragment_name: String,
    /// `sc-<tag>` while compiling JSX of a scoped component: added to every element.
    scope: Option<String>,
    /// Outside shadow DOM, `<slot>` becomes a slot part that relocates the host's children.
    emulate_slots: bool,
    /// Classes the current element gets besides its own (scope, slot container).
    pending_class: Option<String>,
}

/// The component class a JSX tree belongs to.
struct JsxContext {
    span: Span,
    scope: Option<String>,
    emulate_slots: bool,
}

/// One template being built.
struct Builder {
    html: String,
    parts: Vec<String>,
    values: Vec<String>,
    host: Vec<String>,
    host_values: Vec<String>,
    marks: usize,
    key: Option<String>,
}

impl<'s> JsxCompiler<'s> {
    /// Take the scoping of the innermost component class around `at`.
    fn enter(&mut self, contexts: &[JsxContext], at: Span) {
        let ctx = contexts
            .iter()
            .filter(|c| c.span.start <= at.start && at.end <= c.span.end)
            .min_by_key(|c| c.span.end - c.span.start);
        self.scope = ctx.and_then(|c| c.scope.clone());
        self.emulate_slots = ctx.is_some_and(|c| c.emulate_slots);
    }

    fn new_builder() -> Builder {
        Builder {
            html: String::new(),
            parts: Vec::new(),
            values: Vec::new(),
            host: Vec::new(),
            host_values: Vec::new(),
            marks: 0,
            key: None,
        }
    }

    fn finish(&mut self, b: Builder, svg: bool) -> String {
        let host = if b.host.is_empty() {
            "null".to_owned()
        } else {
            format!("[{}]", b.host.join(", "))
        };
        let index = self.templates.len();
        self.templates.push(format!("{}, [{}], {svg}, {host}", json(&b.html), b.parts.join(", ")));
        let mut values = b.host_values;
        values.extend(b.values);
        match b.key {
            Some(k) => format!("__rs_t(__rs_tmpl{index}, [{}], {k})", values.join(", ")),
            None => format!("__rs_t(__rs_tmpl{index}, [{}])", values.join(", ")),
        }
    }

    /// `<Fn a={1}>kids</Fn>` → `__rs_fc(Fn, { a: 1 }, [kids])`.
    fn functional(&mut self, el: &JSXElement, tag: &str) -> Result<String, String> {
        let mut props = Vec::new();
        for a in &el.opening_element.attributes {
            match a {
                JSXAttributeItem::SpreadAttribute(sp) => props.push(format!("...{}", self.compile_in(sp.argument.span(), &sp.argument)?)),
                JSXAttributeItem::Attribute(attr) => {
                    let name = attr_name(attr);
                    let value = match &attr.value {
                        None => "true".to_owned(),
                        Some(JSXAttributeValue::StringLiteral(s)) => json(&s.value),
                        Some(JSXAttributeValue::ExpressionContainer(c)) => match c.expression.as_expression() {
                            Some(e) => self.compile_in(e.span(), e)?,
                            None => continue,
                        },
                        Some(JSXAttributeValue::Element(e)) => self.compile_root(JsxNode::Element(e))?,
                        Some(JSXAttributeValue::Fragment(f)) => self.compile_root(JsxNode::Fragment(f))?,
                    };
                    props.push(format!("{}: {value}", json(&name)));
                }
            }
        }
        let mut kids = Vec::new();
        for c in &el.children {
            match c {
                JSXChild::Text(t) => {
                    let txt = clean_jsx_text(&t.span.source_text(self.source));
                    if !txt.is_empty() {
                        kids.push(json(&txt.replace("&lt;", "<").replace("&gt;", ">")));
                    }
                }
                JSXChild::Element(e) => kids.push(self.compile_root(JsxNode::Element(e))?),
                JSXChild::Fragment(f) => kids.push(self.compile_root(JsxNode::Fragment(f))?),
                JSXChild::ExpressionContainer(c) => {
                    if let Some(e) = c.expression.as_expression() {
                        kids.push(self.compile_in(e.span(), e)?);
                    }
                }
                JSXChild::Spread(sp) => kids.push(format!("...{}", self.compile_in(sp.expression.span(), &sp.expression)?)),
            }
        }
        let tag_expr = match &el.opening_element.name {
            JSXElementName::MemberExpression(m) => m.span.source_text(self.source).to_owned(),
            _ => tag.to_owned(),
        };
        // A variable holding a tag name (`const Tag = 'a'`) renders an element: it takes the scope class.
        let scope = self.scope.as_ref().map_or(String::new(), |sc| format!(", {}", json(sc)));
        Ok(format!("__rs_fc({tag_expr}, {{ {} }}, [{}]{scope})", props.join(", "), kids.join(", ")))
    }

    fn is_functional(&self, el: &JSXElement) -> Option<String> {
        match &el.opening_element.name {
            JSXElementName::IdentifierReference(id) => {
                let n = id.name.to_string();
                (n != self.host_name && n != self.fragment_name).then_some(n)
            }
            JSXElementName::MemberExpression(m) => Some(m.span.source_text(self.source).to_owned()),
            _ => None,
        }
    }
    /// The source of an expression with the JSX inside it compiled.
    fn compile_in(&mut self, span: Span, expr: &Expression) -> Result<String, String> {
        let mut found = OutermostJsx::default();
        found.visit_expression(expr);
        let mut out = String::new();
        let mut at = span.start as usize;
        for node in found.0 {
            let s = node.span();
            out.push_str(&self.source[at..s.start as usize]);
            out.push_str(&self.compile_root(node)?);
            at = s.end as usize;
        }
        out.push_str(&self.source[at..span.end as usize]);
        Ok(out)
    }

    fn compile_root(&mut self, node: JsxNode) -> Result<String, String> {
        if let JsxNode::Element(el) = node {
            if let Some(tag) = self.is_functional(el) {
                return self.functional(el, &tag);
            }
        }
        let mut b = Self::new_builder();
        let mut svg = false;
        match node {
            JsxNode::Element(el) => {
                let tag = self.tag(el)?;
                if tag.as_deref() == Some(self.host_name.as_str()) {
                    for a in &el.opening_element.attributes {
                        self.attribute(a, &mut b, true, false)?;
                    }
                    self.children(&el.children, &mut b)?;
                } else {
                    if let Some(t) = &tag {
                        svg = SVG_CHILDREN.contains(&t.as_str());
                    }
                    self.element(el, &mut b, true)?;
                }
            }
            JsxNode::Fragment(f) => self.children(&f.children, &mut b)?,
        }
        Ok(self.finish(b, svg))
    }

    /// The tag of an element; `None` for a component reference other than Host/Fragment.
    fn tag(&self, el: &JSXElement) -> Result<Option<String>, String> {
        Ok(match &el.opening_element.name {
            JSXElementName::Identifier(id) => Some(id.name.to_string()),
            JSXElementName::IdentifierReference(id) => Some(id.name.to_string()),
            JSXElementName::NamespacedName(n) => Some(format!("{}:{}", n.namespace.name, n.name.name)),
            _ => None,
        })
    }

    fn element(&mut self, el: &JSXElement, b: &mut Builder, root: bool) -> Result<(), String> {
        let tag = self.tag(el)?.ok_or("stencilrs runtime: this JSX element name is not supported yet")?;
        if tag == self.fragment_name {
            return self.children(&el.children, b);
        }
        if tag == self.host_name {
            return Err("stencilrs runtime: <Host> must be the root of render()".into());
        }
        if self.is_functional(el).is_some() {
            let value = self.functional(el, &tag)?;
            self.hole(b, value);
            return Ok(());
        }
        if tag == "slot" && self.emulate_slots {
            let mut name = String::new();
            for a in &el.opening_element.attributes {
                if let JSXAttributeItem::Attribute(attr) = a {
                    if attr_name(attr) == "name" {
                        match &attr.value {
                            Some(JSXAttributeValue::StringLiteral(s)) => name = s.value.to_string(),
                            _ => return Err("stencilrs runtime: a <slot> name must be a string literal".into()),
                        }
                    }
                }
            }
            let fallback = if el.children.is_empty() {
                "null".to_owned()
            } else {
                let mut fb = Self::new_builder();
                self.children(&el.children, &mut fb)?;
                self.finish(fb, false)
            };
            b.html.push_str("<!--rs-->");
            b.parts.push(format!("[{}, {SLOT}, {}]", b.marks, json(&name)));
            b.marks += 1;
            b.values.push(fallback);
            return Ok(());
        }
        let custom = tag.contains('-');
        // Scoped: every element gets the scope class; a slot's container also `-s`.
        let holds_slot = self.emulate_slots
            && el.children.iter().any(|c| matches!(c, JSXChild::Element(e) if matches!(&e.opening_element.name, JSXElementName::Identifier(i) if i.name == "slot")));
        self.pending_class = match (&self.scope, holds_slot) {
            (Some(sc), true) => Some(format!("{sc} {sc}-s")),
            (Some(sc), false) => Some(sc.clone()),
            (None, _) => None,
        };
        b.html.push('<');
        b.html.push_str(&tag);
        let mark = b.marks;
        let before = b.parts.len();
        for a in &el.opening_element.attributes {
            if let JSXAttributeItem::Attribute(attr) = a {
                if root && attr_name(attr) == "key" {
                    if let Some(JSXAttributeValue::ExpressionContainer(c)) = &attr.value {
                        if let Some(e) = c.expression.as_expression() {
                            b.key = Some(self.compile_in(e.span(), e)?);
                        }
                    } else if let Some(JSXAttributeValue::StringLiteral(s)) = &attr.value {
                        b.key = Some(json(&s.value));
                    }
                    continue;
                }
            }
            self.static_or_part(a, b, mark, custom)?;
        }
        if let Some(extra) = self.pending_class.take() {
            b.html.push_str(&format!(" class=\"{extra}\""));
        }
        if b.parts.len() > before {
            b.html.push_str(" rs");
            b.marks += 1;
        }
        b.html.push('>');
        if VOID.contains(&tag.as_str()) {
            if !el.children.is_empty() {
                return Err(format!("<{tag}> cannot have children"));
            }
            return Ok(());
        }
        if matches!(tag.as_str(), "textarea" | "title" | "style" | "script")
            && el.children.iter().any(|c| !matches!(c, JSXChild::Text(_)))
        {
            return Err(format!("stencilrs runtime: expressions inside <{tag}> are not supported yet"));
        }
        self.children(&el.children, b)?;
        b.html.push_str("</");
        b.html.push_str(&tag);
        b.html.push('>');
        Ok(())
    }

    /// Attributes of `<Host>`: all dynamic, bound to the element itself.
    fn attribute(&mut self, a: &JSXAttributeItem, b: &mut Builder, host: bool, _custom: bool) -> Result<(), String> {
        debug_assert!(host);
        let (ty, name, value) = self.classify(a, true)?;
        if let Some((ty, name, value)) = ty.map(|t| (t, name, value)) {
            b.host.push(match name {
                Some(n) => format!("[{ty}, {}]", json(&n)),
                None => format!("[{ty}]"),
            });
            b.host_values.push(value);
        }
        Ok(())
    }

    fn static_or_part(&mut self, a: &JSXAttributeItem, b: &mut Builder, mark: usize, custom: bool) -> Result<(), String> {
        if let JSXAttributeItem::Attribute(attr) = a {
            let name = html_attr_name(&attr_name(attr));
            let plain = !custom || matches!(name.as_str(), "class" | "id" | "slot" | "style" | "part");
            let simple = !name.chars().any(|c| c.is_ascii_uppercase()) && !name.starts_with("on");
            match &attr.value {
                None if plain && simple => {
                    b.html.push(' ');
                    b.html.push_str(&name);
                    return Ok(());
                }
                Some(JSXAttributeValue::StringLiteral(s)) if plain && simple => {
                    let raw = &self.source[s.span.start as usize + 1..s.span.end as usize - 1];
                    if name == "class" {
                        if let Some(extra) = self.pending_class.take() {
                            b.html.push_str(&format!(" class=\"{} {extra}\"", raw.replace('"', "&quot;")));
                            return Ok(());
                        }
                    }
                    b.html.push_str(&format!(" {name}=\"{}\"", raw.replace('"', "&quot;")));
                    return Ok(());
                }
                _ => {}
            }
        }
        let (ty, name, value) = self.classify(a, custom)?;
        if let Some(ty) = ty {
            b.parts.push(match name {
                Some(n) => format!("[{mark}, {ty}, {}]", json(&n)),
                None => format!("[{mark}, {ty}]"),
            });
            b.values.push(value);
        }
        Ok(())
    }

    /// A dynamic attribute: its part type, name and value expression.
    fn classify(&mut self, a: &JSXAttributeItem, _custom: bool) -> Result<(Option<u8>, Option<String>, String), String> {
        match a {
            JSXAttributeItem::SpreadAttribute(s) => Ok((Some(SPREAD), None, self.compile_in(s.argument.span(), &s.argument)?)),
            JSXAttributeItem::Attribute(attr) => {
                let name = attr_name(attr);
                let value = match &attr.value {
                    None => "true".to_owned(),
                    Some(JSXAttributeValue::StringLiteral(s)) => json(&s.value),
                    Some(JSXAttributeValue::ExpressionContainer(c)) => match c.expression.as_expression() {
                        Some(e) => self.compile_in(e.span(), e)?,
                        None => return Ok((None, None, String::new())),
                    },
                    Some(JSXAttributeValue::Element(e)) => self.compile_root(JsxNode::Element(e))?,
                    Some(JSXAttributeValue::Fragment(f)) => self.compile_root(JsxNode::Fragment(f))?,
                };
                Ok(match name.as_str() {
                    "key" => (None, None, value),
                    "class" | "className" => (Some(CLASS), None, value),
                    "style" => (Some(STYLE), None, value),
                    "ref" => (Some(REF), None, value),
                    n if n.len() > 2 && n.starts_with("on") && (n.as_bytes()[2].is_ascii_uppercase() || n.as_bytes()[2] == b'-') => {
                        (Some(EVENT), Some(n.to_owned()), value)
                    }
                    n => (Some(ATTR), Some(n.to_owned()), value),
                })
            }
        }
    }

    fn children(&mut self, children: &[JSXChild], b: &mut Builder) -> Result<(), String> {
        for child in children {
            match child {
                JSXChild::Text(t) => b.html.push_str(&clean_jsx_text(&t.span.source_text(self.source))),
                JSXChild::Element(el) => {
                    let tag = self.tag(el)?;
                    if tag.as_deref() == Some(self.host_name.as_str()) {
                        return Err("stencilrs runtime: <Host> must be the root of render()".into());
                    }
                    self.element(el, b, false)?
                }
                JSXChild::Fragment(f) => self.children(&f.children, b)?,
                JSXChild::ExpressionContainer(c) => {
                    let Some(e) = c.expression.as_expression() else { continue };
                    let value = self.compile_in(e.span(), e)?;
                    self.hole(b, value);
                }
                JSXChild::Spread(s) => {
                    let value = self.compile_in(s.expression.span(), &s.expression)?;
                    self.hole(b, value);
                }
            }
        }
        Ok(())
    }

    fn hole(&mut self, b: &mut Builder, value: String) {
        b.html.push_str("<!--rs-->");
        b.parts.push(format!("[{}, {NODE}]", b.marks));
        b.marks += 1;
        b.values.push(value);
    }
}

fn attr_name(attr: &JSXAttribute) -> String {
    match &attr.name {
        JSXAttributeName::Identifier(id) => id.name.to_string(),
        JSXAttributeName::NamespacedName(n) => format!("{}:{}", n.namespace.name, n.name.name),
    }
}

fn html_attr_name(name: &str) -> String {
    match name {
        "className" => "class".into(),
        "htmlFor" => "for".into(),
        n => n.to_owned(),
    }
}

/// JSX whitespace: lines trimmed (but the first line's start and the last line's end), empty
/// lines dropped, the rest joined with a space. Then escaped for HTML.
fn clean_jsx_text(raw: &str) -> String {
    let lines: Vec<&str> = raw.split('\n').collect();
    let last_non_empty = lines.iter().rposition(|l| !l.trim().is_empty());
    let mut out = String::new();
    for (i, line) in lines.iter().enumerate() {
        let line = line.replace('\t', " ").replace('\r', "");
        let mut s: &str = &line;
        if i != 0 {
            s = s.trim_start();
        }
        if i != lines.len() - 1 {
            s = s.trim_end();
        }
        if !s.is_empty() {
            out.push_str(s);
            if Some(i) != last_non_empty {
                out.push(' ');
            }
        }
    }
    out.replace('<', "&lt;").replace('>', "&gt;")
}
