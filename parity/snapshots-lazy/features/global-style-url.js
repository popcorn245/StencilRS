import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const GlobalStyleUrlCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    get el() { return __stencil_getElement(this); }
    render() {
        return h("div", { key: '0' }, "global url");
    }
    static get originalGlobalStyleUrl() { return "global-style-url.css"; }
};
//# sourceMappingURL=global-style-url.js.map