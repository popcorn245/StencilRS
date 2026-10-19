import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
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
const WatchConstNumber = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_defineCustomElement(WatchConstNumber, [512, "watch-const-number", {
        "value": [1]
    }, undefined, {
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
    }]);
//# sourceMappingURL=watch-const-number.js.map