import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopPanelFabStyle0 from "./ui-kit/molecules/panel-fab/panel-fab.css?tag=pop-panel-fab&encapsulation=scoped";
/**
 * `pop-panel-fab` — the bottom-right floating action button for a data panel,
 * with an expanding tray for that panel's LIST CONTROLS.
 *
 * Two jobs in one control, because they compete for the same corner:
 *
 *  • **Primary action** — the panel's one create verb ("Add recipe", "New tag").
 *    Set `action` to render it as the FAB's own tap target.
 *  • **List controls** — view switcher / search / filter-sort, slotted into
 *    `controls`. They live in a tray that expands above the button.
 *
 * With both, the FAB shows the primary action and a small chevron that opens
 * the tray. With only one, the FAB *is* that one thing and there is no chevron
 * — a disclosure control that reveals nothing is worse than no control.
 *
 * ## Placement is the consumer's job, on purpose
 *
 * The host is `position: absolute` against the nearest positioned ancestor, NOT
 * `fixed`. The bucket-hub panels this is built for render inside three
 * different presentation tiers (bottom sheet, dialog, dock) and two of them
 * keep persistent CSS transforms, which re-base fixed positioning onto the
 * transformed box rather than the viewport. Absolute + a positioned ancestor
 * behaves identically in all three.
 *
 * Safe-area inset is handled here (`env(safe-area-inset-bottom)`) so a sheet
 * pinned to the bottom of a phone screen doesn't put the FAB under the home
 * indicator.
 *
 * @example
 * <pop-panel-fab action="Add recipe" icon="add">
 *   <pop-list-filter-sort slot="controls" />
 * </pop-panel-fab>
 */
export class PopPanelFab {
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
    static get style() { return PopPanelFabStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-panel-fab",
        "$members$": {
            "action": [1],
            "icon": [1],
            "compact": [4],
            "noControls": [4, "no-controls"],
            "disabled": [4],
            "controlsLabel": [1, "controls-label"],
            "open": [32]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=panel-fab.js.map