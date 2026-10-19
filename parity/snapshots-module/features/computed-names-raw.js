import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const EV = 'ping';
let KEY = 'value';
export const ComputedNamesRaw = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    [KEY];
    [EV + 'Changed']() { }
    [EV + 'Click']() { }
    render() {
        return h("div", { key: '0' });
    }
    static get watchers() { return {
        "value": [{
                "[EV + 'Changed']": 0
            }]
    }; }
};
__stencil_proxyCustomElement(ComputedNamesRaw, [512, "computed-names-raw", {
        "[KEY]": [1, "[-k-e-y]"]
    }, [[0, "click", "[EV + 'Click']"]], {
        "value": [{
                "[EV + 'Changed']": 0
            }]
    }]);
//# sourceMappingURL=computed-names-raw.js.map