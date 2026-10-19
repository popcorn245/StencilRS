import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const MethodsCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=methods.js.map