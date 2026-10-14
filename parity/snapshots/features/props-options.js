import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
const PropsOptions = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    reflected;
    mutated;
    both;
    renamed;
    upper;
    noAttribute;
    firstName;
    value2;
    required;
    optional;
    mode;
    complexReflect;
    render() {
        return h("div", { key: '0' }, this.firstName);
    }
};
__stencil_defineCustomElement(PropsOptions, [512, "props-options", {
        "reflected": [513],
        "mutated": [1026],
        "both": [1540],
        "renamed": [1, "custom-attr"],
        "upper": [1, "upper-attr"],
        "noAttribute": [1, "no-attribute"],
        "firstName": [1, "first-name"],
        "value2": [1, "value-2"],
        "required": [1],
        "optional": [1],
        "mode": [1],
        "complexReflect": [16]
    }]);
//# sourceMappingURL=props-options.js.map