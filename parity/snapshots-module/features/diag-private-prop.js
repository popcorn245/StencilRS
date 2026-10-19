import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const DiagPrivateProp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    secret;
    render() {
        return h("div", { key: '0' });
    }
};
__stencil_proxyCustomElement(DiagPrivateProp, [512, "diag-private-prop", {
        "secret": [1]
    }]);
//# sourceMappingURL=diag-private-prop.js.map