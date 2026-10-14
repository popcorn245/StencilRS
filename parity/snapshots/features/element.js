import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const ElementCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    get host() { return this; }
    render() {
        return h("div", { key: '0' }, this.host.tagName);
    }
};
__stencil_defineCustomElement(ElementCmp, [0, "element-cmp"]);
//# sourceMappingURL=element.js.map