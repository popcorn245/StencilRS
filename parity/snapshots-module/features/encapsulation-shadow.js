import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const ShadowCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
    }
    render() {
        return h("slot", { key: '0' });
    }
    static get delegatesFocus() { return true; }
};
__stencil_proxyCustomElement(ShadowCmp, [273, "shadow-cmp"]);
//# sourceMappingURL=encapsulation-shadow.js.map