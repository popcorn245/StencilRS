import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const MethodReturns = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    async asyncNoAnnotation() { }
    annotatedPromise() {
        return Promise.resolve();
    }
    annotatedVoid() { }
    emptyBody() { }
    returnsNumber() {
        return 1;
    }
    annotatedBoolean() {
        return true;
    }
    returnsPromiseResolve() {
        return Promise.resolve(1);
    }
    nestedReturnOnly() {
        [1].forEach((x) => {
            return x;
        });
    }
    render() {
        return h("div", { key: '0' });
    }
};
//# sourceMappingURL=method-returns.js.map