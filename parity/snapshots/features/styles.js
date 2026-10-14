import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import StylesCmpStyle0 from "./features/styles-a.css?tag=styles-cmp&encapsulation=shadow";
import StylesCmpStyle1 from "./features/styles-b.css?tag=styles-cmp&encapsulation=shadow";
const StylesCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
    }
    render() {
        return h("div", { key: '0', class: "a" }, "styled");
    }
    static get style() { return StylesCmpStyle0() + StylesCmpStyle1(); }
};
__stencil_defineCustomElement(StylesCmp, [1, "styles-cmp"]);
//# sourceMappingURL=styles.js.map