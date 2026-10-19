import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
const EV = 'ping';
let KEY = 'value';
export class ComputedNamesRaw {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "computed-names-raw",
        "$members$": {
            "[KEY]": [1, "[-k-e-y]"]
        },
        "$listeners$": [[0, "click", "[EV + 'Click']"]],
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=computed-names-raw.js.map