import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const AliasedCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    label;
    on = false;
    render() {
        return h("div", { key: '0' }, this.label);
    }
};
__stencil_proxyCustomElement(AliasedCmp, [512, "aliased-cmp", {
        "label": [1],
        "on": [32]
    }]);
//# sourceMappingURL=aliased-imports.js.map