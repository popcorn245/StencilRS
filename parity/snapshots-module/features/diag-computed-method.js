import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const NAME = 'reset';
export const DiagComputedMethod = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    async [NAME]() { }
    render() {
        return h("div", { key: '0' });
    }
};
__stencil_proxyCustomElement(DiagComputedMethod, [0, "diag-computed-method", {
        "[NAME]": [64]
    }]);
//# sourceMappingURL=diag-computed-method.js.map