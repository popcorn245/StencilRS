import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class WatchCmp {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "watch-cmp",
        "$members$": {
            "value": [1],
            "count": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=watch.js.map