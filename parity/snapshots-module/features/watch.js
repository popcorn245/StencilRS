import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const WatchCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    value;
    count = 0;
    onValue(next, prev) {
        console.log(next, prev);
    }
    onAny() { }
    render() {
        return h("div", { key: '0' }, this.value);
    }
    static get watchers() { return {
        "value": [{
                "onValue": 0
            }, {
                "onAny": 0
            }],
        "count": [{
                "onAny": 0
            }]
    }; }
};
__stencil_proxyCustomElement(WatchCmp, [512, "watch-cmp", {
        "value": [1],
        "count": [32]
    }, undefined, {
        "value": [{
                "onValue": 0
            }, {
                "onAny": 0
            }],
        "count": [{
                "onAny": 0
            }]
    }]);
//# sourceMappingURL=watch.js.map