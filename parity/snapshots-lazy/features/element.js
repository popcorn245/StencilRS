import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const ElementCmp = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    get host() { return __stencil_getElement(this); }
    render() {
        return h("div", { key: '0' }, this.host.tagName);
    }
};
//# sourceMappingURL=element.js.map