import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopActionsFooterStyle0 from "./ui-kit/molecules/actions-footer/actions-footer.css?tag=pop-actions-footer&encapsulation=scoped";
const PopActionsFooter = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_defineCustomElement(PopActionsFooter, [514, "pop-actions-footer", {
        "submitLabel": [1, "submit-label"],
        "cancelLabel": [1, "cancel-label"],
        "submitDisabled": [4, "submit-disabled"],
        "busy": [4],
        "tier": [1]
    }]);
//# sourceMappingURL=actions-footer.js.map