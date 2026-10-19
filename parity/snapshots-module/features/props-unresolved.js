import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const PropsUnresolved = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    external;
    externalEnum;
    date;
    element;
    externalOrString;
    keys;
    query;
    render() {
        return h("div", { key: '0' });
    }
};
__stencil_proxyCustomElement(PropsUnresolved, [512, "props-unresolved", {
        "external": [8],
        "externalEnum": [8, "external-enum"],
        "date": [8],
        "element": [8],
        "externalOrString": [8, "external-or-string"],
        "keys": [1],
        "query": [16]
    }]);
//# sourceMappingURL=props-unresolved.js.map