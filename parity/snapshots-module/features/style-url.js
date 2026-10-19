import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import StyleUrlCmpStyle0 from "./features/style-url.scss?tag=style-url-cmp";
export const StyleUrlCmp = class extends HTMLElement {
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
__stencil_proxyCustomElement(StyleUrlCmp, [0, "style-url-cmp"]);
//# sourceMappingURL=style-url.js.map