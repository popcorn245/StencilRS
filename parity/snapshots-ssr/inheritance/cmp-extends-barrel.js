import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { BaseProps } from './bases/barrel';
export class CmpExtendsBarrel extends BaseProps {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "cmp-extends-barrel",
        "$members$": {
            "greeting": [1],
            "size": [513],
            "disabled": [4],
            "clicks": [32],
            "reset": [64]
        },
        "$listeners$": [[0, "click", "onClick"]],
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["size", "size"]]
    }; }
}
//# sourceMappingURL=cmp-extends-barrel.js.map