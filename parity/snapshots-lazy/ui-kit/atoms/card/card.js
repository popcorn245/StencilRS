import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopCardStyle0 from "./ui-kit/atoms/card/card.css?tag=pop-card&encapsulation=scoped";
export const Card = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    variant = 'default';
    href;
    padding = 'md';
    render() {
        const Tag = this.href ? 'a' : 'div';
        const attrs = this.href ? { href: this.href } : {};
        return (h(Tag, { key: '0', class: {
                'card': true,
                [`card--${this.variant}`]: true,
                [`card--${this.padding}`]: true,
            }, ...attrs },
            h("div", { key: '1', class: "card-header" },
                h("slot", { key: '2', name: "header" })),
            h("div", { key: '3', class: "card-body" },
                h("slot", { key: '4' })),
            h("div", { key: '5', class: "card-footer" },
                h("slot", { key: '6', name: "footer" }))));
    }
};
Card.style = PopCardStyle0();
//# sourceMappingURL=card.js.map