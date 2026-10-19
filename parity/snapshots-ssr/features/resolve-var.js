import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
const VALUE = 'value';
let LOOSE = 'loose';
const TEMPLATE = `open`;
const NAMES = { size: 'size' };
class Keys {
    static Label = 'label';
}
var Kinds;
(function (Kinds) {
    Kinds["Kind"] = "kind";
})(Kinds || (Kinds = {}));
export class ResolveVar {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    value;
    loose;
    open;
    size;
    label;
    kind;
    onValue() { }
    onOther() { }
    render() {
        return h("div", { key: '0' });
    }
    static get watchers() { return {
        "value": [{
                "onValue": 0
            }],
        "loose": [{
                "onValue": 0
            }],
        "open": [{
                "onValue": 0
            }],
        "size": [{
                "onOther": 0
            }],
        "label": [{
                "onOther": 0
            }],
        "kind": [{
                "onOther": 0
            }]
    }; }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "resolve-var",
        "$members$": {
            "value": [1],
            "loose": [1],
            "open": [4],
            "size": [2],
            "label": [1],
            "kind": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=resolve-var.js.map