import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopNavBarStyle0 from "./ui-kit/molecules/nav-bar/nav-bar.css?tag=pop-nav-bar&encapsulation=scoped";
export const NavBar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    get el() { return __stencil_getElement(this); }
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
};
NavBar.style = PopNavBarStyle0();
//# sourceMappingURL=nav-bar.js.map