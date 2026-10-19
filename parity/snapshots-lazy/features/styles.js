import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import StylesCmpStyle0 from "./features/styles-a.css?tag=styles-cmp&encapsulation=shadow";
import StylesCmpStyle1 from "./features/styles-b.css?tag=styles-cmp&encapsulation=shadow";
export const StylesCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0', class: "a" }, "styled");
    }
};
StylesCmp.style = StylesCmpStyle0() + StylesCmpStyle1();
//# sourceMappingURL=styles.js.map