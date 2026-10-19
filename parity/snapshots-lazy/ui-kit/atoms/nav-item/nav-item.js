import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopNavItemStyle0 from "./ui-kit/atoms/nav-item/nav-item.css?tag=pop-nav-item&encapsulation=scoped";
export const NavItem = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
};
NavItem.style = PopNavItemStyle0();
//# sourceMappingURL=nav-item.js.map