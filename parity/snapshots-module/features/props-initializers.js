import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const PropsInitializers = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_proxyCustomElement(PropsInitializers, [512, "props-initializers", {
        "str": [1],
        "tpl": [1],
        "num": [2],
        "neg": [2],
        "bool": [4],
        "nul": [16],
        "arr": [16],
        "obj": [16],
        "typedWithDefault": [1, "typed-with-default"]
    }]);
//# sourceMappingURL=props-initializers.js.map