import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const DiagAttachInternalsTwice = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    first;
    second;
    render() {
        return h("p", { key: '0' });
    }
};
__stencil_defineCustomElement(DiagAttachInternalsTwice, [0, "diag-attach-internals-twice"]);
//# sourceMappingURL=diag-attach-internals-twice.js.map