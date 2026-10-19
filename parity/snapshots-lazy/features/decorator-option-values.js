import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const NAME = 'from-const';
export const DecoratorOptionValues = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.identifierEvent = __stencil_createEvent(this, "identifierEvent", 7);
    }
    nullAttribute;
    undefinedAttribute;
    identifierAttribute;
    templateAttribute;
    numericReflect;
    identifierEvent;
    render() {
        return h("div", { key: '0' });
    }
};
//# sourceMappingURL=decorator-option-values.js.map