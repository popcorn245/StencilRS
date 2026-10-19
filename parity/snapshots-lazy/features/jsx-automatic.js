import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { jsx as _jsx } from "@stencil/core/jsx-runtime";
import { Host } from "@stencil/core/runtime/client/standalone";
export const JsxAutomatic = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    items = [];
    render() {
        return (_jsx(Host, { children: _jsx("ul", { children: this.items.map((item) => (_jsx("li", { children: item }))) }, '1') }, '0'));
    }
};
//# sourceMappingURL=jsx-automatic.js.map