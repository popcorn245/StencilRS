import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class ListenCmp {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    onClick() { }
    onScroll() { }
    onKey() { }
    onTouch() { }
    onResize() { }
    onMany() { }
    render() {
        return h("div", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "listen-cmp",
        "$members$": undefined,
        "$listeners$": [[0, "click", "onClick"], [9, "scroll", "onScroll"], [6, "keydown", "onKey"], [0, "touchstart", "onTouch"], [17, "resize", "onResize"], [0, "valueChanged", "onMany"], [1, "Wheel", "onMany"]],
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=listen.js.map