import { HTMLElement } from "@stencil/core/runtime/client/standalone";
const GlobalStylePlainCmp = class extends HTMLElement {
    static get originalGlobalStyleUrl() { return "./global-style-plain.scss"; }
    static get globalStyle() { return "c { color: green }"; }
    static get is() { return "global-style-plain-cmp"; }
};
customElements.define(__stencil_transformTag("global-style-plain-cmp"), GlobalStylePlainCmp);
//# sourceMappingURL=global-style-plain.js.map