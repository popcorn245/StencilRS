import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { jsx as _jsx, jsxs as _jsxs } from "@stencil/core/jsx-runtime";
export const JsxDecoratorsOnly = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    name = 'world';
    render() {
        return (_jsxs("p", { children: ["Hello, ", _jsx("strong", { children: this.name }, '1'), "!"] }, '0'));
    }
};
__stencil_proxyCustomElement(JsxDecoratorsOnly, [512, "jsx-decorators-only", {
        "name": [1]
    }]);
//# sourceMappingURL=jsx-automatic-decorators-only.js.map