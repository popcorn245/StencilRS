import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopPanelFabStyle0 from "./ui-kit/molecules/panel-fab/panel-fab.css?tag=pop-panel-fab&encapsulation=scoped";
export const PopPanelFab = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popAction = __stencil_createEvent(this, "popAction", 7);
    }
    /** Primary action label. Empty → the FAB is a controls-tray toggle only. */
    action = '';
    /** Ionicon name for the primary action. */
    icon = 'add';
    /** Hide the label and render the primary action as an icon-only circle. */
    compact = false;
    /** Set when the panel has no list controls — suppresses the tray + chevron. */
    noControls = false;
    /** Disable the primary action (a busy panel, an incomplete precondition). */
    disabled = false;
    /** Accessible name for the tray toggle. */
    controlsLabel = 'List controls';
    /** The primary action was tapped. */
    popAction;
    get el() { return __stencil_getElement(this); }
    open = false;
    connectedCallback() {
        document.addEventListener('click', this.onDocClick);
        document.addEventListener('keydown', this.onKeyDown);
    }
    disconnectedCallback() {
        document.removeEventListener('click', this.onDocClick);
        document.removeEventListener('keydown', this.onKeyDown);
    }
    onDocClick = (e) => {
        if (this.open && !this.el.contains(e.target))
            this.open = false;
    };
    onKeyDown = (e) => {
        if (e.key === 'Escape' && this.open)
            this.open = false;
    };
    render() {
        const hasAction = !!this.action;
        const hasControls = !this.noControls;
        // The chevron only earns its place when there is BOTH an action and a tray;
        // otherwise the single thing present becomes the button itself.
        const showChevron = hasAction && hasControls;
        const trayIsPrimary = !hasAction && hasControls;
        return (h("div", { key: '0', class: { pfab: true, 'pfab--open': this.open } },
            hasControls && (h("div", { key: '1', class: "pfab__tray", role: "group", "aria-label": this.controlsLabel, ...(this.open ? {} : { inert: true }) },
                h("slot", { key: '2', name: "controls" }))),
            h("div", { key: '3', class: "pfab__row" },
                hasAction && (h("button", { key: '4', type: "button", class: { pfab__btn: true, 'pfab__btn--compact': this.compact }, disabled: this.disabled, "aria-label": this.action, title: this.action, onClick: () => this.popAction.emit() },
                    h("ion-icon", { key: '5', class: "pfab__icon", name: this.icon, "aria-hidden": "true" }),
                    !this.compact && h("span", { key: '6', class: "pfab__label" }, this.action))),
                (showChevron || trayIsPrimary) && (h("button", { key: '7', type: "button", class: {
                        pfab__toggle: true,
                        'pfab__toggle--solo': trayIsPrimary,
                    }, "aria-label": this.controlsLabel, title: this.controlsLabel, "aria-expanded": this.open ? 'true' : 'false', onClick: () => (this.open = !this.open) },
                    h("ion-icon", { key: '8', class: "pfab__icon", name: trayIsPrimary ? 'options-outline' : 'chevron-up', "aria-hidden": "true" }))))));
    }
};
PopPanelFab.style = PopPanelFabStyle0();
//# sourceMappingURL=panel-fab.js.map