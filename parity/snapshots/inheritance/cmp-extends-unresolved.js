import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { LibraryBase } from 'some-ui-library';
const CmpExtendsUnresolved = class extends LibraryBase {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    value = 0;
    render() {
        return h("output", { key: '0' }, this.value);
    }
};
__stencil_defineCustomElement(CmpExtendsUnresolved, [512, "cmp-extends-unresolved", {
        "value": [2]
    }]);
//# sourceMappingURL=cmp-extends-unresolved.js.map