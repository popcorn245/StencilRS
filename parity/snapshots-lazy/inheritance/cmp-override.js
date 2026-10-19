import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { BaseProps } from './bases/base-props';
export const CmpOverride = class extends BaseProps {
    greeting = 'Hi';
    disabled = true;
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
        this.baseClicked = __stencil_createEvent(this, "baseClicked", 7);
        console.log('constructed');
    }
    greetingChanged(next) {
        console.log('override', next);
    }
    render() {
        return h("i", { key: '0' }, this.greeting);
    }
    static get watchers() { return {
        "greeting": [{
                "greetingChanged": 0
            }]
    }; }
};
//# sourceMappingURL=cmp-override.js.map