import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopNavItemStyle0 from "./ui-kit/atoms/nav-item/nav-item.css?tag=pop-nav-item&encapsulation=scoped";
export const NavItem = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    href;
    icon;
    label;
    active = false;
    render() {
        return (h("a", { key: '0', href: this.href, class: { 'ni': true, 'ni--active': this.active } },
            this.icon && h("span", { key: '1', class: "ni-icon" }, this.icon),
            this.label && h("span", { key: '2', class: "ni-label" }, this.label)));
    }
    static get style() { return PopNavItemStyle0(); }
};
__stencil_proxyCustomElement(NavItem, [514, "pop-nav-item", {
        "href": [1],
        "icon": [1],
        "label": [1],
        "active": [4]
    }]);
//# sourceMappingURL=nav-item.js.map