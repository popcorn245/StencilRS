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
        ("val: Mode.DEFAULT", "enum Mode { DEFAULT = 'default' }", String),
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
        assert_eq!(prop_type(decl, prelude), *expected, "`{decl}` with `{prelude}`");
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

    assert_eq!((c.events[0].name.as_str(), c.events[0].bubbles), ("thingChanged", true));
    assert_eq!((c.events[1].name.as_str(), c.events[1].method.as_str(), c.events[1].bubbles), ("my-event", "other", false));

    assert_eq!(c.methods[0].name, "open");
    assert_eq!((c.watchers[0].prop_name.as_str(), c.watchers[0].method_name.as_str()), ("count", "onCount"));

    // `scroll` is passive by default, `click` is not
    assert_eq!((c.listeners[0].target.as_deref(), c.listeners[0].passive), (Some("window"), true));
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
    assert!(d.iter().any(|d| d.level == Level::Error && d.message.contains("must contain a dash")));
    assert!(d.iter().any(|d| d.level == Level::Warn && d.message.contains("looks like an event")));
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
    let widened = analyze_with(&src.replace("@Watch(Names.Label)", "@Watch(LOOSE.size)"), &file, true, false);
    assert_eq!(widened.diagnostics[0].message, "Error: invalid decorator argument: LOOSE.size");
    assert!(widened.components.is_empty());

    // Single-file mode can't see the import.
    let single = analyze(src, &file);
    assert_eq!(single.diagnostics[0].message, "Error: invalid decorator argument: VALUE");
    std::fs::remove_dir_all(&dir).ok();
}
