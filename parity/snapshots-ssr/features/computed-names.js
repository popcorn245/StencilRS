import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
const FIRST = 'firstName';
const LABEL = `label`;
const KEYS = { size: 'size' };
const NUM = 7;
const NEG = -2;
const FRACTION = 1.5;
var Names;
(function (Names) {
    Names["Last"] = "lastName";
})(Names || (Names = {}));
var Index;
(function (Index) {
    Index[Index["Zero"] = 0] = "Zero";
    Index[Index["One"] = 1] = "One";
})(Index || (Index = {}));
export class ComputedNames {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    [FIRST];
    [Names.Last] = 'x';
    [KEYS.size];
    ['literal-key'];
    [NUM];
    [Index.One];
    [FRACTION];
    [LABEL] = 'hi';
    [NEG] = 1;
    render() {
        return h("div", { key: '0' }, this[FIRST]);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "computed-names",
        "$members$": {
            "1": [1],
            "7": [1],
            "firstName": [1, "first-name"],
            "lastName": [513, "last-name"],
            "size": [2],
            "literal-key": [1],
            "1.5": [1, "1.-5"],
            "label": [32],
            "-2": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["lastName", "last-name"]]
    }; }
}
//# sourceMappingURL=computed-names.js.map