import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { BaseProps } from './bases/base-props';
export const CmpExtendsImport = class extends BaseProps {
    constructor(registerHost) {
        super(false);
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
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
__stencil_proxyCustomElement(CmpExtendsImport, [513, "cmp-extends-import", {
        "greeting": [1],
        "size": [513],
        "disabled": [4],
        "name": [1],
        "clicks": [32],
        "reset": [64]
    }, [[0, "click", "onClick"]], {
        "greeting": [{
                "greetingChanged": 0
            }]
    }]);
//# sourceMappingURL=cmp-extends-import.js.map