import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const NAME = 'from-const';
export const DecoratorOptionValues = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
__stencil_proxyCustomElement(DecoratorOptionValues, [512, "decorator-option-values", {
        "nullAttribute": [1, "null-attribute"],
        "undefinedAttribute": [1, "undefined-attribute"],
        "identifierAttribute": [1, "identifier-attribute"],
        "templateAttribute": [1, "tpl-attr"],
        "numericReflect": [1, "numeric-reflect"]
    }]);
//# sourceMappingURL=decorator-option-values.js.map