import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
const SEVEN = 7;
const HEX = 0x10;
var Index;
(function (Index) {
    Index[Index["Zero"] = 0] = "Zero";
    Index[Index["One"] = 1] = "One";
    Index[Index["Ten"] = 10] = "Ten";
    Index[Index["Eleven"] = 11] = "Eleven";
    Index[Index["Shifted"] = 4] = "Shifted";
})(Index || (Index = {}));
export class WatchConstNumber {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    value;
    onSeven() { }
    onMore() { }
    onShifted() { }
    onValue() { }
    render() {
        return h("div", { key: '0' });
    }
    static get watchers() { return {
        "[object Object]": [{
                "onSeven": 0
            }, {
                "onMore": 0
            }, {
                "onMore": 0
            }, {
                "onShifted": 0
            }],
        "value": [{
                "onValue": 0
            }]
    }; }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "watch-const-number",
        "$members$": {
            "value": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=watch-const-number.js.map