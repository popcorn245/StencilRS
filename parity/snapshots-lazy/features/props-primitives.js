import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const PropsPrimitives = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    str;
    num;
    bool;
    anything;
    mystery;
    list;
    obj;
    fn;
    nothing;
    render() {
        return h("div", { key: '0' }, this.str);
    }
};
//# sourceMappingURL=props-primitives.js.map