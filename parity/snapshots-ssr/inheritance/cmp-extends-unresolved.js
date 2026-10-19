import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { LibraryBase } from 'some-ui-library';
/** The parent comes from a package: nothing to resolve, so nothing inherited. */
export class CmpExtendsUnresolved extends LibraryBase {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
    }
    value = 0;
    render() {
        return h("output", { key: '0' }, this.value);
    }
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "cmp-extends-unresolved",
        "$members$": {
            "value": [2]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=cmp-extends-unresolved.js.map