import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class MethodReturns {
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
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "method-returns",
        "$members$": {
            "asyncNoAnnotation": [64],
            "annotatedPromise": [64],
            "annotatedVoid": [64],
            "emptyBody": [64],
            "returnsNumber": [64],
            "annotatedBoolean": [64],
            "returnsPromiseResolve": [64],
            "nestedReturnOnly": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=method-returns.js.map