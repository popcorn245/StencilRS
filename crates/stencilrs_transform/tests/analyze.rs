//! Expectations taken from Stencil v5's own specs
//! (`transformers/_test_/parse-props.spec.ts`, `convert-decorators.spec.ts`, `parse-events.spec.ts`)
//! and from the single-file `transpileSync` behaviour for unresolved types.

use stencilrs_transform::meta::{Encapsulation, Level, PropType};
use stencilrs_transform::{analyze, analyze_with, to_dash_case};

fn prop_type(decl: &str, prelude: &str) -> PropType {
    let src = format!(
        "import {{ Component, Prop }} from '@stencil/core';\n{prelude}\n@Component({{ tag: 'cmp-a' }})\nexport class CmpA {{ @Prop() {decl}; }}"
    );
    let result = analyze(&src, "cmp-a.tsx");
    assert!(result.diagnostics.is_empty(), "{:?}", result.diagnostics);
    result.components[0].properties[0].prop_type
}

#[test]
fn prop_types_follow_stencils_rules() {
    use PropType::*;
    let cases: &[(&str, &str, PropType)] = &[
        ("val: string", "", String),
        ("val: number", "", Number),
        ("val: boolean", "", Boolean),
        ("val: any", "", Any),
        ("val: unknown", "", Unknown),
        ("val: 'a' | 'b'", "", String),
        ("val: 1 | 2", "", Number),
        ("val: boolean | undefined", "", Boolean),
        ("val: string | null", "", String),
        ("val: string | number", "", Any),
        ("val: string | string[]", "", String),
        ("val: string[]", "", Unknown),
        ("val: { a: string }", "", Unknown),
        ("val: () => void", "", Unknown),
        // same-file declarations are followed
        ("val: Size", "type Size = 'sm' | 'lg';", String),
        ("val: Mode", "enum Mode { DEFAULT = 'default' }", String),
        ("val: Level", "enum Level { Low, High }", Number),
        ("val: Mixed", "enum Mixed { A = 'a', B = 1 }", Any),
        (
            "val: Mode.DEFAULT",
            "enum Mode { DEFAULT = 'default' }",
            String,
        ),
        ("val: Opts", "interface Opts { a: string }", Unknown),
        // unresolved names are `any`, like Stencil's single-file program
        ("val: Foo", "", Any),
        ("val: Foo | string", "", Any),
        // no annotation: widened from the initializer
        ("val = 'initial value'", "", String),
        ("val = 3", "", Number),
        ("val = -3", "", Number),
        ("val = true", "", Boolean),
        ("val = null", "", Unknown),
        ("val = []", "", Unknown),
        ("val", "", Any),
    ];
    for (decl, prelude, expected) in cases {
        assert_eq!(
            prop_type(decl, prelude),
            *expected,
            "`{decl}` with `{prelude}`"
        );
    }
}

#[test]
fn prop_attribute_and_reflect() {
    let src = r#"
        import { Component, Prop } from '@stencil/core';
        @Component({ tag: 'cmp-a' })
        export class CmpA {
            @Prop() val: string = "initial value";
            @Prop({ reflect: true, mutable: true }) firstName!: string;
            @Prop({ attribute: 'MY-ATTR' }) renamed: number;
            @Prop({ attribute: null }) noAttr: boolean;
            @Prop() complex: string[];
            @Prop() val2?: string;
        }
    "#;
    let result = analyze(src, "cmp-a.tsx");
    assert!(result.diagnostics.is_empty(), "{:?}", result.diagnostics);
    let props = &result.components[0].properties;

    assert_eq!(props[0].attribute.as_deref(), Some("val"));
    assert!(!props[0].reflect);
    assert_eq!(props[0].default_value.as_deref(), Some("\"initial value\""));
    assert_eq!(props[0].complex_type_original, "string");

    assert_eq!(props[1].attribute.as_deref(), Some("first-name"));
    assert!(props[1].reflect);
    assert!(props[1].mutable);
    assert!(props[1].required);

    assert_eq!(props[2].attribute.as_deref(), Some("my-attr"));
    // Stencil v5 quirk: `attribute: null` is read as an AST node, not null, so it is ignored.
    assert_eq!(props[3].attribute.as_deref(), Some("no-attr"));

    // `unknown` props get no attribute and never reflect
    assert_eq!(props[4].prop_type, PropType::Unknown);
    assert_eq!(props[4].attribute, None);
    assert!(!props[4].reflect);

    assert_eq!(props[5].attribute.as_deref(), Some("val-2"));
    assert!(props[5].optional);
}

#[test]
fn getter_props() {
    let src = r#"
        import { Component, Prop } from '@stencil/core';
        @Component({ tag: 'cmp-a' })
        export class CmpA {
            private _v = 'x';
            @Prop() get value(): string { return this._v; }
            set value(v: string) { this._v = v; }
        }
    "#;
    let p = &analyze(src, "cmp-a.tsx").components[0].properties[0];
    assert!(p.getter && p.setter);
    assert_eq!(p.prop_type, PropType::String);
}

#[test]
fn component_options_and_members() {
    let src = r#"
        import { Component, Element, Event, EventEmitter, Listen, Method, State, Watch } from '@stencil/core';
        @Component({ tag: 'my-cmp', styleUrl: 'my-cmp.css', encapsulation: { type: 'shadow' } })
        export class MyCmp {
            @Element() el: HTMLElement;
            @State() count = 0;
            @Event() thingChanged: EventEmitter<string>;
            @Event({ eventName: 'my-event', bubbles: false }) other: EventEmitter;
            @Method() async open(): Promise<void> {}
            @Watch('count') onCount() {}
            @Listen('scroll', { target: 'window' }) onScroll() {}
            @Listen('click') onClick() {}
        }
    "#;
    let result = analyze(src, "my-cmp.tsx");
    assert!(result.diagnostics.is_empty(), "{:?}", result.diagnostics);
    let c = &result.components[0];

    assert_eq!(c.tag_name, "my-cmp");
    assert_eq!(c.component_class_name, "MyCmp");
    assert_eq!(c.encapsulation, Encapsulation::Shadow);
    assert_eq!(c.style_urls, ["my-cmp.css"]);
    assert_eq!(c.element_ref.as_deref(), Some("el"));
    assert_eq!(c.states[0].name, "count");

    assert_eq!(
        (c.events[0].name.as_str(), c.events[0].bubbles),
        ("thingChanged", true)
    );
    assert_eq!(
        (
            c.events[1].name.as_str(),
            c.events[1].method.as_str(),
            c.events[1].bubbles
        ),
        ("my-event", "other", false)
    );

    assert_eq!(c.methods[0].name, "open");
    assert_eq!(
        (
            c.watchers[0].prop_name.as_str(),
            c.watchers[0].method_name.as_str()
        ),
        ("count", "onCount")
    );

    // `scroll` is passive by default, `click` is not
    assert_eq!(
        (c.listeners[0].target.as_deref(), c.listeners[0].passive),
        (Some("window"), true)
    );
    assert!(!c.listeners[1].passive);
}

#[test]
fn aliased_imports_are_recognised() {
    let src = r#"
        import { Component as C, Prop as P } from '@stencil/core';
        @C({ tag: 'cmp-a' })
        export class CmpA { @P() val: number; }
    "#;
    let c = &analyze(src, "cmp-a.tsx").components[0];
    assert_eq!(c.properties[0].prop_type, PropType::Number);
}

#[test]
fn v4_encapsulation_keys_are_errors() {
    let src = "import { Component } from '@stencil/core';\n@Component({ tag: 'cmp-a', shadow: true })\nexport class CmpA {}";
    let d = &analyze(src, "cmp-a.tsx").diagnostics;
    assert_eq!(d.len(), 1);
    assert_eq!(d[0].level, Level::Error);
    assert!(d[0].message.contains("\"shadow\""));
}

#[test]
fn tag_validation_and_event_like_prop_warning() {
    let src = "import { Component, Prop } from '@stencil/core';\n@Component({ tag: 'nodash' })\nexport class CmpA { @Prop() onClick: string; }";
    let d = &analyze(src, "cmp-a.tsx").diagnostics;
    assert!(
        d.iter()
            .any(|d| d.level == Level::Error && d.message.contains("must contain a dash"))
    );
    assert!(
        d.iter()
            .any(|d| d.level == Level::Warn && d.message.contains("looks like an event"))
    );
}

#[test]
fn dash_case_matches_stencil() {
    assert_eq!(to_dash_case("firstName"), "first-name");
    assert_eq!(to_dash_case("val2"), "val-2");
    assert_eq!(to_dash_case("URL"), "u-r-l");
    assert_eq!(to_dash_case("value"), "value");
}

/// A full `stencil build` resolves constants imported from other modules (single-file
/// `transpileSync` can't, see `parity/fixtures/features/diag-const-imported.tsx`).
#[test]
fn imported_constants_resolve_in_build_accurate_mode() {
    let dir = std::env::temp_dir().join(format!("stencilrs-consts-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("keys.ts"),
        "export const VALUE = 'value';\n\
         export const KEYS = { open: 'open' } as const;\n\
         export enum Events { Focus = 'focusin' }\n\
         export class Names { static readonly Label = 'label'; }\n\
         const LOOSE = { size: 'size' };\n\
         export { LOOSE };\n",
    )
    .unwrap();
    std::fs::write(dir.join("index.ts"), "export * from './keys';\n").unwrap();
    let src = "import { Component, Listen, Prop, Watch, resolveVar } from '@stencil/core';\n\
               import { VALUE, KEYS, Events, Names, LOOSE } from './index';\n\
               @Component({ tag: 'cmp-a' })\n\
               export class CmpA {\n\
                 @Prop() value: string; @Prop() open: boolean; @Prop() label: string;\n\
                 @Prop() [VALUE + 'X']: string;\n\
                 @Watch(VALUE) @Watch(KEYS.open) @Watch(Names.Label) a() {}\n\
                 @Watch(resolveVar(KEYS.open)) b() {}\n\
                 @Listen(Events.Focus) c() {}\n\
               }";
    let file = dir.join("cmp-a.tsx").to_string_lossy().replace('\\', "/");

    let built = analyze_with(src, &file, true, false);
    assert!(built.diagnostics.is_empty(), "{:?}", built.diagnostics);
    let c = &built.components[0];
    let watched: Vec<_> = c.watchers.iter().map(|w| w.prop_name.as_str()).collect();
    assert_eq!(watched, ["value", "open", "label", "open"]);
    assert_eq!(c.listeners[0].name, "focusin");

    // A widened member is still invalid, as in the full build.
    let widened = analyze_with(
        &src.replace("@Watch(Names.Label)", "@Watch(LOOSE.size)"),
        &file,
        true,
        false,
    );
    assert_eq!(
        widened.diagnostics[0].message,
        "Error: invalid decorator argument: LOOSE.size"
    );
    assert!(widened.components.is_empty());

    // Single-file mode can't see the import.
    let single = analyze(src, &file);
    assert_eq!(
        single.diagnostics[0].message,
        "Error: invalid decorator argument: VALUE"
    );
    std::fs::remove_dir_all(&dir).ok();
}

fn resolved_of(
    decl: &str,
    prelude: &str,
    complex_types: bool,
) -> (String, Vec<String>, Vec<String>) {
    let src = format!(
        "import {{ Component, Prop }} from '@stencil/core';\n{prelude}\n@Component({{ tag: 'cmp-a' }})\nexport class CmpA {{ @Prop() {decl}; }}"
    );
    let result = analyze_with(&src, "cmp-a.tsx", false, complex_types);
    let ct = &result.components[0].properties[0].complex_type;
    let refs = ct.references.0.iter().map(|(n, _)| n.clone()).collect();
    (
        ct.resolved.clone(),
        refs,
        result
            .diagnostics
            .iter()
            .map(|d| d.message.clone())
            .collect(),
    )
}

#[test]
fn intersection_types_resolve_as_the_checker_prints_them() {
    // Object literals: the members in written order, each printed in full.
    let (resolved, _, diags) = resolved_of("both: { a: number } & { b: string }", "", true);
    assert_eq!(resolved, "{ a: number; } & { b: string; }");
    assert!(diags.is_empty(), "{diags:?}");
    // Without `complexTypes` too, and the union next to it is unchanged.
    assert_eq!(
        resolved_of("both: { a: number } & { b: string }", "", false).0,
        "{ a: number; } & { b: string; }"
    );
    assert_eq!(
        resolved_of("either: { a: number } | { b: string }", "", false).0,
        "{ a: number; } | { b: string; }"
    );
    // References and aliases: interfaces print by name, a nested intersection is flattened,
    // a repeated member is dropped, references come from every member.
    let prelude = "interface A { x: number }\ninterface B { y: string }\ntype AB = A & B;";
    let (resolved, refs, diags) = resolved_of("v: A & B", prelude, true);
    assert_eq!(
        (resolved.as_str(), refs.as_slice()),
        ("A & B", ["A".to_owned(), "B".to_owned()].as_slice())
    );
    assert!(diags.is_empty(), "{diags:?}");
    assert_eq!(resolved_of("v: (A & B) & A", prelude, true).0, "A & B");
    // A top-level alias prints its definition, as it does for unions.
    assert_eq!(resolved_of("v: AB", prelude, true).0, "A & B");
    // A brand on a primitive.
    assert_eq!(
        resolved_of("v: string & { __brand: 'id' }", "", true).0,
        "string & { __brand: \"id\"; }"
    );
    // A union member is distributed as the checker does.
    let (resolved, _, diags) = resolved_of("v: (A | B) & { c: 1 }", prelude, true);
    assert_eq!(resolved, "A & { c: 1; } | B & { c: 1; }");
    assert!(diags.is_empty(), "{diags:?}");
    // A union with a literal member collapses in the checker: not ported.
    let (resolved, _, diags) = resolved_of("v: (A | 'x') & { c: 1 }", prelude, true);
    assert_eq!(resolved, "");
    assert_eq!(diags.len(), 1);
    assert!(
        diags[0].contains("intersection type") && diags[0].contains("not ported yet"),
        "{diags:?}"
    );
    // Without `complexTypes` an unresolved type stays silent, as for `keyof` and `typeof`.
    let (resolved, _, diags) = resolved_of("v: string & number", "", false);
    assert_eq!((resolved.as_str(), diags.len()), ("", 0));
}

/// The shapes Ionic's components give complexType, resolved across files as `stencil build` does.
/// The expected text is what Stencil v5's own build prints (`parity/build.mjs` compares the same
/// shapes against it, member by member).
#[test]
fn ionic_shaped_types_resolve_across_files() {
    let dir = std::env::temp_dir().join(format!("stencilrs-ionic-shapes-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("tsconfig.json"),
        "{ \"compilerOptions\": { \"strict\": true } }",
    )
    .unwrap();
    std::fs::write(
        dir.join("interface.d.ts"),
        "export type PredefinedColors = 'primary' | 'dark';\n\
         export type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>);\n\
         export type Color = LiteralUnion<PredefinedColors, string>;\n\
         export type ComponentRef = Function | HTMLElement | string | null;\n\
         export type ComponentProps<T = null> = { [key: string]: any };\n\
         export interface Detail<T = any> { data?: T }\n\
         export type { NavComponent } from './nav-interface';\n",
    )
    .unwrap();
    std::fs::write(
        dir.join("nav-interface.ts"),
        "import type { ComponentRef } from './interface';\nexport type NavComponent = ComponentRef | number;\n",
    )
    .unwrap();
    std::fs::write(dir.join("spinners.ts"), "const spinners = { bubbles: 1, 'lines-small': 2 };\nexport type SpinnerTypes = keyof typeof spinners;\n").unwrap();
    let src = "import { Component, Method, Prop } from '@stencil/core';\n\
               import type { Color, ComponentProps, ComponentRef, Detail } from './interface';\n\
               import type { NavComponent } from './nav-interface';\n\
               import type { SpinnerTypes } from './spinners';\n\
               @Component({ tag: 'cmp-a' })\n\
               export class CmpA {\n\
                 @Prop() color: Color;\n\
                 @Prop() colors: Color[];\n\
                 @Prop() component: ComponentRef;\n\
                 @Prop() props: ComponentProps;\n\
                 @Prop() typed: ComponentProps<string>;\n\
                 @Prop() detail: Detail;\n\
                 @Prop() root: NavComponent;\n\
                 @Prop() spinner: SpinnerTypes | null;\n\
                 @Method() async onDidDismiss<T = any>(): Promise<Detail<T>> { return null as any; }\n\
                 @Method() async push<T extends string>(item: T, extra?: Record<string, any>): Promise<T[]> { return [item]; }\n\
                 @Method() async setFocus(ev?: globalThis.Event) {}\n\
               }";
    let file = dir.join("cmp-a.tsx").to_string_lossy().replace('\\', "/");
    let result = analyze_with(src, &file, true, true);
    assert!(result.diagnostics.is_empty(), "{:?}", result.diagnostics);
    let c = &result.components[0];
    let resolved: Vec<(&str, &str)> = c
        .properties
        .iter()
        .map(|p| (p.name.as_str(), p.complex_type.resolved.as_str()))
        .collect();
    assert_eq!(
        resolved,
        [
            (
                "color",
                "\"dark\" | \"primary\" | string & Record<never, never>"
            ),
            (
                "colors",
                "(\"dark\" | \"primary\" | string & Record<never, never>)[]"
            ),
            ("component", "Function | HTMLElement | null | string"),
            // An alias written without its type arguments is read off its declaration: `T`.
            ("props", "T"),
            ("typed", "string"),
            // A generic interface written without arguments is printed with its defaults.
            ("detail", "Detail<any>"),
            ("root", "Function | HTMLElement | null | number | string"),
            ("spinner", "\"bubbles\" | \"lines-small\" | null"),
        ]
    );
    let m = |name: &str| {
        c.methods
            .iter()
            .find(|m| m.name == name)
            .unwrap()
            .complex_type
            .clone()
    };
    let dismiss = m("onDidDismiss");
    assert_eq!(dismiss.signature, "<T = any>() => Promise<Detail<T>>");
    assert_eq!(dismiss.return_type, "Promise<Detail<T>>");
    let names: Vec<_> = dismiss
        .references
        .0
        .iter()
        .map(|(n, _)| n.as_str())
        .collect();
    assert_eq!(names, ["Promise", "Detail", "T"]);
    let push = m("push");
    assert_eq!(
        push.signature,
        "<T extends string>(item: T, extra?: Record<string, any>) => Promise<T[]>"
    );
    let types: Vec<_> = push
        .parameters
        .iter()
        .map(|p| p.type_text.as_str())
        .collect();
    assert_eq!(types, ["T", "Record<string, any> | undefined"]);
    let focus = m("setFocus");
    assert_eq!(
        (focus.signature.as_str(), focus.return_type.as_str()),
        ("(ev?: globalThis.Event) => Promise<void>", "Promise<void>")
    );
    assert_eq!(focus.references.0[0].0, "Promise");

    // What needs the checker stays Stencil's: a union ordered by type id, an inferred return type.
    let src = "import { Component, Method } from '@stencil/core';\n\
               @Component({ tag: 'cmp-b' })\n\
               export class CmpB {\n\
                 @Method() async present(e?: MouseEvent | TouchEvent): Promise<void> {}\n\
                 @Method() async progress() { return [1].length; }\n\
               }";
    let result = analyze_with(src, &file, true, true);
    let messages: Vec<_> = result
        .diagnostics
        .iter()
        .map(|d| d.message.as_str())
        .collect();
    assert_eq!(
        messages,
        [
            "stencilrs: the type of method `present` (a union whose order depends on the whole program) is left to Stencil's compiler. Add \"stableTypeOrdering\": true to the tsconfig to compile it with stencilrs.",
            "stencilrs: the type of method `progress` (a return type inferred from the body) is not ported yet.",
        ]
    );
    std::fs::remove_dir_all(&dir).ok();
}

/// With `stableTypeOrdering` on, a union the comparator cannot order is still not ported, but the
/// remedy (turn the option on) would be false, so the message must not offer it.
#[test]
fn an_undecidable_union_with_the_option_on_does_not_carry_the_hint() {
    let dir = std::env::temp_dir().join(format!("stencilrs-undecidable-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("tsconfig.json"),
        "{ \"compilerOptions\": { \"strict\": true, \"stableTypeOrdering\": true } }",
    )
    .unwrap();
    std::fs::write(
        dir.join("types.ts"),
        "export interface Item { a: string }\nexport enum Level { A, B }\nexport enum Kind { C, D }\n",
    )
    .unwrap();
    let src = "import { Component, Method } from '@stencil/core';\n\
               import { Item, Kind, Level } from './types';\n\
               @Component({ tag: 'cmp-u' })\n\
               export class CmpU {\n\
                 @Method() async enumAndObject(v: Item | Level | Kind): Promise<void> {}\n\
               }";
    let file = dir.join("cmp-u.tsx").to_string_lossy().replace('\\', "/");
    let result = analyze_with(src, &file, true, true);
    let messages: Vec<_> = result
        .diagnostics
        .iter()
        .map(|d| d.message.as_str())
        .collect();
    assert_eq!(
        messages,
        ["stencilrs: the type of method `enumAndObject` (a union whose member order the `stableTypeOrdering` comparator cannot decide) is not ported yet."]
    );
    assert!(!messages[0].contains("Add \"stableTypeOrdering\""));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn slots_merge_the_jsdoc_tags_with_the_slots_of_the_jsx() {
    let src = "import { Component, h } from '@stencil/core';\n\
               /**\n * @slot start - At the start.\n * @slot - Main content.\n */\n\
               @Component({ tag: 'cmp-s' })\n\
               export class CmpS {\n\
                 render() { return <div><slot name=\"start\" /><slot /><slot name=\"b\" /><slot name={this.x} /><slot name=\"a\" /></div>; }\n\
               }";
    let result = analyze(src, "cmp-s.tsx");
    let slots: Vec<_> = result.components[0]
        .slots
        .iter()
        .map(|s| (s.name.as_str(), s.docs.as_str()))
        .collect();
    assert_eq!(
        slots,
        [
            ("", "Main content."),
            ("a", ""),
            ("b", ""),
            ("start", "At the start.")
        ]
    );
}

#[test]
fn a_prop_initialised_from_a_field_of_the_class_takes_the_field_type() {
    let src = "import { Component, Prop } from '@stencil/core';\n\
               @Component({ tag: 'cmp-t' })\n\
               export class CmpT {\n\
                 private id = `x-${1}`;\n\
                 private n: number = 1;\n\
                 @Prop() name = this.id;\n\
                 @Prop() count = this.n;\n\
               }";
    let result = analyze(src, "cmp-t.tsx");
    let types: Vec<_> = result.components[0]
        .properties
        .iter()
        .map(|p| (p.prop_type, p.complex_type.original.as_str()))
        .collect();
    assert_eq!(
        types,
        [(PropType::String, "string"), (PropType::Number, "number")]
    );
}
