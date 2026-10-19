import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const AttachInternalsNotForm = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.internals = this.attachInternals();
    }
    internals;
    componentWillLoad() {
        this.internals.role = 'status';
    }
    render() {
        return h("span", { key: '0' }, "ok");
    }
};
__stencil_proxyCustomElement(AttachInternalsNotForm, [2, "attach-internals-not-form"]);
//# sourceMappingURL=attach-internals-not-form.js.map