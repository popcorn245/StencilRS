import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopBulkBarStyle0 from "./ui-kit/molecules/bulk-bar/bulk-bar.css?tag=pop-bulk-bar&encapsulation=scoped";
export const PopBulkBar = class {
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
};
PopBulkBar.style = PopBulkBarStyle0();
//# sourceMappingURL=bulk-bar.js.map