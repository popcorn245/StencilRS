import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
const NAME = 'from-const';
export class DecoratorOptionValues {
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
    static get cmpMeta() { return {
        "$flags$": 512,
        "$tagName$": "decorator-option-values",
        "$members$": {
            "nullAttribute": [1, "null-attribute"],
            "undefinedAttribute": [1, "undefined-attribute"],
            "identifierAttribute": [1, "identifier-attribute"],
            "templateAttribute": [1, "tpl-attr"],
            "numericReflect": [1, "numeric-reflect"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=decorator-option-values.js.map