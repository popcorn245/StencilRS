import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const ScopedCmp = class extends HTMLElement {
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
__stencil_defineCustomElement(ScopedCmp, [262, "scoped-cmp"]);
//# sourceMappingURL=encapsulation-scoped.js.map