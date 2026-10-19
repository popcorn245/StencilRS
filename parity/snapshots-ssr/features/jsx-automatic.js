import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { jsx as _jsx } from "@stencil/core/jsx-runtime";
import { Host } from "@stencil/core/runtime/server";
export class JsxAutomatic {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    items = [];
    render() {
        return (_jsx(Host, { children: _jsx("ul", { children: this.items.map((item) => (_jsx("li", { children: item }))) }, '1') }, '0'));
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "jsx-automatic",
        "$members$": {
            "items": [16]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=jsx-automatic.js.map