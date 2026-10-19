//! Code generation for Stencil's component outputs, selected by `componentExport`:
//!
//! - `customelement`: what `transpileSync` emits by default, the path `@stencil/unplugin` uses and
//!   the shape of the `standalone` output target.
//! - `module`: the same classes, kept exported and registered with `proxyCustomElement` instead
//!   of defined (`addModuleMetadataProxies`).
//! - `lazy`: the lazy-loading (`loader-bundle`) shape, a class that takes over a bootstrapped host
//!   (`registerInstance`) instead of being the element.
//!
//! Ports `nativeComponentTransform` and `lazyComponentTransform` and their friends
//! (`transformers/component-native/*`, `component-lazy/*`, `define-custom-element.ts`,
//! `update-stencil-core-import.ts`, `style-imports.ts`, `automatic-key-insertion/`,
//! `utils/format-component-runtime-meta.ts`).
//!
//! The Stencil-specific rewrites are applied as text edits on the original TypeScript, then
//! oxc strips the types and compiles the JSX, the way TypeScript's own emit does in Stencil.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use oxc::allocator::{Allocator, TakeIn};
use oxc::ast::builder::AstBuilder;
use oxc::ast::ast::{
    AccessorProperty, Argument, ObjectExpression, ObjectPropertyKind, PropertyDefinition,
    CallExpression, Class, ClassElement, ConditionalExpression, Declaration, Decorator, Expression,
    ImportDeclarationSpecifier, JSXAttributeItem, JSXAttributeName, JSXElementName, JSXFragment,
    JSXOpeningElement, MethodDefinition, MethodDefinitionKind, Program, ReturnStatement, Statement,
    StringLiteral, TSEnumDeclaration,
};
use oxc::ast_visit::{Visit, VisitMut, walk, walk_mut};
use oxc::codegen::{Codegen, CodegenOptions, CommentOptions};
use oxc::parser::Parser;
use oxc::semantic::SemanticBuilder;
use oxc::span::{GetSpan, SourceType, Span};
use oxc::transformer::{JsxOptions, JsxRuntime, TransformOptions, Transformer, TypeScriptOptions};
use serde_json::Value;

use crate::analyze::import_aliases;
use crate::edits::Edits;
use crate::consts::{Lit, enum_values, order_like_object_keys};
use crate::locals::Locals;
use crate::eval::property_key_name;
use crate::meta::{ComponentMeta, Encapsulation, PropType, WatcherMeta};
use crate::scope_css::{scope_css, scope_id};

pub const DEFAULT_CORE_IMPORT_PATH: &str = "@stencil/core/runtime/client/standalone";

#[derive(Debug, Clone)]
pub enum Jsx {
    /// `h()` calls (TypeScript `jsx: react`, factory `h`, fragment `Fragment`).
    Classic,
    /// `_jsx()` calls from `<import_source>/jsx-runtime` (TypeScript `jsx: react-jsx`).
    Automatic { import_source: String },
}

/// Which output a component compiles to: Stencil's `componentExport`. `transpileSync` reaches
/// `Lazy` with `componentExport: null`.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum ComponentExport {
    /// `const X = class extends HTMLElement`, defined with `defineCustomElement`.
    #[default]
    CustomElement,
    /// `export const X = class extends HTMLElement`, registered with `proxyCustomElement`.
    Module,
    /// `export const X = class` taking over a host: `registerInstance(this, hostRef)`.
    Lazy,
}

#[derive(Debug, Clone)]
pub struct CodegenOptions2 {
    pub file: String,
    /// The output to generate. Default `CustomElement`.
    pub component_export: ComponentExport,
    /// Build-accurate metadata: follow relative imports and know lib types, as a full
    /// `stencil build` does. Off: exactly what single-file `transpileSync` produces.
    pub resolve_imports: bool,
    pub core_import_path: String,
    pub jsx: Jsx,
    /// Also return a source map from the generated module to the original source.
    pub source_map: bool,
    /// Compile every class in the file as a base class a component can extend (Stencil's
    /// `transformAsBaseClass`, which @stencil/unplugin uses for the files ancestors live in):
    /// `extends HTMLElement` where a class extends nothing, and a constructor calling `super()`.
    pub transform_as_base_class: bool,
}

/// A generated module and, when asked for, its source map (v3 JSON).
pub struct Generated {
    pub code: String,
    pub map: Option<String>,
}

const KEEP_IMPORTS: [&str; 24] = [
    "Build", "Env", "Fragment", "Host", "Mixin", "ReactiveControllerHost", "forceUpdate",
    "forceModeUpdate", "getAssetPath", "getElement", "getMode", "getRenderingRef", "getShadowRoot",
    "h", "jsx", "jsxs", "readTask", "render", "setErrorHandler", "setMode", "setPlatformHelpers",
    "setTagTransformer", "transformTag", "writeTask",
];

const MEMBER_DECORATORS_TO_REMOVE: [&str; 10] = [
    "AttachInternals", "AttrDeserialize", "PropSerialize", "Element", "Event", "Listen", "Method",
    "Prop", "State", "Watch",
];

const STATIC_GETTERS_TO_REMOVE: [&str; 18] = [
    "attachInternalsMemberName", "deserializers", "elementRef", "encapsulation", "events", "is",
    "listeners", "methods", "originalStyleUrls", "properties", "serializers", "states", "style",
    "styleMode", "styleUrl", "styleUrls", "styles", "watchers",
];

const LIFECYCLE_METHODS: [&str; 9] = [
    "componentWillLoad", "componentDidLoad", "componentShouldUpdate", "componentWillUpdate",
    "componentDidUpdate", "componentWillRender", "componentDidRender", "connectedCallback",
    "disconnectedCallback",
];

/// Generate the customelement module for an already analysed program. `components` are the
/// valid components `analyze_program` found, in source order.
pub fn generate(program: &Program, source: &str, components: &[ComponentMeta], opts: &CodegenOptions2) -> Result<Generated, String> {
    let mut ed = Edits::new(source);
    let lazy = opts.component_export == ComponentExport::Lazy;
    let customelement = opts.component_export == ComponentExport::CustomElement;
    let text = |s: Span| s.source_text(source);
    let aliases = import_aliases(program);
    let remove_decorators: Vec<String> = MEMBER_DECORATORS_TO_REMOVE
        .iter()
        .map(|d| aliases.get(d).cloned().unwrap_or_else(|| (*d).to_owned()))
        .collect();
    let component_decorator = aliases.get("Component").cloned().unwrap_or_else(|| "Component".into());

    // `updateStencilCoreImports`
    let mut last_import_end = None;
    for stmt in &program.body {
        let Statement::ImportDeclaration(imp) = stmt else { continue };
        last_import_end = Some(imp.span.end);
        let src = imp.source.value.as_str();
        if src == "@stencil/core/jsx-runtime" || src == "@stencil/core/jsx-dev-runtime" {
            ed.replace(imp.source.span.start, imp.source.span.end, json(&opts.core_import_path));
        } else if src == "@stencil/core" {
            let keep: Vec<&str> = imp
                .specifiers
                .iter()
                .flatten()
                .filter_map(|s| match s {
                    ImportDeclarationSpecifier::ImportSpecifier(s) => Some(text(s.span)),
                    _ => None,
                })
                .filter(|t| KEEP_IMPORTS.contains(t))
                .collect();
            let has_named = imp.specifiers.iter().flatten().any(|s| matches!(s, ImportDeclarationSpecifier::ImportSpecifier(_)));
            if has_named && !keep.is_empty() {
                ed.replace(imp.span.start, imp.span.end, format!("import {{ {} }} from {};", keep.join(", "), json(&opts.core_import_path)));
            } else {
                ed.remove(imp.span.start, imp.span.end);
            }
        }
    }

    // Enums, emitted the way TypeScript does.
    let locals = Locals::collect(program);
    for stmt in &program.body {
        match stmt {
            Statement::TSEnumDeclaration(e) => {
                if let Some(lowered) = lower_enum(e, false, &locals) {
                    ed.replace(e.span.start, e.span.end, lowered);
                }
            }
            Statement::ExportDeclaration(x) => {
                if let Declaration::TSEnumDeclaration(e) = &x.declaration {
                    if let Some(lowered) = lower_enum(e, true, &locals) {
                        ed.replace(x.span.start, x.span.end, lowered);
                    }
                }
            }
            _ => {}
        }
    }

    let mut runtime_apis: Vec<&'static str> = Vec::new();
    let mut target_apis: Vec<&'static str> = Vec::new();
    let add = |list: &mut Vec<&'static str>, api: &'static str| {
        if !list.contains(&api) {
            list.push(api);
        }
    };
    let mut style_imports = Vec::new();
    // What follows the module's statements: `defineCustomElement` / `proxyCustomElement` calls,
    // or the lazy classes' `X.style = ...` assignments.
    let mut define_calls = Vec::new();

    // Every other class: base classes and mixins.
    let meta_decorators: Vec<String> =
        META_DECORATORS.iter().map(|d| aliases.get(d).cloned().unwrap_or_else(|| (*d).to_owned())).collect();
    let mut bases = BaseClasses {
        ed: &mut ed,
        component: &component_decorator,
        remove: &remove_decorators,
        meta: &meta_decorators,
        as_base: opts.transform_as_base_class && !lazy,
        lazy,
        html_element: false,
        stencil_decorated: false,
    };
    bases.visit_program(program);
    if bases.stencil_decorated {
        // Lazy output leaves these classes' static meta getters in place (`convertDecoratorsToStatic`),
        // which need the full `complexType` and docs metadata.
        return Err("stencilrs: decorated base classes and mixins are not ported yet for lazy output.".into());
    }
    if bases.html_element {
        add(&mut target_apis, "HTMLElement");
    }

    for stmt in &program.body {
        let (class, stmt_span) = match stmt {
            Statement::ClassDeclaration(c) => (&**c, c.span),
            Statement::ExportDeclaration(e) => match &e.declaration {
                Declaration::ClassDeclaration(c) => (&**c, e.span),
                _ => continue,
            },
            _ => continue,
        };
        let Some(name) = class.id.as_ref().map(|id| id.name.as_str()) else { continue };
        if !has_decorator(&class.decorators, &component_decorator) {
            continue;
        }
        let Some(cmp) = components.iter().find(|c| c.component_class_name == name) else { continue };

        let info = ClassInfo::collect(class, cmp);
        // Lazy classes aren't elements, so nothing is plain (`isPlain` only drives native output).
        let plain = !lazy && info.is_plain(cmp);

        // Class → `const X = class extends HTMLElement { ... };`
        let header_start = class.decorators.iter().map(|d| d.span.start).min().unwrap_or(stmt_span.start).min(stmt_span.start);
        let extends = match &class.heritage {
            Some(h) => {
                let end = h.type_arguments.as_ref().map_or(h.expression.span().end, |t| t.span.end);
                format!(" extends {}", &source[h.expression.span().start as usize..end as usize])
            }
            None if lazy => String::new(),
            None => {
                add(&mut target_apis, "HTMLElement");
                " extends HTMLElement".to_owned()
            }
        };
        // `createConstClass` keeps the `export` unless the output is `customelement`.
        let export = if !customelement && matches!(stmt, Statement::ExportDeclaration(_)) { "export " } else { "" };
        ed.replace(header_start, class.body.span.start, format!("{export}const {name} = class{extends} "));
        ed.insert(class.body.span.end, ";");

        let mut element_replaced = false;
        let mut ctor: Option<&MethodDefinition> = None;
        let mut connected: Option<&MethodDefinition> = None;
        for el in &class.body.body {
            let (decorators, is_static, key_name, span) = match el {
                ClassElement::PropertyDefinition(p) => (&p.decorators, p.r#static, property_key_name(&p.key), p.span),
                ClassElement::MethodDefinition(m) => (&m.decorators, m.r#static, property_key_name(&m.key), m.span),
                ClassElement::AccessorProperty(a) => (&a.decorators, a.r#static, property_key_name(&a.key), a.span),
                _ => continue,
            };
            for d in decorators.iter().filter(|d| decorator_name(d).is_some_and(|n| remove_decorators.iter().any(|r| r == n))) {
                ed.remove(d.span.start, d.span.end);
            }
            if is_static && key_name.as_deref().is_some_and(|n| STATIC_GETTERS_TO_REMOVE.contains(&n)) {
                ed.remove(span.start, span.end);
                continue;
            }
            match el {
                ClassElement::PropertyDefinition(p) if !p.r#static && key_name.is_some() && key_name == cmp.element_ref => {
                    ed.replace(p.span.start, p.span.end, element_getter(key_name.as_deref().unwrap_or_default(), lazy));
                    element_replaced = true;
                }
                ClassElement::MethodDefinition(m) if m.kind == MethodDefinitionKind::Constructor && m.value.body.is_some() => ctor = Some(m),
                ClassElement::MethodDefinition(m) if m.kind == MethodDefinitionKind::Method && key_name.as_deref() == Some("connectedCallback") => {
                    connected = Some(m)
                }
                _ => {}
            }
        }

        // `updateLazyComponentConstructor`
        if lazy {
            add(&mut runtime_apis, "registerInstance as __stencil_registerInstance");
            let mut stmts = vec!["__stencil_registerInstance(this, hostRef);".to_owned()];
            for ev in &cmp.events {
                add(&mut runtime_apis, "createEvent as __stencil_createEvent");
                stmts.push(event_creation(ev));
            }
            // `createLazyAttachInternalsBinding`
            if let Some(member) = &cmp.attach_internals_member_name {
                stmts.push(format!(
                    "if (hostRef.$hostElement$[\"s-ei\"]) {{ this.{member} = hostRef.$hostElement$[\"s-ei\"]; }} \
                     else {{ this.{member} = hostRef.$hostElement$.attachInternals(); hostRef.$hostElement$[\"s-ei\"] = this.{member}; }}"
                ));
                for state in cmp.attach_internals_custom_states.iter().filter(|s| s.initial_value) {
                    stmts.push(format!("this.{member}.states.add({});", json(&state.name)));
                }
            }
            // `updateConstructor`: the `hostRef` parameter first, `super()` only where the class extends.
            match ctor {
                Some(c) => {
                    let params = &c.value.params;
                    let open = params.span.start + if source.as_bytes()[params.span.start as usize] == b'(' { 1 } else { 0 };
                    let empty = params.items.is_empty() && params.rest.is_none();
                    ed.insert(open, if empty { "hostRef" } else { "hostRef, " });
                    let body = c.value.body.as_ref().expect("constructor body");
                    let first = match body.statements.iter().find(|s| is_super_call(s)) {
                        Some(s) => {
                            ed.remove(s.span().start, s.span().end);
                            text(s.span()).to_owned()
                        }
                        None if class.heritage.is_some() => "super();".to_owned(),
                        None => String::new(),
                    };
                    ed.insert(body.span.start + 1, format!(" {first} {} ", stmts.join(" ")));
                }
                None => {
                    let super_call = if class.heritage.is_some() { "super();" } else { "" };
                    ed.insert(class.body.span.start + 1, format!(" constructor(hostRef) {{ {super_call} {} }} ", stmts.join(" ")));
                }
            }
        }

        // `updateNativeConstructor`
        if !lazy && !plain {
            let mut stmts = vec!["if (registerHost !== false) { this.__registerHost(); }".to_owned()];
            if cmp.encapsulation == Encapsulation::Shadow {
                stmts.push("this.__attachShadow();".into());
            }
            for ev in &cmp.events {
                add(&mut runtime_apis, "createEvent as __stencil_createEvent");
                stmts.push(event_creation(ev));
            }
            // `createNativeAttachInternalsBinding`
            if let Some(member) = &cmp.attach_internals_member_name {
                stmts.push(format!("this.{member} = this.attachInternals();"));
                for state in cmp.attach_internals_custom_states.iter().filter(|s| s.initial_value) {
                    stmts.push(format!("this.{member}.states.add({});", json(&state.name)));
                }
            }
            // `super(false)` when an ancestor was found (`cmp.doesExtend`), not merely when the class has an `extends`.
            let super_call = if cmp.does_extend { "super(false);" } else { "super();" };
            match ctor {
                Some(c) => {
                    let params = &c.value.params;
                    let open = params.span.start + if source.as_bytes()[params.span.start as usize] == b'(' { 1 } else { 0 };
                    let empty = params.items.is_empty() && params.rest.is_none();
                    ed.insert(open, if empty { "registerHost" } else { "registerHost, " });
                    let body = c.value.body.as_ref().expect("constructor body");
                    let found = body.statements.iter().find(|s| is_super_call(s));
                    let first = match found {
                        Some(s) => {
                            ed.remove(s.span().start, s.span().end);
                            if cmp.does_extend { super_call.to_owned() } else { text(s.span()).to_owned() }
                        }
                        None => super_call.to_owned(),
                    };
                    ed.insert(body.span.start + 1, format!(" {first} {} ", stmts.join(" ")));
                }
                None => ed.insert(class.body.span.start + 1, format!(" constructor(registerHost) {{ {super_call} {} }} ", stmts.join(" "))),
            }
        }

        // Members appended at the end of the class, in Stencil's order.
        let mut tail: Vec<String> = Vec::new();
        tail.extend(surviving_static_getters(cmp));
        // Left behind by `attachInternalsDecoratorsToStatic`, after the component's own getters.
        if !cmp.attach_internals_custom_states.is_empty() {
            tail.push(format!("static get attachInternalsCustomStates() {{ return {}; }}", js_value(&custom_states_value(cmp))));
        }
        if cmp.form_associated {
            tail.push("static get formAssociated() { return true; }".into());
        }
        if plain && info.has_render_fn {
            match connected {
                Some(m) => {
                    if let Some(body) = &m.value.body {
                        ed.insert(body.span.start + 1, " this.textContent = this.render(); ");
                    }
                }
                None => tail.push("connectedCallback() { this.textContent = this.render(); }".into()),
            }
        }
        if lazy && cmp.element_ref.is_some() {
            add(&mut runtime_apis, "getElement as __stencil_getElement");
        }
        if let (Some(el), false) = (&cmp.element_ref, element_replaced) {
            tail.push(element_getter(el, lazy));
        }
        if !cmp.watchers.is_empty() {
            tail.push(format!("static get watchers() {{ return {}; }}", js_value(&handlers_value(&cmp.watchers))));
        }
        if !cmp.serializers.is_empty() {
            tail.push(format!("static get serializers() {{ return {}; }}", js_value(&handlers_value(&cmp.serializers))));
        }
        if !cmp.deserializers.is_empty() {
            tail.push(format!("static get deserializers() {{ return {}; }}", js_value(&handlers_value(&cmp.deserializers))));
        }
        if plain {
            tail.push(format!("static get is() {{ return {}; }}", json(&cmp.tag_name)));
        }
        let styles = styles_of(cmp);
        if let Some(expr) = style_expression(cmp, &styles) {
            if lazy {
                // `addStaticStylePropertyToClass`: an assignment after the class.
                define_calls.push(format!("{name}.style = {expr};"));
            } else {
                tail.push(format!("static get style() {{ return {expr}; }}"));
            }
        }
        for style in &styles {
            for (i, url) in style.urls.iter().enumerate() {
                let path = style_import_path(&opts.file, url, cmp, &style.mode);
                style_imports.push(format!("import {}{i} from {};", style.identifier, json(&path)));
            }
        }
        if !tail.is_empty() {
            ed.insert(class.body.span.end - 1, format!(" {} ", tail.join(" ")));
        }

        // `performAutomaticKeyInsertion`
        if let Some(render) = class.body.body.iter().find_map(|el| match el {
            ClassElement::MethodDefinition(m) if m.kind == MethodDefinitionKind::Method && property_key_name(&m.key).as_deref() == Some("render") => Some(m),
            _ => None,
        }) {
            let mut count = ReturnCounter(0);
            count.visit_function(&render.value, oxc::syntax::scope::ScopeFlags::Function);
            if count.0 == 1 {
                let mut keys = KeyInserter { counter: 0, edits: &mut ed };
                if let Some(body) = &render.value.body {
                    keys.visit_function_body(body);
                }
            }
        }

        // `defineCustomElement`, `addModuleMetadataProxies`
        if lazy {
        } else if !customelement {
            add(&mut runtime_apis, "proxyCustomElement as __stencil_proxyCustomElement");
            define_calls.push(format!("__stencil_proxyCustomElement({name}, {});", runtime_meta(cmp, &info, &styles)));
        } else if plain {
            define_calls.push(format!("customElements.define(__stencil_transformTag({}), {name});", json(&cmp.tag_name)));
        } else {
            add(&mut runtime_apis, "transformTag as __stencil_transformTag");
            add(&mut runtime_apis, "defineCustomElement as __stencil_defineCustomElement");
            define_calls.push(format!("__stencil_defineCustomElement({name}, {});", runtime_meta(cmp, &info, &styles)));
        }
    }

    if !style_imports.is_empty() {
        ed.insert(last_import_end.unwrap_or(0), format!("\n{}\n", style_imports.join("\n")));
    }
    if !define_calls.is_empty() {
        ed.insert(source.len() as u32, format!("\n{}\n", define_calls.join("\n")));
    }

    let (edited, offsets) = ed.apply_mapped();
    let (js, printed_map, anchors) = strip_types_and_jsx(&edited, opts)?;

    let apis: Vec<&str> = runtime_apis.iter().chain(target_apis.iter()).copied().collect();
    let (code, prefix_lines) = if apis.is_empty() {
        (js, 0)
    } else {
        (format!("import {{ {} }} from {};\n{js}", apis.join(", "), json(&opts.core_import_path)), 1)
    };
    let map = printed_map.map(|printed| crate::sourcemap::compose(&printed, &edited, &offsets, &anchors, source, &opts.file, prefix_lines));
    Ok(Generated { code, map })
}

fn has_decorator(decorators: &[Decorator], name: &str) -> bool {
    decorators.iter().any(|d| decorator_name(d) == Some(name))
}

fn decorator_name<'a>(d: &'a Decorator) -> Option<&'a str> {
    match &d.expression {
        Expression::CallExpression(call) => match &call.callee {
            Expression::Identifier(id) => Some(id.name.as_str()),
            _ => None,
        },
        _ => None,
    }
}

/// The member decorators that leave static meta getters behind, which is how Stencil tells a
/// base class (`isStencilBaseClass`).
const META_DECORATORS: [&str; 6] = ["Prop", "State", "Event", "Listen", "Watch", "Method"];

/// Classes that are not components, at any depth. Their Stencil member decorators go. A class
/// declaration is a base class when the file is compiled as one (`transformAsBaseClass`) or it
/// has meta decorators: it then extends `HTMLElement` unless it already extends something
/// (`updateNativeBaseClass`). A base class, or any class with a decorated member,
/// that extends something gets a constructor calling `super()` (`updateConstructor`, from
/// `convertDecoratorsToStatic` and `updateNativeBaseClass`). Class expressions (mixin factories'
/// `(Base) => class extends Base {}`) only lose their decorators.
struct BaseClasses<'e, 's, 'n> {
    ed: &'e mut Edits<'s>,
    component: &'n str,
    remove: &'n [String],
    meta: &'n [String],
    as_base: bool,
    /// Lazy output (`lazyComponentTransform`) leaves other classes alone, and the decorated ones
    /// are not ported (`stencil_decorated`).
    lazy: bool,
    html_element: bool,
    stencil_decorated: bool,
}

impl<'a> Visit<'a> for BaseClasses<'_, '_, '_> {
    fn visit_class(&mut self, class: &Class<'a>) {
        if has_decorator(&class.decorators, self.component) {
            return; // components are compiled on their own
        }
        let mut decorated = false;
        let mut meta = false;
        let mut has_stencil_decorator = false;
        let mut ctor = None;
        for el in &class.body.body {
            let decorators = match el {
                ClassElement::PropertyDefinition(p) => &p.decorators,
                ClassElement::MethodDefinition(m) => {
                    if m.kind == MethodDefinitionKind::Constructor && m.value.body.is_some() {
                        ctor = Some(m);
                    }
                    &m.decorators
                }
                ClassElement::AccessorProperty(a) => &a.decorators,
                _ => continue,
            };
            decorated |= !decorators.is_empty();
            for d in decorators {
                let Some(name) = decorator_name(d) else { continue };
                meta |= self.meta.iter().any(|m| m == name);
                if self.remove.iter().any(|r| r == name) {
                    has_stencil_decorator = true;
                    self.ed.remove(d.span.start, d.span.end);
                }
            }
        }
        if self.lazy {
            // Lazy output leaves every other class alone, except that classes with Stencil
            // decorators keep the static meta getters `convertDecoratorsToStatic` wrote.
            self.stencil_decorated |= has_stencil_decorator;
        } else if class.is_declaration() {
            let base = self.as_base || meta;
            let mut extends = class.heritage.is_some();
            // `implements` doesn't count: TypeScript has erased it by the time Stencil looks.
            if base && !extends {
                // After the name and type parameters: `extends` has to come before `implements`.
                match class.type_parameters.as_ref().map(|t| t.span.end).or(class.id.as_ref().map(|id| id.span.end)) {
                    Some(at) => self.ed.insert(at, " extends HTMLElement"),
                    None => self.ed.insert(class.body.span.start, "extends HTMLElement "),
                }
                self.html_element = true;
                extends = true;
            }
            if (decorated || base) && extends {
                match ctor.and_then(|m| m.value.body.as_ref()) {
                    None => self.ed.insert(class.body.span.start + 1, " constructor() { super(); } "),
                    Some(body) if !body.statements.iter().any(is_super_call) => self.ed.insert(body.span.start + 1, " super(); "),
                    Some(_) => {}
                }
            }
        }
        walk::walk_class(self, class);
    }
}

fn is_super_call(s: &Statement) -> bool {
    matches!(s, Statement::ExpressionStatement(e) if matches!(&e.expression, Expression::CallExpression(c) if matches!(c.callee, Expression::Super(_))))
}

fn json(s: &str) -> String {
    serde_json::to_string(s).expect("string")
}

/// Facts about the component class that only code generation needs.
struct ClassInfo {
    methods: Vec<String>,
    has_render_fn: bool,
    has_vdom_render: bool,
    tag_names: Vec<String>,
    has_modern_property_decls: bool,
    /// The class has an `extends` clause, resolvable or not.
    has_heritage: bool,
}

impl ClassInfo {
    fn collect(class: &Class, cmp: &ComponentMeta) -> Self {
        let methods: Vec<String> = class
            .body
            .body
            .iter()
            .filter_map(|el| match el {
                ClassElement::MethodDefinition(m) if m.kind == MethodDefinitionKind::Method => property_key_name(&m.key),
                _ => None,
            })
            .collect();
        let mut vdom = VdomScan::default();
        vdom.visit_class(class);
        let names: Vec<&str> = cmp.properties.iter().filter(|p| !p.getter).map(|p| p.name.as_str()).chain(cmp.states.iter().map(|s| s.name.as_str())).collect();
        // `detectModernPropDeclarations`: a field named like a prop or state, or a computed
        // `@Prop`/`@State` field (its `ogPropName` is the field's own expression).
        let has_modern_property_decls = class.body.body.iter().any(|el| match el {
            ClassElement::PropertyDefinition(p) if p.computed => has_decorator(&p.decorators, "Prop") || has_decorator(&p.decorators, "State"),
            ClassElement::PropertyDefinition(p) => property_key_name(&p.key).is_some_and(|n| names.contains(&n.as_str())),
            _ => false,
        }) || cmp.does_extend;
        let mut tag_names = Vec::new();
        for t in vdom.tags {
            if !tag_names.contains(&t) {
                tag_names.push(t);
            }
        }
        ClassInfo {
            has_render_fn: methods.iter().any(|m| m == "render"),
            methods,
            has_vdom_render: vdom.render,
            tag_names,
            has_modern_property_decls,
            has_heritage: class.heritage.is_some(),
        }
    }

    /// `setComponentBuildConditionals` → `isPlain`.
    fn is_plain(&self, cmp: &ComponentMeta) -> bool {
        let has_member = !cmp.properties.is_empty() || !cmp.states.is_empty() || !cmp.methods.is_empty();
        let has_lifecycle = self.methods.iter().any(|m| LIFECYCLE_METHODS.contains(&m.as_str()));
        !has_member && !has_style(cmp) && !has_lifecycle && cmp.listeners.is_empty() && !self.has_vdom_render && !self.has_heritage
    }

    fn has_slot(&self) -> bool {
        self.tag_names.iter().any(|t| t == "slot")
    }
}

/// `parseCallExpression` / `gatherVdomMeta` over the class, seen through TypeScript's JSX
/// emit: every JSX element or fragment is an `h()` call.
#[derive(Default)]
struct VdomScan {
    render: bool,
    tags: Vec<String>,
}

impl<'a> Visit<'a> for VdomScan {
    fn visit_jsx_opening_element(&mut self, it: &JSXOpeningElement<'a>) {
        self.render = true;
        match &it.name {
            JSXElementName::Identifier(id) => self.tags.push(id.name.to_lowercase()),
            JSXElementName::NamespacedName(n) => self.tags.push(format!("{}:{}", n.namespace.name, n.name.name).to_lowercase()),
            _ => {}
        }
        walk::walk_jsx_opening_element(self, it);
    }

    fn visit_jsx_fragment(&mut self, it: &JSXFragment<'a>) {
        self.render = true;
        walk::walk_jsx_fragment(self, it);
    }

    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        if let Expression::Identifier(id) = &it.callee {
            if matches!(id.name.as_str(), "h" | "__stencil_h" | "createElement" | "jsx" | "jsxs" | "_jsx" | "_jsxs") && !it.arguments.is_empty() {
                if let Some(Expression::StringLiteral(s)) = it.arguments[0].as_expression() {
                    self.tags.push(s.value.to_lowercase());
                }
                if id.name != "createElement" {
                    self.render = true;
                }
            }
        }
        walk::walk_call_expression(self, it);
    }

    fn visit_string_literal(&mut self, it: &StringLiteral<'a>) {
        if it.value.contains("</") {
            if it.value.contains("<slot") {
                self.tags.push("slot".into());
            }
            if it.value.contains("<svg") {
                self.tags.push("svg".into());
            }
        }
    }
}

/// TypeScript's `numReturnStatements` walker: returns nested inside a return don't count.
struct ReturnCounter(usize);

impl<'a> Visit<'a> for ReturnCounter {
    fn visit_return_statement(&mut self, _: &ReturnStatement<'a>) {
        self.0 += 1;
    }
}

/// Adds `key="<base36 counter>"` to JSX opening elements, skipping calls and conditionals and
/// never descending into an element's own attributes.
struct KeyInserter<'e, 's> {
    counter: u32,
    edits: &'e mut Edits<'s>,
}

impl<'a> Visit<'a> for KeyInserter<'_, '_> {
    fn visit_call_expression(&mut self, _: &CallExpression<'a>) {}
    fn visit_conditional_expression(&mut self, _: &ConditionalExpression<'a>) {}
    fn visit_jsx_opening_element(&mut self, it: &JSXOpeningElement<'a>) {
        let has_key = it.attributes.iter().any(|a| match a {
            JSXAttributeItem::Attribute(attr) => match &attr.name {
                JSXAttributeName::Identifier(id) => id.name == "key",
                JSXAttributeName::NamespacedName(_) => false,
            },
            JSXAttributeItem::SpreadAttribute(_) => false,
        });
        if has_key {
            return;
        }
        let at = it.type_arguments.as_ref().map_or(it.name.span().end, |t| t.span.end);
        self.edits.insert(at, format!(" key=\"{}\"", to_base36(self.counter)));
        self.counter += 1;
    }
}

fn to_base36(mut n: u32) -> String {
    const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if n == 0 {
        return "0".into();
    }
    let mut out = Vec::new();
    while n > 0 {
        out.push(DIGITS[(n % 36) as usize]);
        n /= 36;
    }
    out.reverse();
    String::from_utf8(out).expect("ascii")
}

/// Static getters `convertDecoratorsToStatic` adds that `removeStaticMetaProperties` keeps.
fn surviving_static_getters(cmp: &ComponentMeta) -> Vec<String> {
    let o = &cmp.options;
    let enc = o.get("encapsulation");
    let enc_type = enc.and_then(|e| e.get("type")).and_then(Value::as_str);
    let mut out = Vec::new();
    let getter = |name: &str, v: &Value| format!("static get {name}() {{ return {}; }}", js_value(v));
    if enc_type == Some("shadow") {
        let e = enc.expect("encapsulation");
        if e.get("mode").and_then(Value::as_str) == Some("closed") {
            out.push(getter("shadowMode", &Value::String("closed".into())));
        }
        if e.get("delegatesFocus") == Some(&Value::Bool(true)) {
            out.push(getter("delegatesFocus", &Value::Bool(true)));
        }
        if e.get("slotAssignment").and_then(Value::as_str) == Some("manual") {
            out.push(getter("slotAssignment", &Value::String("manual".into())));
        }
        if e.get("clonable") == Some(&Value::Bool(true)) {
            out.push(getter("clonable", &Value::Bool(true)));
        }
        if e.get("serializable") == Some(&Value::Bool(true)) {
            out.push(getter("serializable", &Value::Bool(true)));
        }
    } else if matches!(enc_type, Some("scoped") | Some("none")) {
        if let Some(Value::Array(p)) = enc.and_then(|e| e.get("patches")) {
            if !p.is_empty() {
                out.push(getter("patches", &Value::Array(p.clone())));
            }
        }
    }
    if let Some(Value::Array(dirs)) = o.get("assetsDirs") {
        if !dirs.is_empty() {
            out.push(getter("assetsDirs", &Value::Array(dirs.clone())));
        }
    }
    out
}

/// Watchers, serializers or deserializers as `{ prop: [{ method: 0 }] }`.
fn handlers_value(handlers: &[WatcherMeta]) -> Value {
    let mut obj = serde_json::Map::new();
    for w in handlers {
        let list = obj.entry(w.prop_name.clone()).or_insert_with(|| Value::Array(Vec::new()));
        if let Value::Array(items) = list {
            let mut handler = serde_json::Map::new();
            handler.insert(w.method_name.clone(), Value::from(0));
            items.push(Value::Object(handler));
        }
    }
    let mut entries: Vec<(String, Value)> = obj.into_iter().collect();
    order_like_object_keys(&mut entries, |(k, _)| k.as_str());
    Value::Object(entries.into_iter().collect())
}

/// `attachInternalsCustomStates`: `[{ name, initialValue, docs }]`.
fn custom_states_value(cmp: &ComponentMeta) -> Value {
    Value::Array(
        cmp.attach_internals_custom_states
            .iter()
            .map(|s| serde_json::json!({ "name": s.name, "initialValue": s.initial_value, "docs": s.docs }))
            .collect(),
    )
}

/// A component style mode: its import identifier and external URLs, or an inline string.
struct StyleMode {
    mode: String,
    identifier: String,
    urls: Vec<String>,
    inline: Option<String>,
}

const DEFAULT_STYLE_MODE: &str = "$";

fn styles_of(cmp: &ComponentMeta) -> Vec<StyleMode> {
    let base = format!("{}Style", dash_to_pascal_case(&cmp.tag_name));
    let o = &cmp.options;
    let mut modes = Vec::new();
    let urls: Vec<String> = cmp.style_urls.clone();
    if !urls.is_empty() {
        modes.push(StyleMode { mode: DEFAULT_STYLE_MODE.into(), identifier: base.clone(), urls, inline: None });
    } else if let Some(Value::String(s)) = o.get("styles") {
        modes.push(StyleMode { mode: DEFAULT_STYLE_MODE.into(), identifier: base, urls: Vec::new(), inline: Some(s.clone()) });
    }
    modes
}

fn has_style(cmp: &ComponentMeta) -> bool {
    !styles_of(cmp).is_empty()
}

/// The component's `style`: its imported stylesheets called and joined, or the inline CSS.
fn style_expression(cmp: &ComponentMeta, styles: &[StyleMode]) -> Option<String> {
    let [style] = styles else { return None };
    if !style.urls.is_empty() {
        Some((0..style.urls.len()).map(|i| format!("{}{i}()", style.identifier)).collect::<Vec<_>>().join(" + "))
    } else {
        let css = style.inline.as_deref()?;
        // `createStyleLiteral`: a scoped component's inline styles are scoped at compile time.
        let scoped;
        let css = if cmp.encapsulation == Encapsulation::Scoped {
            scoped = scope_css(css, &scope_id(&cmp.tag_name, Some(&style.mode)), false).ok()?;
            scoped.as_str()
        } else {
            css
        };
        Some(format!("`{}`", css.replace('\\', "\\\\").replace('`', "\\`").replace("${", "\\${")))
    }
}

/// `@Element()`'s getter: the element itself natively, the host looked up through `getElement` lazily.
fn element_getter(name: &str, lazy: bool) -> String {
    if lazy {
        format!("get {name}() {{ return __stencil_getElement(this); }}")
    } else {
        format!("get {name}() {{ return this; }}")
    }
}

/// `addCreateEvents`: `this.<method> = createEvent(this, "<name>", <flags>);`
fn event_creation(ev: &crate::meta::EventMeta) -> String {
    let flags = (if ev.bubbles { 4 } else { 0 }) | (if ev.composed { 2 } else { 0 }) | (if ev.cancelable { 1 } else { 0 });
    format!("this.{} = __stencil_createEvent(this, {}, {flags});", ev.method, json(&ev.name))
}

/// `normalizePath(join(dirname(file), url))` then `serializeImportPath` with query params.
fn style_import_path(file: &str, url: &str, cmp: &ComponentMeta, mode: &str) -> String {
    let file = file.replace('\\', "/");
    let absolute = file.starts_with('/') || file.as_bytes().get(1) == Some(&b':');
    let mut p = if absolute {
        // `serializeImportPath`: an absolute style path is made relative to the importer.
        relative_url(url)
    } else {
        let dir = file.rsplit_once('/').map_or("", |(d, _)| d);
        normalize_path(&if dir.is_empty() { url.to_owned() } else { format!("{dir}/{url}") })
    };
    if !p.starts_with('.') {
        p = format!("./{p}");
    }
    let mut params = vec![format!("tag={}", url_encode(&cmp.tag_name))];
    if mode != DEFAULT_STYLE_MODE {
        params.push(format!("mode={}", url_encode(mode)));
    }
    match cmp.encapsulation {
        Encapsulation::Shadow => params.push("encapsulation=shadow".into()),
        Encapsulation::Scoped => params.push("encapsulation=scoped".into()),
        Encapsulation::None => {}
    }
    format!("{p}?{}", params.join("&"))
}

/// `url` resolved against a directory and made relative to it again: `./a/../b.css` → `b.css`.
fn relative_url(url: &str) -> String {
    let url = url.replace('\\', "/");
    let mut parts: Vec<&str> = Vec::new();
    for part in url.split('/') {
        match part {
            "" | "." => {}
            ".." if parts.last().is_some_and(|p| *p != "..") => {
                parts.pop();
            }
            other => parts.push(other),
        }
    }
    parts.join("/")
}

fn normalize_path(path: &str) -> String {
    let path = path.replace('\\', "/");
    let mut parts: Vec<&str> = Vec::new();
    for part in path.split('/') {
        match part {
            "" | "." => {}
            ".." if parts.last().is_some_and(|p| *p != "..") => {
                parts.pop();
            }
            other => parts.push(other),
        }
    }
    let joined = parts.join("/");
    if parts.len() > 1 && !parts[0].starts_with('.') && !parts[0].starts_with('@') {
        format!("./{joined}")
    } else {
        joined
    }
}

fn url_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'*' => (b as char).to_string(),
            b' ' => "+".into(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

fn dash_to_pascal_case(s: &str) -> String {
    s.to_lowercase()
        .split('-')
        .map(|seg| {
            let mut c = seg.chars();
            match c.next() {
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                None => String::new(),
            }
        })
        .collect()
}

/// `formatComponentRuntimeMeta(cmp, true)`, printed the way `convertValueToLiteral` does.
fn runtime_meta(cmp: &ComponentMeta, info: &ClassInfo, styles: &[StyleMode]) -> String {
    let o = &cmp.options;
    let enc = o.get("encapsulation");
    let mut flags = 0u32;
    match cmp.encapsulation {
        Encapsulation::Shadow => {
            flags |= 1;
            let e = enc.expect("encapsulation");
            if e.get("delegatesFocus") == Some(&Value::Bool(true)) {
                flags |= 1 << 4;
            }
            if e.get("slotAssignment").and_then(Value::as_str) == Some("manual") {
                flags |= 1 << 10;
            }
            if e.get("mode").and_then(Value::as_str) == Some("closed") {
                flags |= 1 << 11;
            }
            if e.get("clonable") == Some(&Value::Bool(true)) {
                flags |= 1 << 16;
            }
            if e.get("serializable") == Some(&Value::Bool(true)) {
                flags |= 1 << 17;
            }
        }
        Encapsulation::Scoped => flags |= 1 << 1,
        Encapsulation::None => {}
    }
    if cmp.encapsulation != Encapsulation::Shadow && info.has_slot() {
        flags |= 1 << 2;
    }
    if info.has_slot() {
        flags |= 1 << 8;
    }
    if styles.iter().any(|s| s.mode != DEFAULT_STYLE_MODE) {
        flags |= 1 << 5;
    }
    if cmp.form_associated {
        flags |= 1 << 6;
    }
    if info.has_modern_property_decls {
        flags |= 1 << 9;
    }
    if let Some(Value::Array(p)) = enc.and_then(|e| e.get("patches")) {
        for patch in p.iter().filter_map(Value::as_str) {
            flags |= match patch {
                "all" => 1 << 15,
                "children" => 1 << 12,
                "clone" => 1 << 13,
                "insert" => 1 << 14,
                _ => 0,
            };
        }
    }

    let mut members: Vec<(String, String)> = Vec::new();
    for p in &cmp.properties {
        let mut f = match p.prop_type {
            PropType::String => 1,
            PropType::Number => 2,
            PropType::Boolean => 4,
            PropType::Any => 8,
            PropType::Unknown => 16,
        };
        if p.mutable {
            f |= 1 << 10;
        }
        if p.reflect {
            f |= 1 << 9;
        }
        if p.getter {
            f |= 1 << 11;
        }
        if p.setter {
            f |= 1 << 12;
        }
        let attr = p.attribute.as_ref().filter(|a| **a != p.name);
        members.push((p.name.clone(), match attr {
            Some(a) => format!("[{f}, {}]", json(a)),
            None => format!("[{f}]"),
        }));
    }
    for s in &cmp.states {
        members.push((s.name.clone(), "[32]".into()));
    }
    for m in &cmp.methods {
        members.push((m.name.clone(), "[64]".into()));
    }
    // Later keys overwrite earlier ones but keep their position, as in an object spread.
    let mut dedup: Vec<(String, String)> = Vec::new();
    for (k, v) in members {
        match dedup.iter_mut().find(|(dk, _)| *dk == k) {
            Some(slot) => slot.1 = v,
            None => dedup.push((k, v)),
        }
    }
    order_like_object_keys(&mut dedup, |(k, _)| k.as_str());

    let listeners: Vec<String> = cmp
        .listeners
        .iter()
        .map(|l| {
            let mut f = 0;
            if l.capture {
                f |= 1 << 1;
            }
            if l.passive {
                f |= 1;
            }
            f |= match l.target.as_deref() {
                Some("document") => 1 << 2,
                Some("window") => 1 << 3,
                Some("body") => 1 << 4,
                _ => 0,
            };
            format!("[{f}, {}, {}]", json(&l.name), json(&l.method))
        })
        .collect();

    let mut items: Vec<Option<String>> = vec![
        Some(flags.to_string()),
        Some(json(&cmp.tag_name)),
        (!dedup.is_empty()).then(|| format!("{{ {} }}", dedup.iter().filter(|(k, _)| !k.starts_with('_')).map(|(k, v)| format!("{}: {v}", json(k))).collect::<Vec<_>>().join(", "))),
        (!listeners.is_empty()).then(|| format!("[{}]", listeners.join(", "))),
        (!cmp.watchers.is_empty()).then(|| js_value(&handlers_value(&cmp.watchers))),
        (!cmp.serializers.is_empty()).then(|| js_value(&handlers_value(&cmp.serializers))),
        (!cmp.deserializers.is_empty()).then(|| js_value(&handlers_value(&cmp.deserializers))),
    ];
    // `trimFalsy`; `flags` 0 is falsy too, but the tag name always follows it.
    while matches!(items.last(), Some(None)) {
        items.pop();
    }
    format!("[{}]", items.into_iter().map(|i| i.unwrap_or_else(|| "undefined".into())).collect::<Vec<_>>().join(", "))
}

/// A JSON value as a JS literal with quoted keys (`convertValueToLiteral`).
fn js_value(v: &Value) -> String {
    match v {
        Value::Object(map) => format!("{{ {} }}", map.iter().filter(|(k, _)| !k.starts_with('_')).map(|(k, v)| format!("{}: {}", json(k), js_value(v))).collect::<Vec<_>>().join(", ")),
        Value::Array(a) => format!("[{}]", a.iter().map(js_value).collect::<Vec<_>>().join(", ")),
        other => other.to_string(),
    }
}

/// TypeScript's enum emit: `var E; (function (E) { E[E["A"] = 0] = "A"; })(E || (E = {}));`.
/// Only literal and auto-increment members; anything else is left to oxc.
/// TypeScript's enum emit, with each member's constant value folded in. `None` (oxc's
/// transform then lowers it) when a member isn't constant.
fn lower_enum(e: &TSEnumDeclaration, exported: bool, locals: &Locals) -> Option<String> {
    if e.declare || e.r#const {
        return None;
    }
    let name = e.id.name.as_str();
    let mut lines = Vec::new();
    for (key, value) in enum_values(e, locals) {
        let key_json = json(&key);
        lines.push(match value? {
            Lit::Str(s) => format!("{name}[{key_json}] = {};", json(&s)),
            Lit::Num(n) => format!("{name}[{name}[{key_json}] = {}] = {key_json};", fmt_num(n)),
        });
    }
    let export = if exported { "export " } else { "" };
    Some(format!("{export}var {name};\n(function ({name}) {{\n{}\n}})({name} || ({name} = {{}}));", lines.join("\n")))
}

fn fmt_num(v: f64) -> String {
    if v.fract() == 0.0 && v.abs() < 1e21 { format!("{}", v as i64) } else { v.to_string() }
}

/// Strip TypeScript and compile JSX with oxc, as TypeScript's emit does for Stencil.
/// With `opts.source_map`, also oxc's map from the output back to `edited`, and where its
/// class member positions should point instead (`MemberAnchors`).
fn strip_types_and_jsx(edited: &str, opts: &CodegenOptions2) -> Result<(String, Option<oxc_sourcemap::SourceMap<'static>>, HashMap<u32, u32>), String> {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(&opts.file).unwrap_or_else(|_| SourceType::tsx()).with_module(true);
    let parsed = Parser::new(&allocator, edited, source_type).parse();
    if parsed.diagnostics.has_errors() {
        let msgs: Vec<String> = parsed.diagnostics.errors().map(|e| e.message.to_string()).collect();
        return Err(format!("stencilrs produced unparsable code: {}\n---\n{edited}", msgs.join("; ")));
    }
    let mut program = parsed.program;
    let mut anchors = MemberAnchors { text: edited, map: HashMap::new() };
    if opts.source_map {
        anchors.visit_program(&program);
    }
    let scoping = SemanticBuilder::new().build(&program).semantic.into_scoping();
    let mut lone_spreads = LoneSpreads(Vec::new());
    if matches!(opts.jsx, Jsx::Classic) {
        lone_spreads.visit_program(&program);
    }

    let mut options = TransformOptions::default();
    options.typescript = TypeScriptOptions {
        jsx_pragma: "h".into(),
        jsx_pragma_frag: "Fragment".into(),
        only_remove_type_imports: false,
        ..TypeScriptOptions::default()
    };
    options.jsx = match &opts.jsx {
        Jsx::Classic => JsxOptions {
            runtime: JsxRuntime::Classic,
            pragma: Some("h".into()),
            pragma_frag: Some("Fragment".into()),
            pure: false,
            ..JsxOptions::default()
        },
        Jsx::Automatic { import_source } => JsxOptions {
            runtime: JsxRuntime::Automatic,
            import_source: Some(import_source.clone()),
            pure: false,
            ..JsxOptions::default()
        },
    };
    let ret = Transformer::new(&allocator, Path::new(&opts.file), &options).build_with_scoping(scoping, &mut program);
    if !ret.diagnostics.is_empty() {
        let msgs: Vec<String> = ret.diagnostics.iter().map(|e| e.message.to_string()).collect();
        return Err(format!("oxc transform failed: {}", msgs.join("; ")));
    }
    if !lone_spreads.0.is_empty() {
        let mut wrap = WrapLoneSpreads { spans: lone_spreads.0, builder: AstBuilder::new(&allocator) };
        wrap.visit_program(&mut program);
    }
    // TypeScript emits the automatic runtime's import as the module's first statement.
    if let Jsx::Automatic { import_source } = &opts.jsx {
        let runtime = format!("{import_source}/jsx-runtime");
        if let Some(i) = program.body.iter().position(|s| matches!(s, Statement::ImportDeclaration(d) if d.source.value == runtime.as_str())) {
            program.body[..=i].rotate_right(1);
        }
    }
    let options = CodegenOptions { source_map_path: opts.source_map.then(|| PathBuf::from(&opts.file)), ..CodegenOptions::default() };
    let printed = Codegen::new().with_options(options).build(&program);
    Ok((printed.code, printed.map.map(|m| m.into_owned()), anchors.map))
}

/// oxc's printer maps a class member to its span start. TypeScript modifiers don't survive
/// into the output, so for `private foo() {}` that is the `private` the output never prints.
/// This collects, per member start, the offset of what the output does start with: the first
/// token after the modifiers (`static`, `async`, `get`, `*`, or the key).
struct MemberAnchors<'t> {
    text: &'t str,
    map: HashMap<u32, u32>,
}

impl MemberAnchors<'_> {
    fn add(&mut self, span: Span, decorators: &[Decorator]) {
        let from = decorators.last().map_or(span.start, |d| d.span.end);
        let at = skip_ts_modifiers(self.text, from, span.end);
        if at != span.start {
            self.map.insert(span.start, at);
        }
    }
}

impl<'a> Visit<'a> for MemberAnchors<'_> {
    fn visit_method_definition(&mut self, it: &MethodDefinition<'a>) {
        self.add(it.span, &it.decorators);
        walk::walk_method_definition(self, it);
    }
    fn visit_property_definition(&mut self, it: &PropertyDefinition<'a>) {
        self.add(it.span, &it.decorators);
        walk::walk_property_definition(self, it);
    }
    fn visit_accessor_property(&mut self, it: &AccessorProperty<'a>) {
        self.add(it.span, &it.decorators);
        walk::walk_accessor_property(self, it);
    }
}

/// The offset of the first token at or after `from` that isn't a TypeScript-only modifier. A
/// modifier word followed by `(`, `=`, `:`, `;`, `?`, `!`, `<` or `}` is the member's name.
fn skip_ts_modifiers(text: &str, from: u32, end: u32) -> u32 {
    let end = (end as usize).min(text.len());
    let mut at = from as usize;
    loop {
        let start = at + (text[at..end].len() - text[at..end].trim_start().len());
        let word_len = text[start..end].find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '$')).unwrap_or(end - start);
        let word = &text[start..start + word_len];
        let rest = text[start + word_len..end].trim_start();
        let is_name = rest.is_empty() || rest.starts_with(['(', '=', ':', ';', '?', '!', '<', '}']);
        if matches!(word, "public" | "private" | "protected" | "readonly" | "override" | "declare" | "abstract") && !is_name {
            at = start + word_len;
        } else {
            return start as u32;
        }
    }
}

/// Spans of the argument of JSX elements whose only attribute is a spread (`<svg {...p}>`).
struct LoneSpreads(Vec<Span>);

impl<'a> Visit<'a> for LoneSpreads {
    fn visit_jsx_opening_element(&mut self, it: &JSXOpeningElement<'a>) {
        if let [JSXAttributeItem::SpreadAttribute(s)] = it.attributes.as_slice() {
            self.0.push(s.argument.span());
        }
        walk::walk_jsx_opening_element(self, it);
    }
}

/// Babel-style classic JSX (oxc) passes a lone spread straight through, `h("svg", p)`;
/// TypeScript copies it, `h("svg", { ...p })`. Wrap those arguments back up.
struct WrapLoneSpreads<'a> {
    spans: Vec<Span>,
    builder: AstBuilder<'a>,
}

impl<'a> VisitMut<'a> for WrapLoneSpreads<'a> {
    fn visit_call_expression(&mut self, it: &mut CallExpression<'a>) {
        walk_mut::walk_call_expression(self, it);
        let is_h = matches!(&it.callee, Expression::Identifier(id) if id.name == "h");
        if !is_h || it.arguments.len() < 2 || matches!(it.arguments[1], Argument::ObjectExpression(_)) {
            return;
        }
        if !self.spans.contains(&it.arguments[1].span()) {
            return;
        }
        let span = it.arguments[1].span();
        let arg = it.arguments[1].take_in(&self.builder).into_expression();
        let props = oxc::allocator::Vec::from_iter_in([ObjectPropertyKind::new_spread_property(span, arg, &self.builder)], &self.builder);
        it.arguments[1] = Argument::ObjectExpression(ObjectExpression::boxed(span, props, &self.builder));
    }
}

/// Print JavaScript through one printer so outputs can be compared regardless of formatting.
pub fn normalize(code: &str) -> Result<String, String> {
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, code, SourceType::mjs()).parse();
    if parsed.diagnostics.has_errors() {
        let msgs: Vec<String> = parsed.diagnostics.errors().map(|e| e.message.to_string()).collect();
        return Err(msgs.join("; "));
    }
    let options = CodegenOptions { comments: CommentOptions::disabled(), ..CodegenOptions::default() };
    Ok(Codegen::new().with_options(options).build(&parsed.program).code)
}
