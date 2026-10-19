import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { ChainMiddle } from './bases/chain-middle';
export class CmpExtendsChain extends ChainMiddle {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "cmp-extends-chain",
        "$members$": {
            "greeting": [1],
            "size": [513],
            "disabled": [4],
            "middle": [2],
            "top": [1],
            "clicks": [32],
            "open": [32],
            "reset": [64]
        },
        "$listeners$": [[0, "click", "onClick"]],
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["size", "size"]]
    }; }
}
//# sourceMappingURL=cmp-extends-chain.js.map