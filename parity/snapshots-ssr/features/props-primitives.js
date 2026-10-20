import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class PropsPrimitives {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    str;
    num;
    bool;
    anything;
    mystery;
    list;
    obj;
    fn;
    nothing;
    render() {
        return h("div", { key: '0' }, this.str);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "props-primitives",
        "$members$": {
            "str": [1],
            "num": [2],
            "bool": [4],
            "anything": [8],
            "mystery": [16],
            "list": [16],
            "obj": [16],
            "fn": [16],
            "nothing": [8]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=props-primitives.js.map