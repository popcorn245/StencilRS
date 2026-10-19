import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const EventsCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
        this.custom = __stencil_createEvent(this, "my-custom-event", 7);
        this.quiet = __stencil_createEvent(this, "quiet", 0);
        this.padded = __stencil_createEvent(this, "padded", 7);
    }
    /** Fired when the value changes. */
    valueChanged;
    custom;
    quiet;
    padded;
    render() {
        return h("button", { key: '0', onClick: () => this.valueChanged.emit('x') }, "go");
    }
};
__stencil_proxyCustomElement(EventsCmp, [0, "events-cmp"]);
//# sourceMappingURL=events.js.map