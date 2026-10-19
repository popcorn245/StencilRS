import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { jsx as _jsx, jsxs as _jsxs } from "@stencil/core/jsx-runtime";
export class JsxDecoratorsOnly {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    name = 'world';
    render() {
        return (_jsxs("p", { children: ["Hello, ", _jsx("strong", { children: this.name }, '1'), "!"] }, '0'));
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "jsx-decorators-only",
        "$members$": {
            "name": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=jsx-automatic-decorators-only.js.map