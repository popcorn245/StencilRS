import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const AttachInternalsCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
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
//# sourceMappingURL=attach-internals.js.map