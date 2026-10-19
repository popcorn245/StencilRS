import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { PlainBase } from './bases/plain-base';
export const CmpExtendsPlain = class extends PlainBase {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
    }
    ticks = 0;
    render() {
        return h("time", { key: '0' },
            this.elapsed(),
            " ms, ",
            this.ticks);
    }
};
//# sourceMappingURL=cmp-extends-plain.js.map