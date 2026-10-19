import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const PropsInitializers = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    str = 'hello';
    tpl = `hello`;
    num = 3;
    neg = -3;
    bool = true;
    nul = null;
    arr = [];
    obj = {};
    typedWithDefault = 'x';
    render() {
        return h("div", { key: '0' }, this.str);
    }
};
//# sourceMappingURL=props-initializers.js.map