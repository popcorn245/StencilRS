import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const EV = 'ping';
let KEY = 'value';
export const ComputedNamesRaw = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=computed-names-raw.js.map