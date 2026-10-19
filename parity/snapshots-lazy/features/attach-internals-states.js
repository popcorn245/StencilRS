import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const AttachInternalsStates = class {
    internals;
    count = 0;
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        this.internals.states.add("open");
        this.internals.states.add("with-dash");
        console.log('constructed');
    }
    toggle() {
        if (this.internals.states.has('open'))
            this.internals.states.delete('open');
        else
            this.internals.states.add('open');
    }
    render() {
        return h("button", { key: '0', onClick: () => this.toggle() }, this.count);
    }
    static get attachInternalsCustomStates() { return [{
            "name": "open",
            "initialValue": true,
            "docs": "Shown open."
        }, {
            "name": "busy",
            "initialValue": false,
            "docs": ""
        }, {
            "name": "with-dash",
            "initialValue": true,
            "docs": ""
        }]; }
    static get formAssociated() { return true; }
};
//# sourceMappingURL=attach-internals-states.js.map