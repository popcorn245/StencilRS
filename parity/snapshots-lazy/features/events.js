import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const EventsCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=events.js.map