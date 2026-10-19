import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { BaseProps } from './bases/base-props';
export const CmpExtendsImport = class extends BaseProps {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
        this.baseClicked = __stencil_createEvent(this, "baseClicked", 7);
    }
    name = 'World';
    render() {
        return (h("button", { key: '0', disabled: this.disabled },
            this.label(),
            " ",
            this.name));
    }
    static get watchers() { return {
        "greeting": [{
                "greetingChanged": 0
            }]
    }; }
};
//# sourceMappingURL=cmp-extends-import.js.map