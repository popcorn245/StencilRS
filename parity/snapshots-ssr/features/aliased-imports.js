import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class AliasedCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    label;
    on = false;
    render() {
        return h("div", { key: '0' }, this.label);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "aliased-cmp",
        "$members$": {
            "label": [1],
            "on": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=aliased-imports.js.map