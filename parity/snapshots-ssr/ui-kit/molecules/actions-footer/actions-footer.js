import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
import PopActionsFooterStyle0 from "./ui-kit/molecules/actions-footer/actions-footer.css?tag=pop-actions-footer&encapsulation=scoped";
/**
 * pop-actions-footer — the Cancel/Send pair (molecule), extracted from its two
 * duplicated homes (bottom-sheet `slot="actions"` markup and the
 * pop-form-dialog footer).
 *
 * Tier-aware spacing/order:
 *   sheet  — full-width, stacked-friendly buttons (thumb-reachable)
 *   dialog — right-aligned pair
 *   dock   — compact inline pair
 *
 * IMPORTANT: both buttons are `type="button"` (the Pico `[type=button]` /
 * pop-form-dialog implicit-submit gotcha) — submission is driven ONLY by the
 * `popSubmit` event, never by a form submit.
 */
export class PopActionsFooter {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popSubmit = __stencil_createEvent(this, "popSubmit", 7);
        this.popCancel = __stencil_createEvent(this, "popCancel", 7);
    }
    submitLabel = 'Send';
    cancelLabel = 'Cancel';
    submitDisabled = false;
    /** Busy: spinner-in-button, both buttons disabled. */
    busy = false;
    /** Presentation tier the footer sits in (spacing/order). */
    tier = 'dialog';
    popSubmit;
    popCancel;
    render() {
        return (h(Host, { key: '0', class: { [`pop-actions-footer--${this.tier}`]: true } },
            h("div", { key: '1', class: { af: true, [`af--${this.tier}`]: true } },
                h("button", { key: '2', type: "button", class: "af__cancel", disabled: this.busy, onClick: () => this.popCancel.emit() }, this.cancelLabel),
                h("button", { key: '3', type: "button", class: "af__submit", disabled: this.submitDisabled || this.busy, "aria-busy": this.busy ? 'true' : null, onClick: () => this.popSubmit.emit() },
                    this.busy && h("span", { key: '4', class: "af__spin", "aria-hidden": "true" }),
                    this.submitLabel))));
    }
    static get style() { return PopActionsFooterStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-actions-footer",
        "$members$": {
            "submitLabel": [1, "submit-label"],
            "cancelLabel": [1, "cancel-label"],
            "submitDisabled": [4, "submit-disabled"],
            "busy": [4],
            "tier": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=actions-footer.js.map