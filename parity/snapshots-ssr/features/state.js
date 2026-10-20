import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class StateCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    open = false;
    count = 0;
    items = [];
    render() {
        return h("div", { key: '0' }, this.count);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "state-cmp",
        "$members$": {
            "open": [32],
            "count": [32],
            "items": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=state.js.map