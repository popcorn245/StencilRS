import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopCardStyle0 from "./ui-kit/atoms/card/card.css?tag=pop-card&encapsulation=scoped";
const Card = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
    static get style() { return PopCardStyle0(); }
};
__stencil_defineCustomElement(Card, [774, "pop-card", {
        "variant": [1],
        "href": [1],
        "padding": [1]
    }]);
//# sourceMappingURL=card.js.map