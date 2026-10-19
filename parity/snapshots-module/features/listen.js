import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const ListenCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_proxyCustomElement(ListenCmp, [0, "listen-cmp", undefined, [[0, "click", "onClick"], [9, "scroll", "onScroll"], [6, "keydown", "onKey"], [0, "touchstart", "onTouch"], [17, "resize", "onResize"], [0, "valueChanged", "onMany"], [1, "Wheel", "onMany"]]]);
//# sourceMappingURL=listen.js.map