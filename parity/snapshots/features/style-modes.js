import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import StyleModesCmpIosStyle0 from "./features/style-modes.ios.css?tag=style-modes-cmp&mode=ios&encapsulation=shadow";
import StyleModesCmpIosStyle1 from "./features/style-modes-extra.ios.css?tag=style-modes-cmp&mode=ios&encapsulation=shadow";
import StyleModesCmpMdStyle0 from "./features/style-modes.md.css?tag=style-modes-cmp&mode=md&encapsulation=shadow";
const StyleModesCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
    }
    render() {
        return h("div", { key: '0' }, "modes");
    }
    static get style() { return {
        ios: StyleModesCmpIosStyle0() + StyleModesCmpIosStyle1(),
        md: StyleModesCmpMdStyle0()
    }; }
};
__stencil_defineCustomElement(StyleModesCmp, [33, "style-modes-cmp"]);
//# sourceMappingURL=style-modes.js.map