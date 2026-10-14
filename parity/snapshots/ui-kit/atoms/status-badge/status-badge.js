import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopStatusBadgeStyle0 from "./ui-kit/atoms/status-badge/status-badge.css?tag=pop-status-badge&encapsulation=scoped";
const StatusBadge = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_defineCustomElement(StatusBadge, [774, "pop-status-badge", {
        "variant": [1],
        "color": [1],
        "size": [1]
    }]);
//# sourceMappingURL=status-badge.js.map