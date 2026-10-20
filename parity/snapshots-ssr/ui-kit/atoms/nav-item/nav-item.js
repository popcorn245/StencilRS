import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopNavItemStyle0 from "./ui-kit/atoms/nav-item/nav-item.css?tag=pop-nav-item&encapsulation=scoped";
export class NavItem {
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
    static get style() { return PopNavItemStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-nav-item",
        "$members$": {
            "href": [1],
            "icon": [1],
            "label": [1],
            "active": [4]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=nav-item.js.map