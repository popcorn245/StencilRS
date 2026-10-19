import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class InlineStylesCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0', class: "a" }, "styled");
    }
    static get style() { return `:host { color: red; } .a::after { content: "\`\${x}\\n"; }`; }
    static get cmpMeta() { return {
        "$flags$": 1,
        "$tagName$": "inline-styles-cmp",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=inline-styles.js.map