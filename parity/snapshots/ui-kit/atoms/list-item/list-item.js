import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopListItemStyle0 from "./ui-kit/atoms/list-item/list-item.css?tag=pop-list-item&encapsulation=scoped";
const ListItem = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    href;
    icon;
    selected = false;
    render() {
        const Tag = this.href ? 'a' : 'div';
        const attrs = this.href ? { href: this.href } : {};
        return (h(Tag, { key: '0', class: { 'li': true, 'li--selected': this.selected }, ...attrs },
            h("div", { key: '1', class: "li-thumb" },
                h("slot", { key: '2', name: "thumbnail" }, this.icon && h("span", { key: '3' }, this.icon))),
            h("div", { key: '4', class: "li-content" },
                h("div", { key: '5', class: "li-title" },
                    h("slot", { key: '6' })),
                h("div", { key: '7', class: "li-subtitle" },
                    h("slot", { key: '8', name: "subtitle" }))),
            h("div", { key: '9', class: "li-trailing" },
                h("slot", { key: 'a', name: "trailing" }))));
    }
    static get style() { return PopListItemStyle0(); }
};
__stencil_defineCustomElement(ListItem, [774, "pop-list-item", {
        "href": [1],
        "icon": [1],
        "selected": [4]
    }]);
//# sourceMappingURL=list-item.js.map