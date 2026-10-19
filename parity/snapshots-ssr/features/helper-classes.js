import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
class Base {
    ready = true;
}
// Plain classes beside a component: no output touches them.
class Child extends Base {
}
class WithConstructor extends Base {
    n;
    constructor(n = 1) {
        this.n = n;
        console.log(n);
    }
}
function make() {
    // Not top level.
    class Nested extends Base {
    }
    return new Nested();
}
export class HelperClasses {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    render() {
        return h("div", { key: '0' }, String(make().ready && new Child().ready && new WithConstructor().n));
    }
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "helper-classes",
        "$members$": undefined,
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=helper-classes.js.map