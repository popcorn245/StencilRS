import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class GlobalStyleUrlCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    get el() { return __stencil_getElement(this); }
    render() {
        return h("div", { key: '0' }, "global url");
    }
    static get originalGlobalStyleUrl() { return "global-style-url.css"; }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "global-style-url-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=global-style-url.js.map