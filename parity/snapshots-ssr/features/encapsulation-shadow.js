import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class ShadowCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("slot", { key: '0' });
    }
    static get delegatesFocus() { return true; }
    static get cmpMeta() { return {
        "$flags$": 273,
        "$tagName$": "shadow-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=encapsulation-shadow.js.map