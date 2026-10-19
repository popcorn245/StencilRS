import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const VALUE = 'value';
const COUNT = `count`;
const ALIAS = VALUE;
const NAMED = 'named';
const CHECKED = 'checked';
const PREFIX = 'sta';
const TEMPLATE = `${PREFIX}tus`;
const CLICK = 'click';
const KEYS = { open: 'open', nested: { size: 'size' } };
const LOOSE = { label: 'label' };
var Events;
(function (Events) {
    Events["Focus"] = "focusin";
    Events["Blur"] = "focusout";
    Events["Out"] = "focusout";
})(Events || (Events = {}));
const ConstArgs = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.changed = __stencil_createEvent(this, "changed", 7);
    }
    value;
    open;
    size;
    named;
    checked;
    status;
    label;
    count = 0;
    changed;
    onValue() { }
    onAny() { }
    onOpen() { }
    onMore() { }
    onClick() { }
    onFocus() { }
    onBlur() { }
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
            }],
        "open": [{
                "onOpen": 0
            }],
        "size": [{
                "onOpen": 0
            }],
        "named": [{
                "onMore": 0
            }],
        "checked": [{
                "onMore": 0
            }],
        "status": [{
                "onMore": 0
            }],
        "label": [{
                "onMore": 0
            }]
    }; }
};
__stencil_defineCustomElement(ConstArgs, [512, "const-args", {
        "value": [1],
        "open": [4],
        "size": [2],
        "named": [1],
        "checked": [4],
        "status": [1],
        "label": [1],
        "count": [32]
    }, [[0, "click", "onClick"], [4, "focusin", "onFocus"], [0, "focusout", "onBlur"]], {
        "value": [{
                "onValue": 0
            }, {
                "onAny": 0
            }],
        "count": [{
                "onAny": 0
            }],
        "open": [{
                "onOpen": 0
            }],
        "size": [{
                "onOpen": 0
            }],
        "named": [{
                "onMore": 0
            }],
        "checked": [{
                "onMore": 0
            }],
        "status": [{
                "onMore": 0
            }],
        "label": [{
                "onMore": 0
            }]
    }]);
//# sourceMappingURL=const-args.js.map