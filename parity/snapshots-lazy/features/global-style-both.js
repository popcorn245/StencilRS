import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import GlobalStyleBothCmpStyle0 from "./features/global-style-both.css?tag=global-style-both-cmp&encapsulation=shadow";
export const GlobalStyleBothCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
};
GlobalStyleBothCmp.style = GlobalStyleBothCmpStyle0();
//# sourceMappingURL=global-style-both.js.map