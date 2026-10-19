import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const StateCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    open = false;
    count = 0;
    items = [];
    render() {
        return h("div", { key: '0' }, this.count);
    }
};
//# sourceMappingURL=state.js.map