import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
var Kind;
(function (Kind) {
    Kind[Kind["One"] = 0] = "One";
    Kind[Kind["Two"] = 1] = "Two";
})(Kind || (Kind = {}));
export const ArrayUnions = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=array-unions.js.map