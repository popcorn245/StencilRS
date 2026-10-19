import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class PropsInitializers {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    str = 'hello';
    tpl = `hello`;
    num = 3;
    neg = -3;
    bool = true;
    nul = null;
    arr = [];
    obj = {};
    typedWithDefault = 'x';
    render() {
        return h("div", { key: '0' }, this.str);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "props-initializers",
        "$members$": {
            "str": [1],
            "tpl": [1],
            "num": [2],
            "neg": [2],
            "bool": [4],
            "nul": [16],
            "arr": [16],
            "obj": [16],
            "typedWithDefault": [1, "typed-with-default"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=props-initializers.js.map