import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { BaseProps } from './bases/barrel';
export const CmpExtendsBarrel = class extends BaseProps {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
        this.baseClicked = __stencil_createEvent(this, "baseClicked", 7);
    }
    render() {
        return h("b", { key: '0' }, this.greeting);
    }
    static get watchers() { return {
        "greeting": [{
                "greetingChanged": 0
            }]
    }; }
};
//# sourceMappingURL=cmp-extends-barrel.js.map