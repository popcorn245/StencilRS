import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class ElementCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    get host() { return __stencil_getElement(this); }
    render() {
        return h("div", { key: '0' }, this.host.tagName);
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "element-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=element.js.map