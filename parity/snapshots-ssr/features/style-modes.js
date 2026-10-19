import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import StyleModesCmpIosStyle0 from "./features/style-modes.ios.css?tag=style-modes-cmp&mode=ios&encapsulation=shadow";
import StyleModesCmpIosStyle1 from "./features/style-modes-extra.ios.css?tag=style-modes-cmp&mode=ios&encapsulation=shadow";
import StyleModesCmpMdStyle0 from "./features/style-modes.md.css?tag=style-modes-cmp&mode=md&encapsulation=shadow";
export class StyleModesCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0' }, "modes");
    }
    static get style() { return {
        ios: StyleModesCmpIosStyle0() + StyleModesCmpIosStyle1(),
        md: StyleModesCmpMdStyle0()
    }; }
    static get cmpMeta() { return {
        "$flags$": 33,
        "$tagName$": "style-modes-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=style-modes.js.map