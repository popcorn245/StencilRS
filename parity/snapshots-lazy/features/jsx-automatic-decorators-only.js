import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { jsx as _jsx, jsxs as _jsxs } from "@stencil/core/jsx-runtime";
export const JsxDecoratorsOnly = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    name = 'world';
    render() {
        return (_jsxs("p", { children: ["Hello, ", _jsx("strong", { children: this.name }, '1'), "!"] }, '0'));
    }
};
//# sourceMappingURL=jsx-automatic-decorators-only.js.map