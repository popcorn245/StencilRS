import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class MethodsCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    async open() { }
    async getValue(id, count) {
        return id.repeat(count);
    }
    helper() { }
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "methods-cmp",
        "$members$": {
            "open": [64],
            "getValue": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=methods.js.map