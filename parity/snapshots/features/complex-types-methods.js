import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export var Color;
(function (Color) {
    Color[Color["Red"] = 0] = "Red";
    Color[Color["Green"] = 1] = "Green";
})(Color || (Color = {}));
const MOne = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    async a1(x, y, ...rest) { }
    async a2(opts, cb) { return null; }
    async a3(m, c, p, arr, ro) { return null; }
    async a4(x = 5, y = 'a', z = 'x') { return []; }
    async a5() { return null; }
    async a6(t, u, v) { return null; }
    async a7(f, g) { return null; }
    a8() { return null; }
    async a9() { }
    async a10() { return 1; }
    a11() { }
    async a12(x, y, z, w) { }
    async a13(x, y, z) { }
    async a14(x, y) { }
    render() { return h("div", { key: '0' }); }
};
__stencil_defineCustomElement(MOne, [0, "m-one", {
        "a1": [64],
        "a2": [64],
        "a3": [64],
        "a4": [64],
        "a5": [64],
        "a6": [64],
        "a7": [64],
        "a8": [64],
        "a9": [64],
        "a10": [64],
        "a11": [64],
        "a12": [64],
        "a13": [64],
        "a14": [64]
    }]);
//# sourceMappingURL=complex-types-methods.js.map