import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const PropsGetterSetter = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    _value = 'initial';
    _count = 0;
    get value() {
        return this._value;
    }
    set value(v) {
        this._value = v;
    }
    get readonlyCount() {
        return this._count;
    }
    render() {
        return h("div", { key: '0' }, this.value);
    }
};
__stencil_proxyCustomElement(PropsGetterSetter, [0, "props-getter-setter", {
        "value": [6145],
        "readonlyCount": [2050, "readonly-count"]
    }]);
//# sourceMappingURL=props-getter-setter.js.map