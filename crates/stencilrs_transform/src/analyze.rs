//! Decorator extraction straight to component metadata.
//!
//! Ports the metadata half of Stencil's `convertDecoratorsToStatic`
//! (`transformers/decorators-to-static/*`) without the static-getter round trip:
//! `@Component`, `@Prop`, `@State`, `@Event`, `@Method`, `@Element`, `@Watch`, `@Listen`.

use std::collections::HashMap;

use oxc::ast::ast::{
    Class, ClassElement, Declaration, Decorator, ExportDefaultDeclarationKind, Expression,
    ImportDeclarationSpecifier, MethodDefinitionKind, Program, PropertyKey, Statement,
    TSAccessibility,
};
use oxc::span::{GetSpan, Span};
use serde_json::Value;

use crate::eval::{eval_argument, property_key_name};
use crate::meta::*;
use crate::prop_type::{LocalType, LocalTypes, classify_annotation, classify_initializer};

const STENCIL_DECORATORS: [&str; 11] = [
    "Component", "Prop", "State", "Event", "Method", "Element", "Watch", "Listen",
    "AttachInternals", "PropSerialize", "AttrDeserialize",
];

pub struct Analysis {
    pub components: Vec<ComponentMeta>,
    pub diagnostics: Vec<Diagnostic>,
}

struct Ctx<'s> {
    source: &'s str,
    /// Stencil decorator name → local name (`import { Prop as P }` maps `Prop` → `P`).
    aliases: HashMap<&'static str, String>,
    diagnostics: Vec<Diagnostic>,
}

impl Ctx<'_> {
    fn name(&self, decorator: &'static str) -> &str {
        self.aliases.get(decorator).map_or(decorator, String::as_str)
    }

    fn text(&self, span: Span) -> &str {
        span.source_text(self.source)
    }

    fn push(&mut self, level: Level, message: impl Into<String>, span: Span) {
        self.diagnostics.push(Diagnostic { level, message: message.into(), start: span.start, end: span.end });
    }
}

pub fn analyze_program(program: &Program, source: &str) -> Analysis {
    let mut ctx = Ctx { source, aliases: import_aliases(program), diagnostics: Vec::new() };
    let locals = local_types(program);
    let mut components = Vec::new();

    for stmt in &program.body {
        let class = match stmt {
            Statement::ClassDeclaration(c) => Some(&**c),
            Statement::ExportDeclaration(e) => match &e.declaration {
                Declaration::ClassDeclaration(c) => Some(&**c),
                _ => None,
            },
            Statement::ExportDefaultDeclaration(e) => match &e.declaration {
                ExportDefaultDeclarationKind::ClassDeclaration(c) => Some(&**c),
                _ => None,
            },
            _ => None,
        };
        if let Some(class) = class {
            if let Some(cmp) = analyze_class(&mut ctx, class, &locals) {
                components.push(cmp);
            }
        }
    }

    Analysis { components, diagnostics: ctx.diagnostics }
}

/// Port of `ImportAliasMap`: Stencil matches any import whose specifier contains `@stencil/core`.
fn import_aliases(program: &Program) -> HashMap<&'static str, String> {
    let mut aliases = HashMap::new();
    for stmt in &program.body {
        let Statement::ImportDeclaration(import) = stmt else { continue };
        if !import.source.value.contains("@stencil/core") {
            continue;
        }
        for spec in import.specifiers.iter().flatten() {
            let ImportDeclarationSpecifier::ImportSpecifier(s) = spec else { continue };
            let imported = s.imported.name();
            if let Some(name) = STENCIL_DECORATORS.iter().find(|d| **d == imported.as_str()) {
                aliases.insert(*name, s.local.name.to_string());
            }
        }
    }
    aliases
}

fn local_types<'a, 'b>(program: &'b Program<'a>) -> LocalTypes<'a, 'b> {
    let mut locals = LocalTypes::new();
    for stmt in &program.body {
        let decl = match stmt {
            Statement::ExportDeclaration(e) => Some(&e.declaration),
            other => other.as_declaration(),
        };
        match decl {
            Some(Declaration::TSTypeAliasDeclaration(t)) => {
                locals.insert(t.id.name.as_str(), LocalType::Alias(&t.type_annotation));
            }
            Some(Declaration::TSEnumDeclaration(e)) => {
                locals.insert(e.id.name.as_str(), LocalType::Enum(e));
            }
            Some(Declaration::TSInterfaceDeclaration(i)) => {
                locals.insert(i.id.name.as_str(), LocalType::Object);
            }
            Some(Declaration::ClassDeclaration(c)) => {
                if let Some(id) = &c.id {
                    locals.insert(id.name.as_str(), LocalType::Object);
                }
            }
            _ => {}
        }
    }
    locals
}

/// The decorator's call expression when its callee is `name` (Stencil's `isDecoratorNamed`).
fn decorator_call<'d, 'a>(decorators: &'d [Decorator<'a>], name: &str) -> Vec<&'d oxc::ast::ast::CallExpression<'a>> {
    decorators
        .iter()
        .filter_map(|d| match &d.expression {
            Expression::CallExpression(call) => match &call.callee {
                Expression::Identifier(id) if id.name == name => Some(&**call),
                _ => None,
            },
            _ => None,
        })
        .collect()
}

fn arg(call: &oxc::ast::ast::CallExpression, i: usize) -> Option<Value> {
    call.arguments.get(i).and_then(eval_argument)
}

fn opt_str(v: &Option<Value>, key: &str) -> Option<String> {
    v.as_ref()?.get(key)?.as_str().map(str::to_owned)
}

fn opt_bool(v: &Option<Value>, key: &str) -> Option<bool> {
    v.as_ref()?.get(key)?.as_bool()
}

fn analyze_class(ctx: &mut Ctx, class: &Class, locals: &LocalTypes) -> Option<ComponentMeta> {
    let component_name = ctx.name("Component").to_owned();
    let cmp_call = *decorator_call(&class.decorators, &component_name).first()?;
    let opts = arg(cmp_call, 0);
    if cmp_call.arguments.first().is_some() && opts.is_none() {
        ctx.push(Level::Error, "invalid decorator argument", cmp_call.span);
    }

    for removed in ["shadow", "scoped", "formAssociated"] {
        if opts.as_ref().and_then(|o| o.get(removed)).is_some() {
            ctx.push(
                Level::Error,
                format!("@Component() \"{removed}\" was removed in Stencil v5; use \"encapsulation\" (or @AttachInternals for formAssociated)."),
                cmp_call.span,
            );
        }
    }

    let tag_name = opt_str(&opts, "tag").unwrap_or_default();
    if tag_name.is_empty() {
        ctx.push(Level::Error, "Missing \"tag\" property in the @Component() decorator.", cmp_call.span);
    } else if !tag_name.contains('-') {
        ctx.push(Level::Error, format!("\"{tag_name}\" tag must contain a dash (-) to work as a valid web component."), cmp_call.span);
    }

    let encapsulation = match opts.as_ref().and_then(|o| o.pointer("/encapsulation/type")).and_then(Value::as_str) {
        Some("shadow") => Encapsulation::Shadow,
        Some("scoped") => Encapsulation::Scoped,
        _ => Encapsulation::None,
    };

    let mut style_urls = Vec::new();
    if let Some(url) = opt_str(&opts, "styleUrl") {
        style_urls.push(url);
    }
    if let Some(Value::Array(urls)) = opts.as_ref().and_then(|o| o.get("styleUrls")) {
        style_urls.extend(urls.iter().filter_map(Value::as_str).map(str::to_owned));
    }

    let mut cmp = ComponentMeta {
        tag_name,
        component_class_name: class.id.as_ref().map(|id| id.name.to_string()).unwrap_or_default(),
        encapsulation,
        style_urls,
        properties: Vec::new(),
        states: Vec::new(),
        events: Vec::new(),
        methods: Vec::new(),
        listeners: Vec::new(),
        watchers: Vec::new(),
        element_ref: None,
    };

    let [prop_n, state_n, event_n, method_n, element_n, watch_n, listen_n] =
        ["Prop", "State", "Event", "Method", "Element", "Watch", "Listen"].map(|d| ctx.name(d).to_owned());

    // Setters are needed to mark `@Prop() get x()` as having a setter.
    let setters: Vec<String> = class
        .body
        .body
        .iter()
        .filter_map(|el| match el {
            ClassElement::MethodDefinition(m) if m.kind == MethodDefinitionKind::Set => property_key_name(&m.key),
            _ => None,
        })
        .collect();

    for el in &class.body.body {
        match el {
            ClassElement::PropertyDefinition(p) => {
                let Some(name) = member_name(ctx, &p.key) else { continue };

                if let Some(call) = decorator_call(&p.decorators, &prop_n).first() {
                    check_private(ctx, p.accessibility, "@Prop()", p.span);
                    let opts = arg(call, 0);
                    let prop_type = match &p.type_annotation {
                        Some(t) => classify_annotation(&t.type_annotation, locals),
                        None => classify_initializer(p.value.as_ref()),
                    };
                    let original = p
                        .type_annotation
                        .as_ref()
                        .map(|t| ctx.text(t.type_annotation.span()).to_owned())
                        .unwrap_or_else(|| inferred_original(prop_type));
                    let default_value = p.value.as_ref().map(|v| ctx.text(v.span()).to_owned());
                    cmp.properties.push(build_prop(ctx, name.clone(), prop_type, &opts, p.definite, p.optional, false, false, default_value, original, call.span));
                }

                if !decorator_call(&p.decorators, &state_n).is_empty() {
                    cmp.states.push(StateMeta { name: name.clone() });
                }

                if let Some(call) = decorator_call(&p.decorators, &event_n).first() {
                    let opts = arg(call, 0);
                    let event_name = opt_str(&opts, "eventName").map(|s| s.trim().to_owned()).filter(|s| !s.is_empty()).unwrap_or_else(|| name.clone());
                    cmp.events.push(EventMeta {
                        name: event_name,
                        method: name.clone(),
                        bubbles: opt_bool(&opts, "bubbles").unwrap_or(true),
                        cancelable: opt_bool(&opts, "cancelable").unwrap_or(true),
                        composed: opt_bool(&opts, "composed").unwrap_or(true),
                    });
                }

                if !decorator_call(&p.decorators, &element_n).is_empty() {
                    if cmp.element_ref.is_some() {
                        ctx.push(Level::Error, "Only one @Element() decorator is allowed per component.", p.span);
                    }
                    cmp.element_ref = Some(name.clone());
                }
            }
            ClassElement::MethodDefinition(m) => {
                let Some(name) = member_name(ctx, &m.key) else { continue };

                if m.kind == MethodDefinitionKind::Get {
                    if let Some(call) = decorator_call(&m.decorators, &prop_n).first() {
                        check_private(ctx, m.accessibility, "@Prop()", m.span);
                        let opts = arg(call, 0);
                        let prop_type = match &m.value.return_type {
                            Some(t) => classify_annotation(&t.type_annotation, locals),
                            None => PropType::Unknown,
                        };
                        let original = m.value.return_type.as_ref().map(|t| ctx.text(t.type_annotation.span()).to_owned()).unwrap_or_else(|| inferred_original(prop_type));
                        let has_setter = setters.contains(&name);
                        cmp.properties.push(build_prop(ctx, name.clone(), prop_type, &opts, false, m.optional, true, has_setter, None, original, call.span));
                    }
                }

                if m.kind == MethodDefinitionKind::Method {
                    if !decorator_call(&m.decorators, &method_n).is_empty() {
                        check_private(ctx, m.accessibility, "@Method()", m.span);
                        cmp.methods.push(MethodMeta { name: name.clone() });
                    }
                    for call in decorator_call(&m.decorators, &watch_n) {
                        match arg(call, 0) {
                            Some(Value::String(prop_name)) => cmp.watchers.push(WatcherMeta { prop_name, method_name: name.clone() }),
                            _ => ctx.push(Level::Error, "stencilrs: @Watch() argument must be a string literal (const evaluation not ported yet).", call.span),
                        }
                    }
                    for call in decorator_call(&m.decorators, &listen_n) {
                        let Some(Value::String(event)) = arg(call, 0) else {
                            ctx.push(Level::Error, "stencilrs: @Listen() event must be a string literal (const evaluation not ported yet).", call.span);
                            continue;
                        };
                        if event.split(',').count() > 1 {
                            ctx.push(Level::Error, "Please use multiple @Listen() decorators instead of comma-separated names.", call.span);
                        }
                        let event = event.split(',').next().unwrap_or_default().trim().to_owned();
                        let opts = arg(call, 1);
                        let target = opt_str(&opts, "target");
                        if target.as_deref() == Some("parent") {
                            ctx.push(Level::Error, "The \"parent\" target is no longer available as of Stencil 2. Please use \"window\", \"document\" or \"body\" instead.", call.span);
                        }
                        cmp.listeners.push(ListenerMeta {
                            passive: opt_bool(&opts, "passive").unwrap_or_else(|| PASSIVE_TRUE_DEFAULTS.contains(&event.to_lowercase().as_str())),
                            capture: opt_bool(&opts, "capture").unwrap_or(false),
                            name: event,
                            method: name.clone(),
                            target,
                        });
                    }
                }
            }
            _ => {}
        }
    }

    Some(cmp)
}

#[allow(clippy::too_many_arguments)]
fn build_prop(
    ctx: &mut Ctx,
    name: String,
    prop_type: PropType,
    opts: &Option<Value>,
    definite: bool,
    optional: bool,
    getter: bool,
    setter: bool,
    default_value: Option<String>,
    complex_type_original: String,
    span: Span,
) -> PropMeta {
    if name.starts_with("on") && name[2..].starts_with(|c: char| c == '-' || c.is_ascii_uppercase()) {
        ctx.push(Level::Warn, format!("The @Prop() name \"{name}\" looks like an event. Please use the \"@Event()\" decorator to expose events instead, not properties or methods."), span);
    }
    if opts.as_ref().and_then(|o| o.get("reflectToAttr")).is_some() {
        ctx.push(Level::Error, "@Prop option \"reflectToAttr\" should be renamed to \"reflect\".", span);
    }

    // Port of the reflect / attribute rules in `parsePropDecorator` (no serializers yet).
    let reflect = (prop_type != PropType::Unknown).then(|| opt_bool(opts, "reflect").unwrap_or(false));
    let attribute = if prop_type != PropType::Unknown || reflect == Some(true) {
        match opts.as_ref().and_then(|o| o.get("attribute")) {
            Some(Value::Null) => None,
            Some(Value::String(a)) if !a.trim().is_empty() => Some(a.trim().to_lowercase()),
            _ => Some(to_dash_case(&name)),
        }
    } else {
        None
    };

    PropMeta {
        required: definite && name != "mode",
        mutable: opt_bool(opts, "mutable").unwrap_or(false),
        name,
        prop_type,
        optional,
        getter,
        setter,
        reflect,
        attribute,
        default_value,
        complex_type_original,
    }
}

fn member_name(ctx: &mut Ctx, key: &PropertyKey) -> Option<String> {
    let name = property_key_name(key);
    if name.is_none() && key.is_expression() {
        ctx.push(Level::Error, "stencilrs: computed member names are not supported yet.", key.span());
    }
    name
}

fn check_private(ctx: &mut Ctx, accessibility: Option<TSAccessibility>, decorator: &str, span: Span) {
    if matches!(accessibility, Some(TSAccessibility::Private | TSAccessibility::Protected)) {
        ctx.push(Level::Error, format!("Members decorated with {decorator} cannot be \"private\" nor \"protected\"."), span);
    }
}

/// What `typeToString` prints for a widened initializer type.
fn inferred_original(t: PropType) -> String {
    match t {
        PropType::Any => "any",
        PropType::Boolean => "boolean",
        PropType::Number => "number",
        PropType::String => "string",
        PropType::Unknown => "unknown",
    }
    .to_owned()
}

/// Port of Stencil's `toDashCase` (`src/utils/helpers.ts:15`).
pub fn to_dash_case(s: &str) -> String {
    let mut spaced = String::with_capacity(s.len() + 4);
    for c in s.chars() {
        if c.is_ascii_uppercase() || c.is_ascii_digit() {
            spaced.push(' ');
        }
        spaced.push(c);
    }
    spaced.trim().split(' ').collect::<Vec<_>>().join("-").to_lowercase()
}

const PASSIVE_TRUE_DEFAULTS: [&str; 32] = [
    "dragstart", "drag", "dragend", "dragenter", "dragover", "dragleave", "drop", "mouseenter",
    "mouseover", "mousemove", "mousedown", "mouseup", "mouseleave", "mouseout", "mousewheel",
    "pointerover", "pointerenter", "pointerdown", "pointermove", "pointerup", "pointercancel",
    "pointerout", "pointerleave", "resize", "scroll", "touchstart", "touchmove", "touchend",
    "touchenter", "touchleave", "touchcancel", "wheel",
];
