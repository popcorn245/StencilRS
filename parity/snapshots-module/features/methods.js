import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const MethodsCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    async open() { }
    async getValue(id, count) {
        return id.repeat(count);
    }
    helper() { }
    render() {
        return h("div", { key: '0' });
    }
};
__stencil_proxyCustomElement(MethodsCmp, [0, "methods-cmp", {
        "open": [64],
        "getValue": [64]
    }]);
//# sourceMappingURL=methods.js.map