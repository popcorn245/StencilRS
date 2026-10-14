import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { jsx as _jsx } from "@stencil/core/jsx-runtime";
import { Host } from "@stencil/core/runtime/client/standalone";
const JsxAutomatic = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    items = [];
    render() {
        return (_jsx(Host, { children: _jsx("ul", { children: this.items.map((item) => (_jsx("li", { children: item }))) }, '1') }, '0'));
    }
};
__stencil_defineCustomElement(JsxAutomatic, [512, "jsx-automatic", {
        "items": [16]
    }]);
//# sourceMappingURL=jsx-automatic.js.map