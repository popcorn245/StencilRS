import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { BaseProps } from './bases/base-props';
export class CmpExtendsImport extends BaseProps {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
        this.baseClicked = __stencil_createEvent(this, "baseClicked", 7);
    }
    name = 'World';
    render() {
        return (h("button", { key: '0', disabled: this.disabled },
            this.label(),
            " ",
            this.name));
    }
    static get watchers() { return {
        "greeting": [{
                "greetingChanged": 0
            }]
    }; }
    static get cmpMeta() { return {
        "$flags$": 513,
        "$tagName$": "cmp-extends-import",
        "$members$": {
            "greeting": [1],
            "size": [513],
            "disabled": [4],
            "name": [1],
            "clicks": [32],
            "reset": [64]
        },
        "$listeners$": [[0, "click", "onClick"]],
        "$lazyBundleId$": "-",
        "$attrsToReflect$": [["size", "size"]]
    }; }
}
//# sourceMappingURL=cmp-extends-import.js.map