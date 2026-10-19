import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const LifecycleCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=lifecycle.js.map