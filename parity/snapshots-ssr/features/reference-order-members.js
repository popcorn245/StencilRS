import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
/**
 * The `references` of a prop or an event come from the written type: each type argument that is a
 * plain reference is added right after its parent, before the arguments' own arguments.
 */
export class ReferenceOrderMembers {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.e0 = __stencil_createEvent(this, "e0", 7);
        this.e1 = __stencil_createEvent(this, "e1", 7);
        this.e2 = __stencil_createEvent(this, "e2", 7);
        this.e3 = __stencil_createEvent(this, "e3", 7);
        this.e4 = __stencil_createEvent(this, "e4", 7);
        this.e5 = __stencil_createEvent(this, "e5", 7);
        this.e6 = __stencil_createEvent(this, "e6", 7);
        this.e7 = __stencil_createEvent(this, "e7", 7);
        this.e8 = __stencil_createEvent(this, "e8", 7);
        this.e9 = __stencil_createEvent(this, "e9", 7);
        this.e10 = __stencil_createEvent(this, "e10", 7);
        this.e11 = __stencil_createEvent(this, "e11", 7);
        this.e12 = __stencil_createEvent(this, "e12", 7);
    }
    p0;
    p1;
    p2;
    p3;
    p4;
    p5;
    p6;
    p7;
    p8;
    p9;
    p10;
    p11;
    p12;
    e0;
    e1;
    e2;
    e3;
    e4;
    e5;
    e6;
    e7;
    e8;
    e9;
    e10;
    e11;
    e12;
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "reference-order-members",
        "$members$": {
            "p0": [8, "p-0"],
            "p1": [8, "p-1"],
            "p2": [8, "p-2"],
            "p3": [8, "p-3"],
            "p4": [16],
            "p5": [8, "p-5"],
            "p6": [8, "p-6"],
            "p7": [8, "p-7"],
            "p8": [8, "p-8"],
            "p9": [16],
            "p10": [8, "p-1-0"],
            "p11": [8, "p-1-1"],
            "p12": [8, "p-1-2"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=reference-order-members.js.map