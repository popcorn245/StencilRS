import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const WatchCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=watch.js.map