import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import GlobalStyleBothCmpStyle0 from "./features/global-style-both.css?tag=global-style-both-cmp&encapsulation=shadow";
export class GlobalStyleBothCmp {
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
    static get style() { return GlobalStyleBothCmpStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 513,
        "$tagName$": "global-style-both-cmp",
        "$members$": {
            "name": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=global-style-both.js.map