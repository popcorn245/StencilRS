import { registerInstance as __stencil_registerInstance, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopNavBarStyle0 from "./ui-kit/molecules/nav-bar/nav-bar.css?tag=pop-nav-bar&encapsulation=scoped";
export class NavBar {
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
    static get style() { return PopNavBarStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-nav-bar",
        "$members$": {
            "direction": [1],
            "position": [1],
            "activeHref": [1, "active-href"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=nav-bar.js.map