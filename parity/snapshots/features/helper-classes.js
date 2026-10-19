import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
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
const HelperClasses = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    render() {
        return h("div", { key: '0' }, String(make().ready && new Child().ready && new WithConstructor().n));
    }
};
__stencil_defineCustomElement(HelperClasses, [0, "helper-classes"]);
//# sourceMappingURL=helper-classes.js.map