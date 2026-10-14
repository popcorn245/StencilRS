import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import StyleUrlCmpStyle0 from "./features/style-url.scss?tag=style-url-cmp";
const StyleUrlCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    render() {
        return h("div", { key: '0' }, "styled");
    }
    static get style() { return StyleUrlCmpStyle0(); }
};
__stencil_defineCustomElement(StyleUrlCmp, [0, "style-url-cmp"]);
//# sourceMappingURL=style-url.js.map