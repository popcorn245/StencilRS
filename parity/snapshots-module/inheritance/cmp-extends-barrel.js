import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { BaseProps } from './bases/barrel';
export const CmpExtendsBarrel = class extends BaseProps {
    constructor(registerHost) {
        super(false);
        if (registerHost !== false) {
            this.__registerHost();
        }
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
__stencil_proxyCustomElement(CmpExtendsBarrel, [512, "cmp-extends-barrel", {
        "greeting": [1],
        "size": [513],
        "disabled": [4],
        "clicks": [32],
        "reset": [64]
    }, [[0, "click", "onClick"]], {
        "greeting": [{
                "greetingChanged": 0
            }]
    }]);
//# sourceMappingURL=cmp-extends-barrel.js.map