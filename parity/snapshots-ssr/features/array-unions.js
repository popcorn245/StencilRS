import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
var Kind;
(function (Kind) {
    Kind[Kind["One"] = 0] = "One";
    Kind[Kind["Two"] = 1] = "Two";
})(Kind || (Kind = {}));
/**
 * Without the lib every array type is the checker's one empty object type: it prints as `{}`,
 * two of them in a union are one member, and it comes before every type the program makes.
 */
export class ArrayUnions {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "array-unions",
        "$members$": {
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
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=array-unions.js.map