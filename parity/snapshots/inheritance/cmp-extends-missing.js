import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement } from "@stencil/core/runtime/client/standalone";
import { h, Mixin } from "@stencil/core/runtime/client/standalone";
import { NotExported } from './bases/plain-base';
import { byReference } from './bases/factories';
const CmpExtendsMissing = class extends Mixin(NotExported, byReference) {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    render() {
        return h("hr", { key: '0' });
    }
};
__stencil_defineCustomElement(CmpExtendsMissing, [0, "cmp-extends-missing"]);
//# sourceMappingURL=cmp-extends-missing.js.map