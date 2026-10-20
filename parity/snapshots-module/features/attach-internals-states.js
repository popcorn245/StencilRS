import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const AttachInternalsStates = class extends HTMLElement {
    internals;
    count = 0;
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.internals = this.attachInternals();
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
__stencil_proxyCustomElement(AttachInternalsStates, [576, "attach-internals-states", {
        "count": [32]
    }]);
//# sourceMappingURL=attach-internals-states.js.map