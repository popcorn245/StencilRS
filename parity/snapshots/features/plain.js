import { HTMLElement } from "@stencil/core/runtime/client/standalone";
const PlainCmp = class extends HTMLElement {
    greeting = 'hello';
    render() {
        return this.greeting;
    }
    connectedCallback() {
        this.textContent = this.render();
    }
    static get is() { return "plain-cmp"; }
};
customElements.define(__stencil_transformTag("plain-cmp"), PlainCmp);
//# sourceMappingURL=plain.js.map