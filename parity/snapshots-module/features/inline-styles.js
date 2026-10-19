import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const InlineStylesCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
    }
    render() {
        return h("div", { key: '0', class: "a" }, "styled");
    }
    static get style() { return `:host { color: red; } .a::after { content: "\`\${x}\\n"; }`; }
};
__stencil_proxyCustomElement(InlineStylesCmp, [1, "inline-styles-cmp"]);
//# sourceMappingURL=inline-styles.js.map