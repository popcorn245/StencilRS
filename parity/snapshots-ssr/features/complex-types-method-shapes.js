import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class MTwo {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    async b1(x, y, z = null) { return null; }
    async b2(x, y, z, w, f) { return null; }
    async b3(x, y, z, w, v, u) { }
    async b4(a, b, c, d) { }
    async b5(a) { }
    async b6(a, b, c) { }
    async b7(a, b, c, d) { }
    async b8({ a, b }, [c]) { }
    async b9() { return null; }
    render() { return h("div", { key: '0' }); }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "m-two",
        "$members$": {
            "b1": [64],
            "b2": [64],
            "b3": [64],
            "b4": [64],
            "b5": [64],
            "b6": [64],
            "b7": [64],
            "b8": [64],
            "b9": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=complex-types-method-shapes.js.map