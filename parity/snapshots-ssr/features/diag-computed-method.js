import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
const NAME = 'reset';
export class DiagComputedMethod {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    async [NAME]() { }
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "diag-computed-method",
        "$members$": {
            "[NAME]": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=diag-computed-method.js.map