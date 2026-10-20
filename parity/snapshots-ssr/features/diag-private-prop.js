import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class DiagPrivateProp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    secret;
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "diag-private-prop",
        "$members$": {
            "secret": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=diag-private-prop.js.map