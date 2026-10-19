import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class DiagEventLikeProp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    onSelect;
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "diag-event-like-prop",
        "$members$": {
            "onSelect": [1, "on-select"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=diag-event-like-prop.js.map