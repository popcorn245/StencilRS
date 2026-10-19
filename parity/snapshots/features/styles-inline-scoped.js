import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const InlineScoped = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    render() {
        return (h("div", { key: '0', class: "panel" },
            h("slot", { key: '1' })));
    }
    static get style() { return `.sc-inline-scoped-h { display: block; }
    .open.sc-inline-scoped-h .panel.sc-inline-scoped, [dir=rtl].sc-inline-scoped-h .panel.sc-inline-scoped, [dir=rtl] .sc-inline-scoped-h .panel.sc-inline-scoped { margin: 0; }
    .sc-inline-scoped-s > span { color: red; }
    .item.sc-inline-scoped > a.sc-inline-scoped:hover, li.sc-inline-scoped:nth-child(2n + 1) { content: "\`"; }
    x.sc-inline-scoped::part(label), x.sc-inline-scoped [part~="label"] { color: blue; }
    @media (min-width: 600px) { .panel.sc-inline-scoped { padding: 1rem; } }`; }
};
__stencil_defineCustomElement(InlineScoped, [262, "inline-scoped"]);
//# sourceMappingURL=styles-inline-scoped.js.map