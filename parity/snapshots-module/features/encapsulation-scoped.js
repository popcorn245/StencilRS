import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const ScopedCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    render() {
        return h("slot", { key: '0' });
    }
};
__stencil_proxyCustomElement(ScopedCmp, [262, "scoped-cmp"]);
//# sourceMappingURL=encapsulation-scoped.js.map