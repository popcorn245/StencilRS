import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h, Mixin } from "@stencil/core/runtime/client/standalone";
import { NotExported } from './bases/plain-base';
import { byReference } from './bases/factories';
export const CmpExtendsMissing = class extends Mixin(NotExported, byReference) {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("hr", { key: '0' });
    }
};
//# sourceMappingURL=cmp-extends-missing.js.map