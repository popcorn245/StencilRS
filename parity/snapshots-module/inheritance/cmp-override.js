import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { BaseProps } from './bases/base-props';
export const CmpOverride = class extends BaseProps {
    greeting = 'Hi';
    disabled = true;
    constructor(registerHost) {
        super(false);
        if (registerHost !== false) {
            this.__registerHost();
        }
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
__stencil_proxyCustomElement(CmpOverride, [512, "cmp-override", {
        "size": [513],
        "greeting": [1],
        "clicks": [32],
        "disabled": [32],
        "reset": [64]
    }, [[0, "click", "onClick"]], {
        "greeting": [{
                "greetingChanged": 0
            }]
    }]);
//# sourceMappingURL=cmp-override.js.map