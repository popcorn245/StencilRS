import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class MThree {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.e1 = __stencil_createEvent(this, "e1", 7);
    }
    async c1(y) { }
    async c2(y) { }
    async c3(y, z, w, v) { return null; }
    e1;
    render() { return h("div", { key: '0' }); }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "m-three",
        "$members$": {
            "c1": [64],
            "c2": [64],
            "c3": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=complex-types-method-unions.js.map