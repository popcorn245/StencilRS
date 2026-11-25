import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
var Kind;
(function (Kind) {
    Kind[Kind["One"] = 0] = "One";
    Kind[Kind["Two"] = 1] = "Two";
})(Kind || (Kind = {}));
export const ArrayUnions = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.objectsChange = __stencil_createEvent(this, "objectsChange", 7);
        this.tupleChange = __stencil_createEvent(this, "tupleChange", 7);
    }
    objects;
    primitives;
    withTuple;
    withLiteral;
    objectsChange;
    tupleChange;
    async objectArrays(x) {
        return [];
    }
    async primitiveArrays(x) {
        return [];
    }
    async nullable(x) {
        return null;
    }
    async tuple(x) {
        return [];
    }
    async withObject(x) {
        return [];
    }
    async withLiterals(x, y, z) {
        return [];
    }
    async withString(x) {
        return [];
    }
    async withEmpty(x, y) {
        return [];
    }
    async withFunction(x, y) {
        return [];
    }
    async withObjects(x, y) { }
    async nested(x, y, z) { }
    async withLocals(x, y, z, w) { }
    async withEnum(x, y) { }
    async tuples(x, y) {
        return [];
    }
    render() {
        return h("div", { key: '0' });
    }
};
__stencil_proxyCustomElement(ArrayUnions, [512, "array-unions", {
        "objects": [16],
        "primitives": [16],
        "withTuple": [16],
        "withLiteral": [1, "with-literal"],
        "objectArrays": [64],
        "primitiveArrays": [64],
        "nullable": [64],
        "tuple": [64],
        "withObject": [64],
        "withLiterals": [64],
        "withString": [64],
        "withEmpty": [64],
        "withFunction": [64],
        "withObjects": [64],
        "nested": [64],
        "withLocals": [64],
        "withEnum": [64],
        "tuples": [64]
    }]);
//# sourceMappingURL=array-unions.js.map