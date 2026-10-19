import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const GlobalStyleCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    render() {
        return h("div", { key: '0' }, "global");
    }
    static get globalStyle() { return "a { color: red }"; }
};
__stencil_defineCustomElement(GlobalStyleCmp, [0, "global-style-cmp"]);
//# sourceMappingURL=global-style.js.map