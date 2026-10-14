import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopBottomNavStyle0 from "./ui-kit/molecules/bottom-nav/bottom-nav.css?tag=pop-bottom-nav&encapsulation=scoped";
const BottomNav = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.centerpress = __stencil_createEvent(this, "centerpress", 7);
        this.tabselect = __stencil_createEvent(this, "tabselect", 7);
    }
    /** JSON array of the tab destinations ({id,label,icon,href?,badge?}).
     *  The first half renders left of the center button, the rest right (2+2
     *  with four tabs). */
    items = '[]';
    /** Which tab is current (drives the active style). */
    activeId;
    /** What the center button does — the PARENT decides ('scan' or 'add'). */
    centerAction = 'scan';
    /** Ionicon for the center button; defaults per `centerAction`
     *  (scan → camera, add → add). */
    centerIcon;
    /** Tiny label under the center button; defaults per `centerAction`.
     *  Pass '' to hide. */
    centerLabel;
    /** Disable the whole bar (e.g. offline). */
    disabled = false;
    /** Collapse tab labels when the BAR (container, not viewport) is under
     *  400px — the pop-tab-bar compact pattern. */
    compact = false;
    /** Detached-fixed (default) floats above the viewport bottom + safe area;
     *  `static` renders in place (Storybook frames / in-page use). */
    position = 'fixed';
    /** Center button pressed — parent opens the scanner / add sheet. */
    centerpress;
    /** Tab pressed — parent routes. */
    tabselect;
    get parsedItems() {
        try {
            const raw = JSON.parse(this.items);
            return Array.isArray(raw) ? raw.filter((i) => i && i.id) : [];
        }
        catch {
            return [];
        }
    }
    handleTab(id) {
        if (this.disabled)
            return;
        this.tabselect.emit({ id });
    }
    handleCenter = () => {
        if (this.disabled)
            return;
        this.centerpress.emit({ action: this.centerAction });
    };
    renderTab(item) {
        const active = item.id === this.activeId;
        return (h("button", { type: "button", class: { 'bn-tab': true, 'bn-tab--active': active }, disabled: this.disabled, "aria-label": item.label, "aria-current": active ? 'page' : undefined, onClick: () => this.handleTab(item.id) },
            h("span", { class: "bn-tab-ic" },
                h("pop-icon", { name: item.icon }),
                typeof item.badge === 'number' && item.badge > 0 && (h("span", { class: "bn-tab-badge" }, item.badge > 99 ? '99+' : item.badge))),
            h("span", { class: "bn-tab-label" }, item.label)));
    }
    render() {
        const items = this.parsedItems;
        const half = Math.ceil(items.length / 2);
        const left = items.slice(0, half);
        const right = items.slice(half);
        const centerIcon = this.centerIcon || (this.centerAction === 'add' ? 'add' : 'camera');
        const centerLabel = this.centerLabel ?? (this.centerAction === 'add' ? 'Add' : 'Scan');
        return (h("div", { key: '0', class: {
                'bn-wrap': true,
                'bn-wrap--fixed': this.position === 'fixed',
                'bn-wrap--compact': this.compact,
                'bn-wrap--disabled': this.disabled,
            } },
            h("nav", { key: '1', class: "bn-bar", "aria-label": "Primary" },
                h("div", { key: '2', class: "bn-side bn-side--left" }, left.map((i) => this.renderTab(i))),
                h("div", { key: '3', class: "bn-notch", "aria-hidden": "true" }),
                h("div", { key: '4', class: "bn-side bn-side--right" }, right.map((i) => this.renderTab(i))),
                h("div", { key: '5', class: "bn-centerwrap" },
                    h("button", { key: '6', type: "button", class: "bn-center", disabled: this.disabled, "aria-label": centerLabel || this.centerAction, onClick: this.handleCenter },
                        h("slot", { key: '7', name: "center" },
                            h("pop-icon", { key: '8', class: "bn-center-ic", name: centerIcon }))),
                    centerLabel && h("span", { key: '9', class: "bn-center-label" }, centerLabel)))));
    }
    static get style() { return PopBottomNavStyle0(); }
};
__stencil_defineCustomElement(BottomNav, [774, "pop-bottom-nav", {
        "items": [1],
        "activeId": [1, "active-id"],
        "centerAction": [1, "center-action"],
        "centerIcon": [1, "center-icon"],
        "centerLabel": [1, "center-label"],
        "disabled": [4],
        "compact": [4],
        "position": [1]
    }]);
//# sourceMappingURL=bottom-nav.js.map