import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const LazyConstructor = class extends HTMLElement {
    internals;
    changed;
    value = 'a';
    get el() { return this; }
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.changed = __stencil_createEvent(this, "changed", 7);
        this.internals = this.attachInternals();
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
__stencil_defineCustomElement(LazyConstructor, [576, "lazy-constructor", {
        "value": [1]
    }]);
//# sourceMappingURL=lazy-constructor.js.map