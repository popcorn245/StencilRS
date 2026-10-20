import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { PRESENTER_BREAKPOINTS, resolvePresenterTier } from './presenter-logic';
import PopPresenterStyle0 from "./ui-kit/organisms/presenter/presenter.css?tag=pop-presenter&encapsulation=scoped";
export const PopPresenter = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.tierChange = __stencil_createEvent(this, "tierChange", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
        this.popRedock = __stencil_createEvent(this, "popRedock", 7);
    }
    get el() { return this; }
    /** Visibility — when false the presenter renders nothing (parent owns state). */
    open = false;
    /** Chrome heading (sheet title / dialog title / dock header). Omit when the
     *  slotted surface renders its own header. */
    heading;
    /** Breakpoint overrides. Defaults restore the quick-controls spec values. */
    sheetMax = PRESENTER_BREAKPOINTS.sheetMax;
    dockMin = PRESENTER_BREAKPOINTS.dockMin;
    /** Force a tier regardless of viewport (host-controlled mode — e.g. the host
     *  keeps a collapsed-dock preference by forcing 'dialog'). */
    tier;
    /** The resolved tier, emitted on open and whenever it changes while open. */
    tierChange;
    /** × / backdrop / Esc / dock close. */
    popClose;
    /** The dialog tier's "Dock to side" affordance was tapped (host flips its
     *  dock preference and re-presents). */
    popRedock;
    /** Re-render trigger for viewport-driven tier changes. */
    viewportWidth = typeof window !== 'undefined' ? window.innerWidth : PRESENTER_BREAKPOINTS.dockMin - 1;
    lastEmittedTier = null;
    get resolvedTier() {
        return resolvePresenterTier(this.viewportWidth, {
            sheetMax: this.sheetMax,
            dockMin: this.dockMin,
            tier: this.tier,
        });
    }
    onResize = () => {
        this.viewportWidth = typeof window !== 'undefined' ? window.innerWidth : this.viewportWidth;
        this.maybeEmitTier();
    };
    maybeEmitTier() {
        if (!this.open)
            return;
        const tier = this.resolvedTier;
        if (tier !== this.lastEmittedTier) {
            this.lastEmittedTier = tier;
            this.tierChange.emit(tier);
        }
    }
    connectedCallback() {
        if (typeof window !== 'undefined')
            window.addEventListener('resize', this.onResize, { passive: true });
        this.maybeEmitTier();
    }
    disconnectedCallback() {
        if (typeof window !== 'undefined')
            window.removeEventListener('resize', this.onResize);
    }
    onOpenChange(open) {
        if (open) {
            this.viewportWidth = typeof window !== 'undefined' ? window.innerWidth : this.viewportWidth;
            this.maybeEmitTier();
        }
        else {
            this.lastEmittedTier = null;
        }
    }
    onTierPropChange() {
        this.maybeEmitTier();
    }
    close = () => this.popClose.emit();
    /** Handler for the inner overlay's own popClose (sheet / dialog). Those events
     *  bubble (Stencil default), so without stopPropagation a listener on the
     *  presenter would receive both the bubbled inner event AND the presenter's
     *  re-emit — two popCloses per dismissal. Stop the inner one, then emit ours so
     *  exactly one popClose reaches the consumer. */
    onInnerClose = (ev) => {
        ev.stopPropagation();
        this.popClose.emit();
    };
    /** Whether the consumer slotted footer actions (light DOM query — scoped). */
    hasActions() {
        return !!this.el.querySelector('[slot="actions"]');
    }
    /** Whether the consumer slotted rich header content. */
    hasHeader() {
        return !!this.el.querySelector('[slot="header"]');
    }
    /** "Dock to side" is due when the tier resolved to dialog but the viewport
     *  qualifies for the dock — which only happens when the HOST forced 'dialog'
     *  (a collapsed dock). Tapping it emits popRedock. */
    showRedock() {
        return this.resolvedTier === 'dialog' && this.viewportWidth >= this.dockMin;
    }
    render() {
        if (!this.open)
            return null;
        const tier = this.resolvedTier;
        const hasActions = this.hasActions();
        const hasHeader = this.hasHeader();
        if (tier === 'sheet') {
            return (h("pop-bottom-sheet", { open: true, sheetTitle: this.heading, onPopClose: this.onInnerClose },
                hasHeader && (h("div", { class: "presenter__sheet-header" },
                    h("slot", { name: "header" }))),
                h("slot", null),
                hasActions && (h("div", { slot: "actions", class: "presenter__actions presenter__actions--sheet" },
                    h("slot", { name: "actions" })))));
        }
        if (tier === 'dock') {
            // PLAIN panel container — the host places this element in its layout.
            return (h("section", { class: "presenter-dock", "aria-label": this.heading },
                h("header", { class: "presenter-dock__header" },
                    h("div", { class: "presenter-dock__header-main" }, hasHeader ? (h("slot", { name: "header" })) : this.heading ? (h("span", { class: "presenter-dock__title" }, this.heading)) : null),
                    h("button", { type: "button", class: "presenter-dock__close", "aria-label": "Close", onClick: this.close },
                        h("pop-icon", { name: "close" }))),
                h("div", { class: "presenter-dock__body" },
                    h("slot", null)),
                hasActions && (h("footer", { class: "presenter__actions presenter__actions--dock" },
                    h("slot", { name: "actions" })))));
        }
        // dialog — footer-less pop-form-dialog; the actions slot renders below the
        // body so submission only ever flows through the slotted footer's events.
        const redock = this.showRedock();
        const useHeaderBar = hasHeader || redock;
        return (h("pop-form-dialog", { open: true, hideFooter: true, ...(useHeaderBar ? { headerBar: true } : this.heading ? { dialogTitle: this.heading } : {}), onPopClose: this.onInnerClose },
            useHeaderBar && (h("div", { slot: "header" }, hasHeader ? (h("slot", { name: "header" })) : this.heading ? (h("span", { class: "presenter__dialog-title" }, this.heading)) : null)),
            redock && (h("div", { slot: "header-actions" },
                h("button", { type: "button", class: "presenter__redock", title: "Dock to side", "aria-label": "Dock to side", onClick: () => this.popRedock.emit() },
                    h("pop-icon", { name: "enter-outline" })))),
            h("slot", null),
            hasActions && (h("div", { class: "presenter__actions presenter__actions--dialog" },
                h("slot", { name: "actions" })))));
    }
    static get watchers() { return {
        "open": [{
                "onOpenChange": 0
            }],
        "tier": [{
                "onTierPropChange": 0
            }]
    }; }
    static get style() { return PopPresenterStyle0(); }
};
__stencil_proxyCustomElement(PopPresenter, [774, "pop-presenter", {
        "open": [4],
        "heading": [1],
        "sheetMax": [8, "sheet-max"],
        "dockMin": [8, "dock-min"],
        "tier": [8],
        "viewportWidth": [32]
    }, undefined, {
        "open": [{
                "onOpenChange": 0
            }],
        "tier": [{
                "onTierPropChange": 0
            }]
    }]);
//# sourceMappingURL=presenter.js.map