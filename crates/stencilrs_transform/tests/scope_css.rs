//! Expectations from Stencil v5's own `scopeCss`. `parity/scope-css.mjs` checks the port
//! against it on thousands more inputs.

use stencilrs_transform::scope_css::{scope_css, scope_id};

fn scope(css: &str, id: &str) -> String {
    scope_css(css, id, false).unwrap()
}

#[test]
fn scopes_every_rule() {
    assert_eq!(scope("one {color: red;}two {color: red;}", "a"), "one.a {color: red;}two.a {color: red;}");
}

#[test]
fn comments_the_original_selector_for_the_runtime() {
    assert_eq!(scope_css("div {}", "sc-ion-tag", true).unwrap(), "/*!@div*/div.sc-ion-tag {}");
}

#[test]
fn host_and_slotted() {
    assert_eq!(
        scope(":host { display: block; } :host(.on) ::slotted(span) {}", "sc-cmp"),
        ".sc-cmp-h { display: block; } .sc-cmp-h.on.sc-cmp-s > span, .sc-cmp-h.on .sc-cmp-s > span {}"
    );
}

#[test]
fn host_context_and_part() {
    assert_eq!(
        scope(":host-context(.dark) a, x::part(label) {}", "sc-cmp"),
        r#".dark.sc-cmp-h a.sc-cmp, .dark .sc-cmp-h a.sc-cmp, x.sc-cmp::part(label), x.sc-cmp [part~="label"] {}"#
    );
}

#[test]
fn at_rules() {
    assert_eq!(
        scope("@media (min-width: 1px) { .a > b {} } @keyframes k { from {} }", "sc-cmp"),
        "@media (min-width: 1px) { .a.sc-cmp > b.sc-cmp {} } @keyframes k { from {} }"
    );
    assert_eq!(
        scope("@supports selector(:host) { :host { a: b } }", "sc-cmp"),
        "@supports selector(:host) { .sc-cmp-h { a: b } }"
    );
}

#[test]
fn scope_ids() {
    assert_eq!(scope_id("my-cmp", None), "sc-my-cmp");
    assert_eq!(scope_id("my-cmp", Some("$")), "sc-my-cmp");
    assert_eq!(scope_id("my-cmp", Some("ios")), "sc-my-cmp-ios");
}
