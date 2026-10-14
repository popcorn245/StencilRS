import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const MethodReturns = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
__stencil_defineCustomElement(MethodReturns, [0, "method-returns", {
        "asyncNoAnnotation": [64],
        "annotatedPromise": [64],
        "annotatedVoid": [64],
        "emptyBody": [64],
        "returnsNumber": [64],
        "annotatedBoolean": [64],
        "returnsPromiseResolve": [64],
        "nestedReturnOnly": [64]
    }]);
//# sourceMappingURL=method-returns.js.map