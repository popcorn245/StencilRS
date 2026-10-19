import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const InlineStylesCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0', class: "a" }, "styled");
    }
};
InlineStylesCmp.style = `:host { color: red; } .a::after { content: "\`\${x}\\n"; }`;
//# sourceMappingURL=inline-styles.js.map