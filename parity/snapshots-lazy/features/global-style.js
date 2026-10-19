import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const GlobalStyleCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0' }, "global");
    }
    static get globalStyle() { return "a { color: red }"; }
};
//# sourceMappingURL=global-style.js.map