import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class DiagAttachInternalsTwice {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    first;
    second;
    render() {
        return h("p", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "diag-attach-internals-twice",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=diag-attach-internals-twice.js.map