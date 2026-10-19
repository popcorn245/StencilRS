//! Code generation for the customelement output. Exact parity against Stencil v5 is checked by
//! `parity/` (all fixtures); these cover the shape of the output.

use stencilrs_transform::{DEFAULT_CORE_IMPORT_PATH, Jsx, TranspileOptions, normalize, transpile};

fn run(src: &str, jsx: Jsx) -> String {
    let opts = TranspileOptions { file: "cmp/cmp-a.tsx".into(), core_import_path: DEFAULT_CORE_IMPORT_PATH.into(), jsx, resolve_imports: false, source_map: false, transform_as_base_class: false };
    let out = transpile(src, &opts);
    assert!(out.diagnostics.is_empty(), "{:?}", out.diagnostics);
    normalize(&out.code).expect("valid JS")
}

#[test]
fn component_becomes_a_custom_element() {
    let code = run(
        r#"
        import { Component, Prop, State, Event, EventEmitter, Element, Watch, h } from '@stencil/core';
        @Component({ tag: 'cmp-a', styleUrl: 'cmp-a.css', encapsulation: { type: 'shadow' } })
        export class CmpA {
            @Element() el: HTMLElement;
            @Prop({ reflect: true }) firstName: string = 'x';
            @State() open = false;
            @Event() changed: EventEmitter<string>;
            @Watch('firstName') onName() {}
            render() { return <div class="a">{this.firstName}</div>; }
        }
        "#,
        Jsx::Classic,
    );
    for expected in [
        r#"import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";"#,
        r#"import { h } from "@stencil/core/runtime/client/standalone";"#,
        r#"import CmpAStyle0 from "./cmp/cmp-a.css?tag=cmp-a&encapsulation=shadow";"#,
        "const CmpA = class extends HTMLElement {",
        "this.__attachShadow();",
        r#"this.changed = __stencil_createEvent(this, "changed", 7);"#,
        "get el() {",
        r#"firstName = "x";"#,
        r#"h("div", {"#,
        r#"key: "0","#,
        "static get watchers() {",
        "static get style() {",
        "__stencil_defineCustomElement(CmpA, [",
    ] {
        assert!(code.contains(expected), "missing `{expected}` in:\n{code}");
    }
    assert!(!code.contains("@Prop"), "decorators left in:\n{code}");
    assert!(!code.contains(": string"), "types left in:\n{code}");
}

#[test]
fn automatic_runtime_and_keys() {
    let code = run(
        r#"
        import { Component, Host } from '@stencil/core';
        @Component({ tag: 'cmp-a' })
        export class CmpA {
            items: string[] = [];
            render() { return <Host><ul>{this.items.map((i) => <li>{i}</li>)}</ul></Host>; }
        }
        "#,
        Jsx::Automatic { import_source: "@stencil/core".into() },
    );
    assert!(code.contains(r#"import { jsx as _jsx } from "@stencil/core/jsx-runtime";"#), "{code}");
    // Elements inside a call (the map callback) get no key.
    assert!(code.contains(r#"_jsx("li", { children: i })"#), "{code}");
    assert!(code.contains(r#"}, "1")"#) && code.contains(r#"}, "0")"#), "{code}");
}

#[test]
fn plain_component_has_no_runtime_proxy() {
    let code = run(
        "import { Component } from '@stencil/core';\n@Component({ tag: 'cmp-a' })\nexport class CmpA { render() { return 'hello'; } }",
        Jsx::Classic,
    );
    assert!(code.contains(r#"customElements.define(__stencil_transformTag("cmp-a"), CmpA);"#), "{code}");
    assert!(code.contains("this.textContent = this.render();"), "{code}");
    assert!(code.contains(r#"static get is() {"#), "{code}");
    assert!(!code.contains("__registerHost"), "{code}");
}

/// The source text a map sends the first occurrence of `needle` in the output to.
fn mapped_source<'a>(src: &'a str, needle: &str) -> &'a str {
    let opts = TranspileOptions { file: "cmp/cmp-a.tsx".into(), core_import_path: DEFAULT_CORE_IMPORT_PATH.into(), jsx: Jsx::Classic, resolve_imports: false, source_map: true, transform_as_base_class: false };
    let out = transpile(src, &opts);
    assert!(out.diagnostics.is_empty(), "{:?}", out.diagnostics);
    let json = out.map.as_deref().expect("a source map");
    let map = oxc_sourcemap::SourceMap::from_json_string(json).expect("valid map");
    let line = out.code.lines().position(|l| l.trim_start().starts_with(needle)).unwrap_or_else(|| panic!("`{needle}` not in\n{}", out.code));
    let col = out.code.lines().nth(line).unwrap().find(needle).unwrap();
    let token = map.get_tokens().find(|t| t.get_dst_line() as usize == line && t.get_dst_col() as usize == col).expect("a mapping");
    let at = src.lines().take(token.get_src_line() as usize).map(|l| l.len() + 1).sum::<usize>() + token.get_src_col() as usize;
    &src[at..]
}

#[test]
fn source_map_anchors_members_after_their_modifiers() {
    let src = "\
import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-a' })
export class CmpA {
    private foo() {}
    protected static async bar() {}
    public override get baz() { return 1; }
    private readonly qux = 1;
    private handler = () => {};
    render() { return <div />; }
}
";
    for name in ["foo", "static async bar", "get baz", "qux", "handler"] {
        let at = mapped_source(src, name);
        assert!(at.starts_with(name), "`{name}` maps to `{}`", &at[..at.len().min(30)]);
    }
}
