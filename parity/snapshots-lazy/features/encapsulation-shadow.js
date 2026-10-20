import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const ShadowCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("slot", { key: '0' });
    }
    static get delegatesFocus() { return true; }
};
//# sourceMappingURL=encapsulation-shadow.js.map