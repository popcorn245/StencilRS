import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { ChainMiddle } from './bases/chain-middle';
export const CmpExtendsChain = class extends ChainMiddle {
    constructor(registerHost) {
        super(false);
        if (registerHost !== false) {
            this.__registerHost();
        }
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
__stencil_proxyCustomElement(CmpExtendsChain, [512, "cmp-extends-chain", {
        "greeting": [1],
        "size": [513],
        "disabled": [4],
        "middle": [2],
        "top": [1],
        "clicks": [32],
        "open": [32],
        "reset": [64]
    }, [[0, "click", "onClick"]], {
        "greeting": [{
                "greetingChanged": 0
            }]
    }]);
//# sourceMappingURL=cmp-extends-chain.js.map