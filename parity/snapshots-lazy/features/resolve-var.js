import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
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
export const ResolveVar = class {
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
};
//# sourceMappingURL=resolve-var.js.map