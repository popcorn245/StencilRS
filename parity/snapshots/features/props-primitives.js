import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const PropsPrimitives = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_defineCustomElement(PropsPrimitives, [512, "props-primitives", {
        "str": [1],
        "num": [2],
        "bool": [4],
        "anything": [8],
        "mystery": [16],
        "list": [16],
        "obj": [16],
        "fn": [16],
        "nothing": [8]
    }]);
//# sourceMappingURL=props-primitives.js.map