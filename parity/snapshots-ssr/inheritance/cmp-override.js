import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { BaseProps } from './bases/base-props';
/** Redeclares inherited members: a prop, a prop as state, a watcher, and its own constructor. */
export class CmpOverride extends BaseProps {
    greeting = 'Hi';
    disabled = true;
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
        this.baseClicked = __stencil_createEvent(this, "baseClicked", 7);
        console.log('constructed');
    }
    greetingChanged(next) {
        console.log('override', next);
    }
    render() {
        return h("i", { key: '0' }, this.greeting);
    }
    static get watchers() { return {
        "greeting": [{
                "greetingChanged": 0
            }]
    }; }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "cmp-override",
        "$members$": {
            "size": [513],
            "greeting": [1],
            "clicks": [32],
            "disabled": [32],
            "reset": [64]
        },
        "$listeners$": [[0, "click", "onClick"]],
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["size", "size"]]
    }; }
}
//# sourceMappingURL=cmp-override.js.map