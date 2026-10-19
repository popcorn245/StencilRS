import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const GlobalStyleUrlCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    get el() { return this; }
    render() {
        return h("div", { key: '0' }, "global url");
    }
    static get originalGlobalStyleUrl() { return "global-style-url.css"; }
};
__stencil_defineCustomElement(GlobalStyleUrlCmp, [0, "global-style-url-cmp"]);
//# sourceMappingURL=global-style-url.js.map