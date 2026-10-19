import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { LibraryBase } from 'some-ui-library';
export const CmpExtendsUnresolved = class extends LibraryBase {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
    }
    value = 0;
    render() {
        return h("output", { key: '0' }, this.value);
    }
};
//# sourceMappingURL=cmp-extends-unresolved.js.map