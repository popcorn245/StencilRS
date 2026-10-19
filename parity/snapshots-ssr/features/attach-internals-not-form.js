import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
/** Internals for ARIA only: not form-associated. */
export class AttachInternalsNotForm {
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
    static get cmpMeta() { return {
        "$flags$": 2,
        "$tagName$": "attach-internals-not-form",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=attach-internals-not-form.js.map