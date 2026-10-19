import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
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
const ComputedNames = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
__stencil_defineCustomElement(ComputedNames, [512, "computed-names", {
        "1": [1],
        "7": [1],
        "firstName": [1, "first-name"],
        "lastName": [513, "last-name"],
        "size": [2],
        "literal-key": [1],
        "1.5": [1, "1.-5"],
        "label": [32],
        "-2": [32]
    }]);
//# sourceMappingURL=computed-names.js.map