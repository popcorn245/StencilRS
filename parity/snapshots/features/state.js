import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const StateCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    open = false;
    count = 0;
    items = [];
    render() {
        return h("div", { key: '0' }, this.count);
    }
};
__stencil_defineCustomElement(StateCmp, [512, "state-cmp", {
        "open": [32],
        "count": [32],
        "items": [32]
    }]);
//# sourceMappingURL=state.js.map