import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const AttachInternalsCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
        this.internals = this.attachInternals();
    }
    internals;
    value = '';
    onInput = (e) => {
        this.internals.setFormValue(e.target.value);
    };
    render() {
        return h("input", { key: '0', value: this.value, onInput: this.onInput });
    }
    static get formAssociated() { return true; }
};
__stencil_defineCustomElement(AttachInternalsCmp, [577, "attach-internals-cmp", {
        "value": [1]
    }]);
//# sourceMappingURL=attach-internals.js.map