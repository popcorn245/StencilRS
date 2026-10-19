//! Decorator extraction straight to component metadata.
//!
//! Ports the metadata half of Stencil's `convertDecoratorsToStatic`
//! (`transformers/decorators-to-static/*`) plus `parseStaticComponentMeta`'s normalisation,
//! without the static-getter round trip: `@Component`, `@Prop`, `@State`, `@Event`, `@Method`,
//! `@Element`, `@Watch`, `@Listen`.
//!
//! Behaviour follows Stencil's single-file `transpileSync` (no lib, no imports resolved),
//! which is what `@stencil/unplugin` runs. Where that differs from a full build it is noted.

use std::collections::HashMap;

use oxc::ast::ast::{
    Argument, ArrowFunctionExpression, CallExpression, Class, ClassElement, Declaration, Decorator,
    ExportDefaultDeclarationKind, Expression, Function, ImportDeclarationSpecifier,
    ImportOrExportKind, MethodDefinition, MethodDefinitionKind, ObjectExpression, ObjectPropertyKind,
    Program, PropertyDefinition,
    PropertyKey, ReturnStatement, Statement, TSAccessibility, TSType, TSTypeName,
};
use oxc::ast_visit::Visit;
use oxc::span::{GetSpan, Span};
use oxc::syntax::scope::ScopeFlags;
use serde_json::Value;

use crate::default_value::initializer_text;
use crate::inherit;
use crate::consts::{Lit, computed_key_text, literal, order_like_object_keys};
use crate::eval::{Arg, eval_argument, property_key_name};
use crate::locals::{LocalType, Locals};
use crate::meta::*;
use crate::prop_type::{classify_annotation, classify_initializer};
use crate::resolve::Resolver;
use crate::scope_css::{scope_css, scope_id};

const STENCIL_DECORATORS: [&str; 11] = [
    "Component", "Prop", "State", "Event", "Method", "Element", "Watch", "Listen",
    "AttachInternals", "PropSerialize", "AttrDeserialize",
];

const DEPRECATED_API_MESSAGE: &str = r#"@Component() uses deprecated API removed in Stencil v5.

The "shadow", "scoped", and "formAssociated" properties have been replaced:
  • shadow: true → encapsulation: { type: "shadow" }
  • scoped: true → encapsulation: { type: "scoped" }
  • formAssociated: true → Use @AttachInternals() decorator

Run 'npx stencil migrate --dry-run' to see all affected files.
Run 'npx stencil migrate' to automatically update your components."#;

const SINGLE_EXPORT_MESSAGE: &str = "To allow efficient bundling, modules using @Component() can only have a single export which is the component class itself.
      Any other exports should be moved to a separate file.
      For further information check out: https://stenciljs.com/docs/module-bundling";

pub struct Analysis {
    pub components: Vec<ComponentMeta>,
    pub diagnostics: Vec<Diagnostic>,
    /// Stencil threw: `transpileSync` hands the source back unchanged.
    pub failed: bool,
}

struct Ctx<'s> {
    source: &'s str,
    /// This module's path, for following imports (ancestors, build-accurate types).
    file: &'s str,
    resolver: Option<&'s Resolver>,
    /// Stencil decorator name → local name (`import { Prop as P }` maps `Prop` → `P`).
    aliases: HashMap<&'static str, String>,
    diagnostics: Vec<Diagnostic>,
    /// What Stencil threw, if it did: the transform fails with only this (first) message.
    thrown: Option<String>,
}

impl Ctx<'_> {
    fn name(&self, decorator: &'static str) -> String {
        self.aliases.get(decorator).cloned().unwrap_or_else(|| decorator.to_owned())
    }

    fn text(&self, span: Span) -> &str {
        span.source_text(self.source)
    }

    fn push(&mut self, level: Level, message: impl Into<String>, span: Span) {
        self.diagnostics.push(Diagnostic { level, message: message.into(), start: span.start, end: span.end });
    }

    /// Evaluate argument `i`; `None` when absent or when Stencil throws on it.
    fn arg(&mut self, call: &CallExpression, i: usize, locals: &Locals) -> Option<Value> {
        match eval_argument(call.arguments.get(i)?, self.source, locals) {
            Arg::Value(v) => Some(v),
            Arg::Lit(Lit::Str(s)) => Some(Value::String(s)),
            Arg::Lit(Lit::Num(n)) => Some(Value::from(n)),
            Arg::Throw(message) => {
                self.throw(message);
                None
            }
        }
    }

    /// Stencil throws: an exception, not a diagnostic. The first one wins.
    fn throw(&mut self, message: impl Into<String>) {
        self.thrown.get_or_insert_with(|| message.into());
    }

    /// A member's name: `[KEY]` as written, or (`resolve`, as `tsPropDeclName` does for
    /// `@Prop`, `@State`, `@AttachInternals`) the value of its literal type.
    fn member_name(&self, key: &PropertyKey, computed: bool, resolve: bool, locals: &Locals) -> Option<String> {
        if !computed {
            return property_key_name(key);
        }
        let expr = key.as_expression()?;
        match resolve.then(|| literal(expr, locals)).flatten() {
            Some(lit) => Some(lit.to_js_string()),
            None => Some(computed_key_text(key, self.source)),
        }
    }
}

/// `resolver` switches on build-accurate mode (see `resolve.rs`); `file` is this module's path.
pub fn analyze_program(program: &Program, source: &str, resolver: Option<&Resolver>, file: &str) -> Analysis {
    let mut ctx = Ctx { source, file, resolver, aliases: import_aliases(program), diagnostics: Vec::new(), thrown: None };
    let locals = Locals::collect(program).with_resolver(resolver, file);
    let exports = value_exports(program, &locals);
    let mut components = Vec::new();

    let mut top_level = Vec::new();
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
            top_level.push(class.span);
            if let Some(cmp) = analyze_class(&mut ctx, class, &locals, &exports, program) {
                components.push(cmp);
            }
        }
    }

    // Every other class declaration with decorated members (base classes, mixins, at any
    // depth) goes through `convertDecoratorsToStatic` too, which reports on its members.
    let mut others = OtherDecoratedClasses { ctx: &mut ctx, locals: &locals, skip: top_level };
    others.visit_program(program);

    // A thrown error fails the whole transform: no components, only that message.
    if let Some(message) = ctx.thrown {
        return Analysis { components: Vec::new(), diagnostics: vec![Diagnostic { level: Level::Error, message, start: 0, end: 0 }], failed: true };
    }
    Analysis { components, diagnostics: ctx.diagnostics, failed: false }
}

/// Reads the members of every class declaration (not expression) that has a decorated member,
/// other than the top-level classes `analyze_program` already read, for their diagnostics.
struct OtherDecoratedClasses<'c, 's, 'l, 'x, 'y> {
    ctx: &'c mut Ctx<'s>,
    locals: &'l Locals<'x, 'y>,
    skip: Vec<Span>,
}

impl<'a> Visit<'a> for OtherDecoratedClasses<'_, '_, '_, '_, 'a> {
    fn visit_class(&mut self, class: &Class<'a>) {
        let decorated = class.body.body.iter().any(|el| match el {
            ClassElement::PropertyDefinition(p) => !p.decorators.is_empty(),
            ClassElement::MethodDefinition(m) => !m.decorators.is_empty(),
            ClassElement::AccessorProperty(a) => !a.decorators.is_empty(),
            _ => false,
        });
        if class.is_declaration() && decorated && !self.skip.contains(&class.span) {
            class_members(self.ctx, class, self.locals);
        }
        oxc::ast_visit::walk::walk_class(self, class);
    }
}

/// Port of `ImportAliasMap`: Stencil matches any import whose specifier contains `@stencil/core`.
pub(crate) fn import_aliases(program: &Program) -> HashMap<&'static str, String> {
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

/// Names the module exports that are not interfaces, type aliases or enums: what
/// `typeChecker.getExportsOfModule(...)` returns after Stencil's `SymbolFlags` filter
/// (`component-decorator.ts:305-313`).
fn value_exports(program: &Program, locals: &Locals) -> Vec<(String, Span)> {
    let is_type_local =
        |name: &str| matches!(locals.types.get(name), Some(LocalType::Alias(_) | LocalType::Enum(_) | LocalType::Interface(_)));
    let mut out = Vec::new();
    for stmt in &program.body {
        match stmt {
            Statement::ExportDeclaration(e) => match &e.declaration {
                Declaration::VariableDeclaration(v) if !v.declare => {
                    for d in &v.declarations {
                        for id in d.id.get_binding_identifiers() {
                            out.push((id.name.to_string(), d.span));
                        }
                    }
                }
                Declaration::FunctionDeclaration(f) if !f.declare => {
                    if let Some(id) = &f.id {
                        out.push((id.name.to_string(), f.span));
                    }
                }
                Declaration::ClassDeclaration(c) if !c.declare => {
                    if let Some(id) = &c.id {
                        out.push((id.name.to_string(), c.span));
                    }
                }
                _ => {}
            },
            Statement::ExportDefaultDeclaration(e) => out.push(("default".to_owned(), e.span)),
            Statement::ExportNamedDeclaration(e) if e.export_kind != ImportOrExportKind::Type => {
                for s in &e.specifiers {
                    if s.export_kind != ImportOrExportKind::Type && !is_type_local(s.local.name().as_str()) {
                        out.push((s.exported.name().to_string(), s.span));
                    }
                }
            }
            Statement::ExportFromDeclaration(e) if e.export_kind != ImportOrExportKind::Type => {
                for s in &e.specifiers {
                    if s.export_kind != ImportOrExportKind::Type {
                        out.push((s.exported.name().to_string(), s.span));
                    }
                }
            }
            Statement::TSExportAssignment(e) => out.push(("export=".to_owned(), e.span)),
            _ => {}
        }
    }
    out
}

/// The decorator's call expressions whose callee is `name` (Stencil's `isDecoratorNamed`).
fn decorator_calls<'d, 'a>(decorators: &'d [Decorator<'a>], name: &str) -> Vec<&'d CallExpression<'a>> {
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

fn opt_str(v: &Option<Value>, key: &str) -> Option<String> {
    v.as_ref()?.get(key)?.as_str().map(str::to_owned)
}

fn opt_bool(v: &Option<Value>, key: &str) -> Option<bool> {
    v.as_ref()?.get(key)?.as_bool()
}

fn analyze_class(ctx: &mut Ctx, class: &Class, locals: &Locals, exports: &[(String, Span)], program: &Program) -> Option<ComponentMeta> {
    let component_name = ctx.name("Component");
    let cmp_call = *decorator_calls(&class.decorators, &component_name).first()?;
    let class_name = class.id.as_ref().map(|id| id.name.to_string()).unwrap_or_default();

    // Port of `componentDecoratorToStatic`: a component that fails validation produces no
    // metadata, but its members are still converted (and still report diagnostics).
    let component = component_options(ctx, cmp_call, &class_name, exports, locals);
    report_unported(ctx, class, component.as_ref().map(|c| (c.0.as_str(), &c.3)));

    let own = class_members(ctx, class, locals);
    let mut cmp = ComponentMeta {
        tag_name: String::new(),
        component_class_name: class_name,
        encapsulation: Encapsulation::None,
        style_urls: Vec::new(),
        properties: own.properties,
        states: own.states,
        events: own.events,
        methods: own.methods,
        listeners: own.listeners,
        watchers: own.watchers,
        element_ref: own.element_ref,
        attach_internals_member_name: own.attach_internals_member_name,
        attach_internals_custom_states: own.attach_internals_custom_states,
        form_associated: own.form_associated,
        serializers: own.serializers,
        deserializers: own.deserializers,
        options: Value::Null,
        does_extend: false,
        base_class_files: Vec::new(),
    };
    if let Some((tag, encapsulation, style_urls, options)) = &component {
        cmp.options = options.clone();
        cmp.tag_name = tag.clone();
        cmp.encapsulation = *encapsulation;
        cmp.style_urls = style_urls.clone();
    }

    // `mergeExtendedClassMetaWithResolveImport`: inherited members, parents first; the class's
    // own members win.
    if class.heritage.is_some() {
        let found = inherit::ancestors(class, inherit::Module { program, source: ctx.source, file: ctx.file }, ctx.resolver);
        ctx.diagnostics.extend(found.warnings);
        for parent in found.members {
            cmp.does_extend = true;
            let props: Vec<PropMeta> = parent.properties.into_iter().filter(|p| !cmp.states.iter().any(|s| s.name == p.name)).collect();
            let states: Vec<StateMeta> = parent.states.into_iter().filter(|s| !cmp.properties.iter().any(|p| p.name == s.name)).collect();
            cmp.properties = inherit::prepend(props, std::mem::take(&mut cmp.properties), |p| p.name.clone());
            cmp.states = inherit::prepend(states, std::mem::take(&mut cmp.states), |s| s.name.clone());
            cmp.methods = inherit::prepend(parent.methods, std::mem::take(&mut cmp.methods), |m| m.name.clone());
            cmp.events = inherit::prepend(parent.events, std::mem::take(&mut cmp.events), |e| e.name.clone());
            cmp.listeners = inherit::prepend(parent.listeners, std::mem::take(&mut cmp.listeners), |l| l.name.clone());
            cmp.watchers = inherit::prepend(parent.watchers, std::mem::take(&mut cmp.watchers), |w| w.method_name.clone());
            // Serializers merge as in a full build (`compiler-ctx-merge.ts`). With a `resolveImport`
            // callback Stencil drops them all, the component's own too: docs/quirks.md 10.
            cmp.serializers = inherit::prepend(parent.serializers, std::mem::take(&mut cmp.serializers), |w| w.method_name.clone());
            cmp.deserializers = inherit::prepend(parent.deserializers, std::mem::take(&mut cmp.deserializers), |w| w.method_name.clone());
        }
        cmp.base_class_files = found.files;
    }

    order_like_object_keys(&mut cmp.properties, |p| p.name.as_str());
    order_like_object_keys(&mut cmp.states, |s| s.name.as_str());
    component.map(|_| cmp)
}

/// The Stencil members of one class, from its decorators: what `convertDecoratorsToStatic`
/// writes as static getters, read back. Components, base classes and mixins alike.
pub(crate) struct Members {
    pub properties: Vec<PropMeta>,
    pub states: Vec<StateMeta>,
    pub events: Vec<EventMeta>,
    pub methods: Vec<MethodMeta>,
    pub listeners: Vec<ListenerMeta>,
    pub watchers: Vec<WatcherMeta>,
    pub element_ref: Option<String>,
    pub attach_internals_member_name: Option<String>,
    pub attach_internals_custom_states: Vec<CustomState>,
    pub form_associated: bool,
    pub serializers: Vec<WatcherMeta>,
    pub deserializers: Vec<WatcherMeta>,
}

/// The members of a class in another module (or this one): an ancestor. Its diagnostics are
/// dropped, as Stencil drops those of the throwaway program it reads an ancestor with.
pub(crate) fn foreign_class_members(class: &Class, program: &Program, source: &str, file: &str, resolver: Option<&Resolver>) -> Members {
    let mut ctx = Ctx { source, file, resolver, aliases: import_aliases(program), diagnostics: Vec::new(), thrown: None };
    let locals = Locals::collect(program).with_resolver(resolver, file);
    class_members(&mut ctx, class, &locals)
}

fn class_members(ctx: &mut Ctx, class: &Class, locals: &Locals) -> Members {
    let mut cmp = Members {
        properties: Vec::new(),
        states: Vec::new(),
        events: Vec::new(),
        methods: Vec::new(),
        listeners: Vec::new(),
        watchers: Vec::new(),
        element_ref: None,
        attach_internals_member_name: None,
        attach_internals_custom_states: Vec::new(),
        form_associated: false,
        serializers: Vec::new(),
        deserializers: Vec::new(),
    };

    let [prop_n, state_n, event_n, method_n, element_n, watch_n, listen_n] =
        ["Prop", "State", "Event", "Method", "Element", "Watch", "Listen"].map(|d| ctx.name(d));

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
    // Class fields by name, for `@Prop() get x() { return this._x; }`.
    let fields: HashMap<String, &PropertyDefinition> = class
        .body
        .body
        .iter()
        .filter_map(|el| match el {
            ClassElement::PropertyDefinition(p) => Some((property_key_name(&p.key)?, &**p)),
            _ => None,
        })
        .collect();

    // `serializeDecoratorsToStatic`, before the props: a serializer makes its prop reflect, a
    // deserializer gives it an attribute. Only translators of a `@Prop` count.
    let prop_names: Vec<String> = class
        .body
        .body
        .iter()
        .filter_map(|el| match el {
            ClassElement::PropertyDefinition(p) if !decorator_calls(&p.decorators, &prop_n).is_empty() => ctx.member_name(&p.key, p.computed, true, locals),
            ClassElement::MethodDefinition(m) if m.kind == MethodDefinitionKind::Get && !decorator_calls(&m.decorators, &prop_n).is_empty() => {
                ctx.member_name(&m.key, m.computed, true, locals)
            }
            _ => None,
        })
        .collect();
    cmp.serializers = translators(ctx, class, "PropSerialize", &prop_names, locals);
    cmp.deserializers = translators(ctx, class, "AttrDeserialize", &prop_names, locals);
    let has = |list: &[WatcherMeta], name: &str| list.iter().any(|t| t.prop_name == name);

    for el in &class.body.body {
        match el {
            ClassElement::PropertyDefinition(p) => {
                // `@Prop` and `@State` read a computed name's value; `@Event` and `@Element` keep its text.
                let Some(name) = ctx.member_name(&p.key, p.computed, false, locals) else { continue };
                let resolved = ctx.member_name(&p.key, p.computed, true, locals).unwrap_or_else(|| name.clone());

                if let Some(call) = decorator_calls(&p.decorators, &prop_n).first() {
                    let name = resolved.clone();
                    check_private_prop(ctx, p.accessibility, p.span);
                    let opts = ctx.arg(call, 0, locals);
                    let (prop_type, original) = match &p.type_annotation {
                        Some(t) => (classify_annotation(&t.type_annotation, locals), ctx.text(t.type_annotation.span()).to_owned()),
                        None => classify_initializer(p.value.as_ref(), locals, ctx.source),
                    };
                    let default_value = p.value.as_ref().map(|v| initializer_text(v, locals, ctx.source));
                    let translated = (has(&cmp.serializers, &name), has(&cmp.deserializers, &name));
                    let prop = build_prop(ctx, name.clone(), prop_type, &opts, p.definite, p.optional, false, false, default_value, original, p.key.span(), translated);
                    cmp.properties.push(prop);
                }

                if !decorator_calls(&p.decorators, &state_n).is_empty() {
                    cmp.states.push(StateMeta { name: resolved.clone() });
                }

                if let Some(call) = decorator_calls(&p.decorators, &event_n).first() {
                    let opts = ctx.arg(call, 0, locals);
                    let event_name = opt_str(&opts, "eventName").map(|s| s.trim().to_owned()).filter(|s| !s.is_empty()).unwrap_or_else(|| name.clone());
                    cmp.events.push(EventMeta {
                        name: event_name,
                        method: name.clone(),
                        bubbles: opt_bool(&opts, "bubbles").unwrap_or(true),
                        cancelable: opt_bool(&opts, "cancelable").unwrap_or(true),
                        composed: opt_bool(&opts, "composed").unwrap_or(true),
                    });
                }

                if !decorator_calls(&p.decorators, &element_n).is_empty() {
                    if cmp.element_ref.is_some() {
                        ctx.push(Level::Error, "Only one @Element() decorator is allowed per component.", p.span);
                    }
                    cmp.element_ref = Some(name.clone());
                }
            }
            ClassElement::MethodDefinition(m) => {
                let Some(name) = ctx.member_name(&m.key, m.computed, false, locals) else { continue };

                if m.kind == MethodDefinitionKind::Get {
                    if let Some(call) = decorator_calls(&m.decorators, &prop_n).first() {
                        let name = ctx.member_name(&m.key, m.computed, true, locals).unwrap_or_else(|| name.clone());
                        check_private_prop(ctx, m.accessibility, m.span);
                        let opts = ctx.arg(call, 0, locals);
                        let (prop_type, original, default_value) = getter_prop(ctx, m, &fields, locals);
                        let has_setter = setters.contains(&name);
                        let translated = (has(&cmp.serializers, &name), has(&cmp.deserializers, &name));
                        let prop = build_prop(ctx, name.clone(), prop_type, &opts, false, m.optional, true, has_setter, default_value, original, m.key.span(), translated);
                        cmp.properties.push(prop);
                    }
                }

                if m.kind == MethodDefinitionKind::Method {
                    if !decorator_calls(&m.decorators, &method_n).is_empty() {
                        check_method(ctx, m, &name, locals.resolving());
                        cmp.methods.push(MethodMeta { name: name.clone() });
                    }
                    for call in decorator_calls(&m.decorators, &watch_n) {
                        let arg = ctx.arg(call, 0, locals);
                        if let Some(prop_name) = watch_key(ctx, arg) {
                            cmp.watchers.push(WatcherMeta { prop_name, method_name: name.clone() });
                        }
                    }
                    for call in decorator_calls(&m.decorators, &listen_n) {
                        let event = match ctx.arg(call, 0, locals) {
                            Some(Value::String(event)) => event,
                            Some(Value::Number(_)) => {
                                ctx.throw("TypeError: listenText.split is not a function");
                                continue;
                            }
                            _ => continue,
                        };
                        if event.split(',').count() > 1 {
                            ctx.push(Level::Error, "Please use multiple @Listen() decorators instead of comma-separated names.", call.span);
                        }
                        let event = event.split(',').next().unwrap_or_default().trim().to_owned();
                        let opts = ctx.arg(call, 1, locals);
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

    // `attachInternalsDecoratorsToStatic`: one decorated field at most.
    let ai_n = ctx.name("AttachInternals");
    let internals: Vec<(&PropertyDefinition, &CallExpression)> = class
        .body
        .body
        .iter()
        .filter_map(|el| match el {
            ClassElement::PropertyDefinition(p) => decorator_calls(&p.decorators, &ai_n).first().map(|c| (&**p, *c)),
            _ => None,
        })
        .collect();
    match internals.as_slice() {
        [] => {}
        [(p, call)] => {
            cmp.attach_internals_member_name = ctx.member_name(&p.key, p.computed, true, locals);
            let options = match call.arguments.first() {
                Some(Argument::ObjectExpression(o)) => Some(&**o),
                _ => None,
            };
            cmp.attach_internals_custom_states = options.map(|o| custom_states(o, ctx.source)).unwrap_or_default();
            cmp.form_associated = !options.is_some_and(|o| {
                object_entry(o, "formAssociated").is_some_and(|v| matches!(v, Expression::BooleanLiteral(b) if !b.value))
            });
        }
        _ => ctx.push(Level::Error, "Stencil does not support adding more than one AttachInternals() decorator to a component", Span::default()),
    }

    cmp
}

/// `@PropSerialize(prop)` / `@AttrDeserialize(prop)` methods whose prop is one of `props`, in
/// class order (`parseSerializeDecorator`).
fn translators(ctx: &mut Ctx, class: &Class, decorator: &'static str, props: &[String], locals: &Locals) -> Vec<WatcherMeta> {
    let local = ctx.name(decorator);
    let mut out = Vec::new();
    for el in &class.body.body {
        let ClassElement::MethodDefinition(m) = el else { continue };
        if m.kind != MethodDefinitionKind::Method {
            continue;
        }
        let Some(method_name) = ctx.member_name(&m.key, m.computed, false, locals) else { continue };
        for call in decorator_calls(&m.decorators, &local) {
            let arg = ctx.arg(call, 0, locals);
            if let Some(prop_name) = watch_key(ctx, arg) {
                if props.contains(&prop_name) {
                    out.push(WatcherMeta { prop_name, method_name: method_name.clone() });
                }
            }
        }
    }
    out
}

/// A `key: value` entry of an object literal, by identifier key (`ts.isPropertyAssignment` with
/// an identifier name: no shorthand, no string or computed key).
fn object_entry<'o, 'a>(o: &'o ObjectExpression<'a>, key: &str) -> Option<&'o Expression<'a>> {
    o.properties.iter().find_map(|p| match p {
        ObjectPropertyKind::ObjectProperty(p) if !p.shorthand && !p.computed && matches!(&p.key, PropertyKey::StaticIdentifier(id) if id.name == key) => {
            Some(&p.value)
        }
        _ => None,
    })
}

/// `@AttachInternals({ states: { name: true, ... } })` (`parseCustomStatesFromDecorator`):
/// identifier or string keys; `true` starts the state on, anything else off; each state's
/// JSDoc becomes its docs.
fn custom_states(options: &ObjectExpression, source: &str) -> Vec<CustomState> {
    let Some(Expression::ObjectExpression(states)) = object_entry(options, "states") else { return Vec::new() };
    states
        .properties
        .iter()
        .filter_map(|p| {
            let ObjectPropertyKind::ObjectProperty(p) = p else { return None };
            if p.shorthand || p.computed {
                return None;
            }
            let name = match &p.key {
                PropertyKey::StaticIdentifier(id) => id.name.to_string(),
                PropertyKey::StringLiteral(s) => s.value.to_string(),
                _ => return None,
            };
            Some(CustomState {
                name,
                initial_value: matches!(&p.value, Expression::BooleanLiteral(b) if b.value),
                docs: jsdoc_before(source, p.span.start),
            })
        })
        .collect()
}

/// The text of a `/** ... */` comment right before `at`, as TypeScript's
/// `getDocumentationComment` gives it: leading `*`s gone, tags (`@...`) dropped.
fn jsdoc_before(source: &str, at: u32) -> String {
    let before = source[..at as usize].trim_end();
    let Some(body) = before.strip_suffix("*/") else { return String::new() };
    let Some(open) = body.rfind("/*") else { return String::new() };
    let Some(text) = body[open..].strip_prefix("/**") else { return String::new() };
    let lines: Vec<&str> = text
        .lines()
        .map(|l| l.trim().trim_start_matches('*').trim())
        .take_while(|l| !l.starts_with('@'))
        .collect();
    lines.join("\n").trim().to_owned()
}

/// Features stencilrs does not compile yet. Each reports an error starting with `stencilrs:`,
/// which callers (the Vite plugin) treat as "use Stencil's compiler for this file".
fn report_unported(ctx: &mut Ctx, class: &Class, component: Option<(&str, &Value)>) {
    let Some((tag, o)) = component else { return };
    let checks: [(bool, &str); 4] = [
        (matches!(o.get("styleUrls"), Some(Value::Object(_))), "per-mode styleUrls"),
        (o.get("styles").is_some_and(|s| !s.is_string()), "non-string `styles`"),
        (
            o.pointer("/encapsulation/type").and_then(Value::as_str) == Some("scoped")
                && o.get("styles").and_then(Value::as_str).is_some_and(|css| scope_css(css, &scope_id(tag, None), false).is_err()),
            "inline `styles` that scopeCss rejects",
        ),
        (o.get("globalStyle").is_some() || o.get("globalStyleUrl").is_some(), "component global styles"),
    ];
    for (hit, what) in checks {
        if hit {
            ctx.push(Level::Error, format!("stencilrs: {what} are not ported yet."), class.span);
        }
    }
}

/// `@Component` options, or `None` when Stencil would reject the component.
fn component_options(ctx: &mut Ctx, call: &CallExpression, class_name: &str, exports: &[(String, Span)], locals: &Locals) -> Option<(String, Encapsulation, Vec<String>, Value)> {
    let opts = ctx.arg(call, 0, locals)?;

    // `checkForDeprecatedApi`. Stencil reports this once per process
    // (`hasShownDeprecatedApiError`); here it is once per file.
    if ["shadow", "scoped", "formAssociated"].iter().any(|k| opts.get(*k).is_some()) {
        ctx.push(Level::Error, DEPRECATED_API_MESSAGE, call.span);
        return None;
    }

    let tag = opts.get("tag").and_then(Value::as_str).unwrap_or_default().to_owned();
    if let Some(err) = validate_component_tag(opts.get("tag")) {
        ctx.push(Level::Error, format!("{err}. Please refer to https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name for more info."), call.span);
        return None;
    }

    let other_exports: Vec<&(String, Span)> = exports.iter().filter(|(name, _)| name != class_name).collect();
    for (_, span) in &other_exports {
        ctx.push(Level::Error, SINGLE_EXPORT_MESSAGE, *span);
    }
    if !other_exports.is_empty() {
        return None;
    }

    let encapsulation = match opts.pointer("/encapsulation/type").and_then(Value::as_str) {
        Some("shadow") => Encapsulation::Shadow,
        Some("scoped") => Encapsulation::Scoped,
        _ => Encapsulation::None,
    };

    let mut style_urls = Vec::new();
    if let Some(url) = opts.get("styleUrl").and_then(Value::as_str) {
        style_urls.push(url.to_owned());
    }
    if let Some(Value::Array(urls)) = opts.get("styleUrls") {
        style_urls.extend(urls.iter().filter_map(Value::as_str).map(str::to_owned));
    }

    Some((tag.trim().to_owned(), encapsulation, style_urls, opts))
}

/// Port of `validateComponentTag` (`src/utils/validation.ts:88-132`).
fn validate_component_tag(tag: Option<&Value>) -> Option<String> {
    let Some(Value::String(tag)) = tag else {
        return Some(format!("Tag \"{}\" must be a string type", tag.map_or("undefined".to_owned(), Value::to_string)));
    };
    if tag != tag.trim() {
        return Some("Tag can not contain white spaces".into());
    }
    if *tag != tag.to_lowercase() {
        return Some("Tag can not contain upper case characters".into());
    }
    if tag.is_empty() {
        return Some("Received empty tag value".into());
    }
    if tag.contains(' ') {
        return Some(format!("\"{tag}\" tag cannot contain a space"));
    }
    if tag.contains(',') {
        return Some(format!("\"{tag}\" tag cannot be used for multiple tags"));
    }
    let invalid: String = tag.chars().filter(|c| !(c.is_ascii_alphanumeric() || *c == '_' || *c == '-')).collect();
    if !invalid.is_empty() {
        return Some(format!("\"{tag}\" tag contains invalid characters: {invalid}"));
    }
    if !tag.contains('-') {
        return Some(format!("\"{tag}\" tag must contain a dash (-) to work as a valid web component"));
    }
    if tag.contains("--") {
        return Some(format!("\"{tag}\" tag cannot contain multiple dashes (--) next to each other"));
    }
    if tag.starts_with('-') {
        return Some(format!("\"{tag}\" tag cannot start with a dash (-)"));
    }
    if tag.ends_with('-') {
        return Some(format!("\"{tag}\" tag cannot end with a dash (-)"));
    }
    None
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
    name_span: Span,
    (serialized, deserialized): (bool, bool),
) -> PropMeta {
    if name.starts_with("on") && name[2..].starts_with(|c: char| c == '-' || c.is_ascii_uppercase()) {
        ctx.push(Level::Warn, format!("The @Prop() name \"{name}\" looks like an event. Please use the \"@Event()\" decorator to expose events instead, not properties or methods."), name_span);
    }
    if opts.as_ref().and_then(|o| o.get("reflectToAttr")).is_some() {
        ctx.push(Level::Error, "@Prop option \"reflectToAttr\" should be renamed to \"reflect\".", name_span);
    }

    // `parsePropDecorator`: a prop can reflect when its type is known or it has a serializer
    // (which reflects it unless `reflect` says otherwise); it gets an attribute when its type is
    // known, it reflects, or it has a deserializer. `parseStaticProps` defaults reflect to false.
    let reflect = (prop_type != PropType::Unknown || serialized) && opt_bool(opts, "reflect").unwrap_or(serialized);
    let attribute = (prop_type != PropType::Unknown || reflect || deserialized).then(|| match opts.as_ref().and_then(|o| o.get("attribute")) {
        // `attribute: null` never reaches here as null (see eval.rs), so this is the only branch.
        Some(Value::String(a)) if !a.trim().is_empty() => a.trim().to_lowercase(),
        _ => to_dash_case(&name),
    });

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

/// The `@Method` return check (`method-decorator.ts:82-97`), as the single-file program sees
/// it: without the lib, `Promise` is unresolved, so only a written `Promise<...>` annotation
/// passes. An unannotated `async` method comes out as `any` and is an error; a method that
/// returns nothing is `void` and only a warning.
/// In build-accurate mode the lib is loaded, so `async` methods and returned promises are fine.
fn check_method(ctx: &mut Ctx, m: &MethodDefinition, name: &str, full_program: bool) {
    if matches!(m.accessibility, Some(TSAccessibility::Private | TSAccessibility::Protected)) {
        ctx.push(Level::Error, "Methods decorated with the @Method() decorator cannot be \"private\" nor \"protected\". More info: https://stenciljs.com/docs/methods", m.span);
    }
    let returns = match &m.value.return_type {
        Some(t) => match &t.type_annotation {
            TSType::TSVoidKeyword(_) => MethodReturn::Void,
            TSType::TSTypeReference(r)
                if matches!(&r.type_name, TSTypeName::IdentifierReference(id) if id.name == "Promise")
                    && r.type_arguments.as_ref().is_some_and(|a| !a.params.is_empty()) =>
            {
                MethodReturn::Promise
            }
            _ => MethodReturn::Other,
        },
        None if m.value.r#async => if full_program { MethodReturn::Promise } else { MethodReturn::Other },
        None if returns_value(&m.value) => if full_program { MethodReturn::Unknown } else { MethodReturn::Other },
        None => MethodReturn::Void,
    };
    let message = format!("External @Method() {name}() must return a Promise.\n\n Consider prefixing the method with async, such as @Method() async {name}().");
    match returns {
        MethodReturn::Promise | MethodReturn::Unknown => {}
        MethodReturn::Void => ctx.push(Level::Warn, message, m.key.span()),
        MethodReturn::Other => ctx.push(Level::Error, message, m.key.span()),
    }
}

enum MethodReturn {
    Promise,
    /// Returns a value whose type needs inference we don't do: no diagnostic.
    Unknown,
    Void,
    Other,
}

/// Whether the function has a `return <expr>` of its own (not in a nested function).
fn returns_value(func: &Function) -> bool {
    struct Finder(bool);
    impl<'a> Visit<'a> for Finder {
        fn visit_return_statement(&mut self, it: &ReturnStatement<'a>) {
            self.0 |= it.argument.is_some();
        }
        fn visit_function(&mut self, _: &Function<'a>, _: ScopeFlags) {}
        fn visit_arrow_function_expression(&mut self, _: &ArrowFunctionExpression<'a>) {}
        fn visit_class(&mut self, _: &Class<'a>) {}
    }
    let mut finder = Finder(false);
    if let Some(body) = &func.body {
        finder.visit_function_body(body);
    }
    finder.0
}

/// The key a `@Watch()` (or serializer) argument becomes. A number goes through as a numeric
/// literal node, which the generated object turns into `"[object Object]"`; a negative one
/// fails TypeScript's `createNumericLiteral` assertion.
fn watch_key(ctx: &mut Ctx, arg: Option<Value>) -> Option<String> {
    match arg? {
        Value::String(s) => Some(s),
        Value::Number(n) if n.as_f64().is_some_and(|n| n < 0.0) => {
            ctx.throw("Error: Debug Failure. False expression: Negative numbers should be created in combination with createPrefixUnaryExpression");
            None
        }
        Value::Number(_) => Some("[object Object]".into()),
        _ => None,
    }
}

fn check_private_prop(ctx: &mut Ctx, accessibility: Option<TSAccessibility>, span: Span) {
    if matches!(accessibility, Some(TSAccessibility::Private | TSAccessibility::Protected)) {
        ctx.push(Level::Error, "Properties decorated with the @Prop() decorator cannot be \"private\" nor \"protected\". More info: https://stenciljs.com/docs/properties", span);
    }
}

/// Type, `complexType.original` and default of a `@Prop()` getter
/// (`parsePropDecorator`, `prop-decorator.ts:121-215`). The checker types a getter by its
/// return type, inferred from the body when unannotated; the default comes from the first
/// top-level `return`: a literal, or `x.name` where `name` is a class field with an initializer.
fn getter_prop(ctx: &Ctx, m: &MethodDefinition, fields: &HashMap<String, &PropertyDefinition>, locals: &Locals) -> (PropType, String, Option<String>) {
    let first_return = m.value.body.as_ref().and_then(|b| {
        b.statements.iter().find_map(|s| match s {
            Statement::ReturnStatement(r) => Some(r.argument.as_ref()),
            _ => None,
        })
    });
    let field = match first_return {
        Some(Some(Expression::StaticMemberExpression(e))) => fields.get(e.property.name.as_str()).copied(),
        _ => None,
    };
    let field_type = |f: &PropertyDefinition| match &f.type_annotation {
        Some(t) => (classify_annotation(&t.type_annotation, locals), ctx.text(t.type_annotation.span()).to_owned()),
        None => classify_initializer(f.value.as_ref(), locals, ctx.source),
    };

    let (prop_type, original) = match (&m.value.return_type, first_return) {
        (Some(t), _) => (classify_annotation(&t.type_annotation, locals), ctx.text(t.type_annotation.span()).to_owned()),
        (None, Some(Some(Expression::StaticMemberExpression(e)))) if matches!(e.object, Expression::ThisExpression(_)) => match field {
            Some(f) => field_type(f),
            None => (PropType::Any, "any".to_owned()),
        },
        (None, Some(Some(expr))) => classify_initializer(Some(expr), locals, ctx.source),
        // No return value: `void`.
        (None, _) => (PropType::Unknown, "void".to_owned()),
    };

    let default_value = match first_return {
        Some(Some(e)) if is_literal_expression(e) => Some(ctx.text(e.span()).to_owned()),
        Some(Some(Expression::StaticMemberExpression(_))) => field.and_then(|f| f.value.as_ref()).map(|v| initializer_text(v, locals, ctx.source)),
        _ => None,
    };
    // Stencil re-types an `unknown` getter from the field it returns.
    let (prop_type, original) = match (prop_type, field) {
        (PropType::Unknown, Some(f)) if f.value.is_some() => field_type(f),
        other => (other.0, original),
    };
    (prop_type, original, default_value)
}

/// `ts.isLiteralExpression`: string, numeric, bigint, regex and no-substitution template literals.
fn is_literal_expression(e: &Expression) -> bool {
    match e {
        Expression::StringLiteral(_) | Expression::NumericLiteral(_) | Expression::BigIntLiteral(_) | Expression::RegExpLiteral(_) => true,
        Expression::TemplateLiteral(t) => t.expressions.is_empty(),
        _ => false,
    }
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
