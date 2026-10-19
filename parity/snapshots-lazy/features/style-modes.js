import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import StyleModesCmpIosStyle0 from "./features/style-modes.ios.css?tag=style-modes-cmp&mode=ios&encapsulation=shadow";
import StyleModesCmpIosStyle1 from "./features/style-modes-extra.ios.css?tag=style-modes-cmp&mode=ios&encapsulation=shadow";
import StyleModesCmpMdStyle0 from "./features/style-modes.md.css?tag=style-modes-cmp&mode=md&encapsulation=shadow";
export const StyleModesCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0' }, "modes");
    }
};
StyleModesCmp.style = {
    ios: StyleModesCmpIosStyle0() + StyleModesCmpIosStyle1(),
    md: StyleModesCmpMdStyle0()
};
//# sourceMappingURL=style-modes.js.map