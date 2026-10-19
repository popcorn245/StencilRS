import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopNavBarStyle0 from "./ui-kit/molecules/nav-bar/nav-bar.css?tag=pop-nav-bar&encapsulation=scoped";
export const NavBar = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    get el() { return this; }
    direction = 'horizontal';
    position = 'none';
    activeHref;
    updateActiveItems() {
        const items = this.el.querySelectorAll('pop-nav-item');
        items.forEach((item) => {
            item.active = item.href === this.activeHref;
        });
    }
    componentDidLoad() {
        if (this.direction === 'vertical') {
            const items = this.el.querySelectorAll('pop-nav-item');
            items.forEach(item => item.classList.add('ni--vertical'));
        }
        this.updateActiveItems();
    }
    render() {
        return (h("nav", { key: '0', class: {
                'nb': true,
                [`nb--${this.direction}`]: true,
                [`nb--${this.position}`]: this.position !== 'none',
            } },
            h("slot", { key: '1' })));
    }
    static get watchers() { return {
        "activeHref": [{
                "updateActiveItems": 0
            }]
    }; }
    static get style() { return PopNavBarStyle0(); }
};
__stencil_proxyCustomElement(NavBar, [774, "pop-nav-bar", {
        "direction": [1],
        "position": [1],
        "activeHref": [1, "active-href"]
    }, undefined, {
        "activeHref": [{
                "updateActiveItems": 0
            }]
    }]);
//# sourceMappingURL=nav-bar.js.map