import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
export class PropsGetterSetter {
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
    static get cmpMeta() { return {
        "$flags$": 0,
        "$tagName$": "props-getter-setter",
        "$members$": {
            "value": [6145],
            "readonlyCount": [2050, "readonly-count"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=props-getter-setter.js.map