import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class PropsOptions {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    reflected;
    mutated;
    both;
    renamed;
    upper;
    noAttribute;
    firstName;
    value2;
    required;
    optional;
    mode;
    complexReflect;
    render() {
        return h("div", { key: '0' }, this.firstName);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "props-options",
        "$members$": {
            "reflected": [513],
            "mutated": [1026],
            "both": [1540],
            "renamed": [1, "custom-attr"],
            "upper": [1, "upper-attr"],
            "noAttribute": [1, "no-attribute"],
            "firstName": [1, "first-name"],
            "value2": [1, "value-2"],
            "required": [1],
            "optional": [1],
            "mode": [1],
            "complexReflect": [16]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["reflected", "reflected"], ["both", "both"]]
    }; }
}
//# sourceMappingURL=props-options.js.map