import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const MThree = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.e1 = __stencil_createEvent(this, "e1", 7);
    }
    async c1(y) { }
    async c2(y) { }
    async c3(y, z, w, v) { return null; }
    e1;
    render() { return h("div", { key: '0' }); }
};
__stencil_proxyCustomElement(MThree, [0, "m-three", {
        "c1": [64],
        "c2": [64],
        "c3": [64]
    }]);
//# sourceMappingURL=complex-types-method-unions.js.map