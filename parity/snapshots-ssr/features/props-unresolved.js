import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class PropsUnresolved {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    external;
    externalEnum;
    date;
    element;
    externalOrString;
    keys;
    query;
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "props-unresolved",
        "$members$": {
            "external": [8],
            "externalEnum": [8, "external-enum"],
            "date": [8],
            "element": [8],
            "externalOrString": [8, "external-or-string"],
            "keys": [1],
            "query": [16]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=props-unresolved.js.map