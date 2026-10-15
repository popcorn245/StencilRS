import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { PlainBase } from './bases/plain-base';
const CmpExtendsPlain = class extends PlainBase {
    constructor(registerHost) {
        super(false);
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    ticks = 0;
    render() {
        return h("time", { key: '0' },
            this.elapsed(),
            " ms, ",
            this.ticks);
    }
};
__stencil_defineCustomElement(CmpExtendsPlain, [512, "cmp-extends-plain", {
        "ticks": [32]
    }]);
//# sourceMappingURL=cmp-extends-plain.js.map