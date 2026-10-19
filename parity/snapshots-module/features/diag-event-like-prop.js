import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const DiagEventLikeProp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    onSelect;
    render() {
        return h("div", { key: '0' });
    }
};
__stencil_proxyCustomElement(DiagEventLikeProp, [512, "diag-event-like-prop", {
        "onSelect": [1, "on-select"]
    }]);
//# sourceMappingURL=diag-event-like-prop.js.map