import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const LazyConstructor = class {
    internals;
    changed;
    value = 'a';
    get el() { return __stencil_getElement(this); }
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.changed = __stencil_createEvent(this, "changed", 7);
        if (hostRef.$hostElement$["s-ei"]) {
            this.internals = hostRef.$hostElement$["s-ei"];
        }
        else {
            this.internals = hostRef.$hostElement$.attachInternals();
            hostRef.$hostElement$["s-ei"] = this.internals;
        }
        this.internals.states.add("open");
        console.log('built');
    }
    render() {
        return h("div", { key: '0' }, this.el.tagName);
    }
    static get attachInternalsCustomStates() { return [{
            "name": "open",
            "initialValue": true,
            "docs": ""
        }]; }
    static get formAssociated() { return true; }
};
//# sourceMappingURL=lazy-constructor.js.map