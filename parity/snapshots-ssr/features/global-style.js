import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class GlobalStyleCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0' }, "global");
    }
    static get globalStyle() { return "a { color: red }"; }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "global-style-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=global-style.js.map