import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const LifecycleCmp = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    value;
    connectedCallback() { }
    disconnectedCallback() { }
    componentWillLoad() { }
    componentDidLoad() { }
    componentWillRender() { }
    componentDidRender() { }
    componentWillUpdate() { }
    componentDidUpdate() { }
    render() {
        return h("div", { key: '0' }, this.value);
    }
};
__stencil_proxyCustomElement(LifecycleCmp, [512, "lifecycle-cmp", {
        "value": [1]
    }]);
//# sourceMappingURL=lifecycle.js.map