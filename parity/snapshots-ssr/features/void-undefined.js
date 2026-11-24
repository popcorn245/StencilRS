import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
/** `void` next to `undefined`: a written union keeps both, only an inferred return union drops `undefined`. */
export class VoidUndefined {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.ev1 = __stencil_createEvent(this, "ev1", 7);
        this.ev2 = __stencil_createEvent(this, "ev2", 7);
        this.ev3 = __stencil_createEvent(this, "ev3", 7);
        this.ev4 = __stencil_createEvent(this, "ev4", 7);
        this.ev5 = __stencil_createEvent(this, "ev5", 7);
    }
    a;
    b;
    c;
    d;
    e;
    f;
    g;
    ev1;
    ev2;
    ev3;
    ev4;
    ev5;
    async m1(x, y) {
        return;
    }
    async m2(x) {
        return;
    }
    async m3(x, y) {
        return;
    }
    async m4(x) {
        return;
    }
    async m5(y, z) {
        return null;
    }
    async m6(y, z) {
        return;
    }
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "void-undefined",
        "$members$": {
            "a": [1],
            "b": [16],
            "c": [16],
            "d": [16],
            "e": [1],
            "f": [2],
            "g": [1],
            "m1": [64],
            "m2": [64],
            "m3": [64],
            "m4": [64],
            "m5": [64],
            "m6": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=void-undefined.js.map