import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
export const PropsGetterSetter = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
//# sourceMappingURL=props-getter-setter.js.map