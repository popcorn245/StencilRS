import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import StylesCmpStyle0 from "./features/styles-a.css?tag=styles-cmp&encapsulation=shadow";
import StylesCmpStyle1 from "./features/styles-b.css?tag=styles-cmp&encapsulation=shadow";
export class StylesCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0', class: "a" }, "styled");
    }
    static get style() { return StylesCmpStyle0() + StylesCmpStyle1(); }
    static get cmpMeta() { return {
        "$flags$": 1,
        "$tagName$": "styles-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=styles.js.map