import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { ChainMiddle } from './bases/chain-middle';
export const CmpExtendsChain = class extends ChainMiddle {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
        this.baseClicked = __stencil_createEvent(this, "baseClicked", 7);
    }
    top = 'top';
    render() {
        return h("div", { key: '0', class: { open: this.open } },
            this.top,
            " ",
            this.middle,
            " ",
            this.greeting);
    }
    static get watchers() { return {
        "greeting": [{
                "greetingChanged": 0
            }]
    }; }
};
//# sourceMappingURL=cmp-extends-chain.js.map