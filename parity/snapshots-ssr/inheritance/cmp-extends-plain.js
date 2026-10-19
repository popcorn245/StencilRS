import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { PlainBase } from './bases/plain-base';
export class CmpExtendsPlain extends PlainBase {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "cmp-extends-plain",
        "$members$": {
            "ticks": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=cmp-extends-plain.js.map