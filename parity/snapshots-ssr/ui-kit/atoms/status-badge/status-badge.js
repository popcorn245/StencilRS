import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopStatusBadgeStyle0 from "./ui-kit/atoms/status-badge/status-badge.css?tag=pop-status-badge&encapsulation=scoped";
export class StatusBadge {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    variant = 'chip';
    color;
    size = 'md';
    render() {
        return (h("span", { key: '0', class: {
                'sb': true,
                [`sb--${this.variant}`]: true,
                [`sb--${this.size}`]: true,
            }, style: { '--sb-color': this.color } }, this.variant !== 'dot' && h("slot", { key: '1' })));
    }
    static get style() { return PopStatusBadgeStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-status-badge",
        "$members$": {
            "variant": [1],
            "color": [1],
            "size": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=status-badge.js.map