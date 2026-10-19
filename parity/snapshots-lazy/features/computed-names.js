import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
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
export const ComputedNames = class {
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
};
//# sourceMappingURL=computed-names.js.map