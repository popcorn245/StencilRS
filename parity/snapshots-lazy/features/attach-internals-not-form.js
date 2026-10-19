import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const AttachInternalsNotForm = class {
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
    componentWillLoad() {
        this.internals.role = 'status';
    }
    render() {
        return h("span", { key: '0' }, "ok");
    }
};
//# sourceMappingURL=attach-internals-not-form.js.map