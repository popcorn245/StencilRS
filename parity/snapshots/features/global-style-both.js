import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import GlobalStyleBothCmpStyle0 from "./features/global-style-both.css?tag=global-style-both-cmp&encapsulation=shadow";
const GlobalStyleBothCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.__attachShadow();
    }
    name;
    onName() { }
    render() {
        return h("div", { key: '0' }, "both");
    }
    static get originalGlobalStyleUrl() { return "global-style-both-global.css"; }
    static get globalStyle() { return "b { color: blue }"; }
    static get watchers() { return {
        "name": [{
                "onName": 0
            }]
    }; }
    static get style() { return GlobalStyleBothCmpStyle0(); }
};
__stencil_defineCustomElement(GlobalStyleBothCmp, [513, "global-style-both-cmp", {
        "name": [1]
    }, undefined, {
        "name": [{
                "onName": 0
            }]
    }]);
//# sourceMappingURL=global-style-both.js.map