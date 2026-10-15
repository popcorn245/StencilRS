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
    ArrowFunctionExpression, CallExpression, Class, ClassElement, Declaration, Decorator,
    ExportDefaultDeclarationKind, Expression, Function, ImportDeclarationSpecifier,
    ImportOrExportKind, MethodDefinition, MethodDefinitionKind, Program, PropertyDefinition,
    PropertyKey, ReturnStatement, Statement, TSAccessibility, TSType, TSTypeName,
};
use oxc::ast_visit::Visit;
use oxc::span::{GetSpan, Span};
use oxc::syntax::scope::ScopeFlags;
use serde_json::Value;

use crate::default_value::initializer_text;
use crate::eval::{Arg, eval_argument, property_key_name};
use crate::locals::{LocalType, Locals};
use crate::meta::*;
use crate::prop_type::{classify_annotation, classify_initializer};

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
}

struct Ctx<'s> {
    source: &'s str,
    /// Stencil decorator name → local name (`import { Prop as P }` maps `Prop` → `P`).
    aliases: HashMap<&'static str, String>,
    diagnostics: Vec<Diagnostic>,
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

    /// Evaluate argument `i`; `None` when absent or not a value we can read.
    fn arg(&mut self, call: &CallExpression, i: usize) -> Option<Value> {
        match eval_argument(call.arguments.get(i)?, self.source) {
            Arg::Value(v) => Some(v),
            Arg::NeedsConstEval => {
                self.push(Level::Error, "stencilrs: identifier decorator arguments need const evaluation, which is not ported yet.", call.span);
                None
            }
            Arg::Invalid => {
                self.push(Level::Error, "invalid decorator argument", call.span);
                None
            }
        }
    }
}

pub fn analyze_program(program: &Program, source: &str) -> Analysis {
    let mut ctx = Ctx { source, aliases: import_aliases(program), diagnostics: Vec::new() };
    let locals = Locals::collect(program);
    let exports = value_exports(program, &locals);
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
            if let Some(cmp) = analyze_class(&mut ctx, class, &locals, &exports) {
                components.push(cmp);
            }
        }
    }

    Analysis { components, diagnostics: ctx.diagnostics }
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

fn analyze_class(ctx: &mut Ctx, class: &Class, locals: &Locals, exports: &[(String, Span)]) -> Option<ComponentMeta> {
    let component_name = ctx.name("Component");
    let cmp_call = *decorator_calls(&class.decorators, &component_name).first()?;
    let class_name = class.id.as_ref().map(|id| id.name.to_string()).unwrap_or_default();

    // Port of `componentDecoratorToStatic`: a component that fails validation produces no
    // metadata, but its members are still converted (and still report diagnostics).
    let component = component_options(ctx, cmp_call, &class_name, exports);
    report_unported(ctx, class, component.as_ref().map(|c| &c.3));

    let mut cmp = ComponentMeta {
        tag_name: String::new(),
        component_class_name: class_name,
        encapsulation: Encapsulation::None,
        style_urls: Vec::new(),
        properties: Vec::new(),
        states: Vec::new(),
        events: Vec::new(),
        methods: Vec::new(),
        listeners: Vec::new(),
        watchers: Vec::new(),
        element_ref: None,
        options: Value::Null,
    };
    if let Some((tag, encapsulation, style_urls, options)) = &component {
        cmp.options = options.clone();
        cmp.tag_name = tag.clone();
        cmp.encapsulation = *encapsulation;
        cmp.style_urls = style_urls.clone();
    }

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

    for el in &class.body.body {
        match el {
            ClassElement::PropertyDefinition(p) => {
                let Some(name) = member_name(ctx, &p.key) else { continue };

                if let Some(call) = decorator_calls(&p.decorators, &prop_n).first() {
                    check_private_prop(ctx, p.accessibility, p.span);
                    let opts = ctx.arg(call, 0);
                    let (prop_type, original) = match &p.type_annotation {
                        Some(t) => (classify_annotation(&t.type_annotation, locals), ctx.text(t.type_annotation.span()).to_owned()),
                        None => classify_initializer(p.value.as_ref(), locals, ctx.source),
                    };
                    let default_value = p.value.as_ref().map(|v| initializer_text(v, locals, ctx.source));
                    let prop = build_prop(ctx, name.clone(), prop_type, &opts, p.definite, p.optional, false, false, default_value, original, p.key.span());
                    cmp.properties.push(prop);
                }

                if !decorator_calls(&p.decorators, &state_n).is_empty() {
                    cmp.states.push(StateMeta { name: name.clone() });
                }

                if let Some(call) = decorator_calls(&p.decorators, &event_n).first() {
                    let opts = ctx.arg(call, 0);
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
                let Some(name) = member_name(ctx, &m.key) else { continue };

                if m.kind == MethodDefinitionKind::Get {
                    if let Some(call) = decorator_calls(&m.decorators, &prop_n).first() {
                        check_private_prop(ctx, m.accessibility, m.span);
                        let opts = ctx.arg(call, 0);
                        let (prop_type, original, default_value) = getter_prop(ctx, m, &fields, locals);
                        let has_setter = setters.contains(&name);
                        let prop = build_prop(ctx, name.clone(), prop_type, &opts, false, m.optional, true, has_setter, default_value, original, m.key.span());
                        cmp.properties.push(prop);
                    }
                }

                if m.kind == MethodDefinitionKind::Method {
                    if !decorator_calls(&m.decorators, &method_n).is_empty() {
                        check_method(ctx, m, &name);
                        cmp.methods.push(MethodMeta { name: name.clone() });
                    }
                    for call in decorator_calls(&m.decorators, &watch_n) {
                        if let Some(Value::String(prop_name)) = ctx.arg(call, 0) {
                            cmp.watchers.push(WatcherMeta { prop_name, method_name: name.clone() });
                        }
                    }
                    for call in decorator_calls(&m.decorators, &listen_n) {
                        let Some(Value::String(event)) = ctx.arg(call, 0) else { continue };
                        if event.split(',').count() > 1 {
                            ctx.push(Level::Error, "Please use multiple @Listen() decorators instead of comma-separated names.", call.span);
                        }
                        let event = event.split(',').next().unwrap_or_default().trim().to_owned();
                        let opts = ctx.arg(call, 1);
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

    component.map(|_| cmp)
}

/// Features stencilrs does not compile yet. Each reports an error starting with `stencilrs:`,
/// which callers (the Vite plugin) treat as "use Stencil's compiler for this file".
fn report_unported(ctx: &mut Ctx, class: &Class, options: Option<&Value>) {
    if let Some(h) = &class.heritage {
        ctx.push(Level::Error, "stencilrs: components that extend a class or mixin are not ported yet.", h.expression.span());
    }
    let unported = ["AttachInternals", "PropSerialize", "AttrDeserialize"].map(|d| (d, ctx.name(d)));
    for el in &class.body.body {
        let decorators = match el {
            ClassElement::PropertyDefinition(p) => &p.decorators,
            ClassElement::MethodDefinition(m) => &m.decorators,
            ClassElement::AccessorProperty(a) => &a.decorators,
            _ => continue,
        };
        for (original, local) in &unported {
            for call in decorator_calls(decorators, local) {
                ctx.push(Level::Error, format!("stencilrs: @{original}() is not ported yet."), call.span);
            }
        }
    }
    let Some(o) = options else { return };
    let checks: [(bool, &str); 4] = [
        (matches!(o.get("styleUrls"), Some(Value::Object(_))), "per-mode styleUrls"),
        (o.get("styles").is_some_and(|s| !s.is_string()), "non-string `styles`"),
        (
            o.get("styles").is_some() && o.pointer("/encapsulation/type").and_then(Value::as_str) == Some("scoped"),
            "inline `styles` on scoped components (needs Stencil's scopeCss)",
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
fn component_options(ctx: &mut Ctx, call: &CallExpression, class_name: &str, exports: &[(String, Span)]) -> Option<(String, Encapsulation, Vec<String>, Value)> {
    let opts = ctx.arg(call, 0)?;

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
) -> PropMeta {
    if name.starts_with("on") && name[2..].starts_with(|c: char| c == '-' || c.is_ascii_uppercase()) {
        ctx.push(Level::Warn, format!("The @Prop() name \"{name}\" looks like an event. Please use the \"@Event()\" decorator to expose events instead, not properties or methods."), name_span);
    }
    if opts.as_ref().and_then(|o| o.get("reflectToAttr")).is_some() {
        ctx.push(Level::Error, "@Prop option \"reflectToAttr\" should be renamed to \"reflect\".", name_span);
    }

    // `parsePropDecorator` sets reflect / attribute only for non-`unknown` types (no
    // serializers yet); `parseStaticProps` then defaults reflect to false.
    let reflect = prop_type != PropType::Unknown && opt_bool(opts, "reflect").unwrap_or(false);
    let attribute = (prop_type != PropType::Unknown || reflect).then(|| match opts.as_ref().and_then(|o| o.get("attribute")) {
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
fn check_method(ctx: &mut Ctx, m: &MethodDefinition, name: &str) {
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
        None if m.value.r#async => MethodReturn::Other,
        None if returns_value(&m.value) => MethodReturn::Other,
        None => MethodReturn::Void,
    };
    let message = format!("External @Method() {name}() must return a Promise.\n\n Consider prefixing the method with async, such as @Method() async {name}().");
    match returns {
        MethodReturn::Promise => {}
        MethodReturn::Void => ctx.push(Level::Warn, message, m.key.span()),
        MethodReturn::Other => ctx.push(Level::Error, message, m.key.span()),
    }
}

enum MethodReturn {
    Promise,
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

fn member_name(ctx: &mut Ctx, key: &PropertyKey) -> Option<String> {
    let name = property_key_name(key);
    if name.is_none() && key.is_expression() {
        ctx.push(Level::Error, "stencilrs: computed member names are not supported yet.", key.span());
    }
    name
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
