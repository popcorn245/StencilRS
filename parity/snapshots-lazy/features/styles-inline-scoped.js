import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const InlineScoped = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return (h("div", { key: '0', class: "panel" },
            h("slot", { key: '1' })));
    }
};
InlineScoped.style = `.sc-inline-scoped-h { display: block; }
    .open.sc-inline-scoped-h .panel.sc-inline-scoped, [dir=rtl].sc-inline-scoped-h .panel.sc-inline-scoped, [dir=rtl] .sc-inline-scoped-h .panel.sc-inline-scoped { margin: 0; }
    .sc-inline-scoped-s > span { color: red; }
    .item.sc-inline-scoped > a.sc-inline-scoped:hover, li.sc-inline-scoped:nth-child(2n + 1) { content: "\`"; }
    x.sc-inline-scoped::part(label), x.sc-inline-scoped [part~="label"] { color: blue; }
    @media (min-width: 600px) { .panel.sc-inline-scoped { padding: 1rem; } }`;
//# sourceMappingURL=styles-inline-scoped.js.map