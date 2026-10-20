import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
export const PlainCmp = class extends HTMLElement {
    greeting = 'hello';
    render() {
        return this.greeting;
    }
    connectedCallback() {
        this.textContent = this.render();
    }
    static get is() { return "plain-cmp"; }
};
__stencil_proxyCustomElement(PlainCmp, [0, "plain-cmp"]);
//# sourceMappingURL=plain.js.map