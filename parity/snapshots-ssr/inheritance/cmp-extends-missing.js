import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h, Mixin } from "@stencil/core/runtime/server";
import { NotExported } from './bases/plain-base';
import { byReference } from './bases/factories';
/** Two parents Stencil can't read: a name the module doesn't declare, and a factory returning a class by reference. */
export class CmpExtendsMissing extends Mixin(NotExported, byReference) {
    constructor(hostRef) {
        super();
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("hr", { key: '0' });
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "cmp-extends-missing",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=cmp-extends-missing.js.map