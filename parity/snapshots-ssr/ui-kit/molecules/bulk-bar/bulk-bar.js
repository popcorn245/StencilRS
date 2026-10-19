import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
import PopBulkBarStyle0 from "./ui-kit/molecules/bulk-bar/bulk-bar.css?tag=pop-bulk-bar&encapsulation=scoped";
/**
 * pop-bulk-bar — the MULTI-SELECT action bar (molecule) that appears while a
 * list/grid is in selection mode: "N selected", the host's action buttons
 * (slotted — validity is the host's call), and a Done exit.
 *
 * Reusable shape (panel-storybook pattern): the bar owns only the chrome —
 * count pill, slot, Done. Which actions render (and what they do) stays in the
 * host panel; buttons dropped in the slot inherit the bar's pill styling via
 * `.bulk__act` (or bring their own classes).
 *
 * Sticky-bottom by default (`position: sticky; bottom: 0`) so it stays
 * thumb-reachable over long lists; hosts can override positioning freely.
 */
export class PopBulkBar {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popBulkDone = __stencil_createEvent(this, "popBulkDone", 7);
    }
    /** How many items are selected (the count pill). */
    count = 0;
    /** Noun after the count (e.g. "selected", "cards"). */
    label = 'selected';
    /** Busy: a bulk request is running — every control disables. */
    busy = false;
    /** Done/exit button label. */
    doneLabel = 'Done';
    /** Exit selection mode (Done tapped). */
    popBulkDone;
    render() {
        return (h(Host, { key: '0', role: "toolbar", "aria-label": "Bulk actions" },
            h("div", { key: '1', class: { bulk: true, 'bulk--busy': this.busy } },
                h("span", { key: '2', class: "bulk__count", "aria-live": "polite" },
                    h("strong", { key: '3' }, this.count),
                    " ",
                    this.label),
                h("div", { key: '4', class: "bulk__actions" },
                    h("slot", { key: '5' })),
                h("button", { key: '6', type: "button", class: "bulk__done", disabled: this.busy, onClick: () => this.popBulkDone.emit() }, this.doneLabel))));
    }
    static get style() { return PopBulkBarStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-bulk-bar",
        "$members$": {
            "count": [2],
            "label": [1],
            "busy": [4],
            "doneLabel": [1, "done-label"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=bulk-bar.js.map