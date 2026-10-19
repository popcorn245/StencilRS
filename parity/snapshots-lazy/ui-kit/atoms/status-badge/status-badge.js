import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopStatusBadgeStyle0 from "./ui-kit/atoms/status-badge/status-badge.css?tag=pop-status-badge&encapsulation=scoped";
export const StatusBadge = class {
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
};
StatusBadge.style = PopStatusBadgeStyle0();
//# sourceMappingURL=status-badge.js.map