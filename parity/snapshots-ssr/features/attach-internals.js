import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
/** A form-associated input: @AttachInternals with no options. */
export class AttachInternalsCmp {
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
    static get cmpMeta() { return {
        "$flags$": 577,
        "$tagName$": "attach-internals-cmp",
        "$members$": {
            "value": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=attach-internals.js.map