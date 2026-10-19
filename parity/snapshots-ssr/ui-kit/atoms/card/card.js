import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopCardStyle0 from "./ui-kit/atoms/card/card.css?tag=pop-card&encapsulation=scoped";
export class Card {
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
    static get style() { return PopCardStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-card",
        "$members$": {
            "variant": [1],
            "href": [1],
            "padding": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=card.js.map