import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import StyleUrlCmpStyle0 from "./features/style-url.scss?tag=style-url-cmp";
export class StyleUrlCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0' }, "styled");
    }
    static get style() { return StyleUrlCmpStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "style-url-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=style-url.js.map