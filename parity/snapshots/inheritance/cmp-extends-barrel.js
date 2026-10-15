import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { BaseProps } from './bases/barrel';
const CmpExtendsBarrel = class extends BaseProps {
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
__stencil_defineCustomElement(CmpExtendsBarrel, [512, "cmp-extends-barrel", {
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