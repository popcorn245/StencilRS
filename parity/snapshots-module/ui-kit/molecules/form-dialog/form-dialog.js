import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopFormDialogStyle0 from "./ui-kit/molecules/form-dialog/form-dialog.css?tag=pop-form-dialog&encapsulation=scoped";
export const FormDialog = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popSubmit = __stencil_createEvent(this, "popSubmit", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
    }
    get el() { return this; }
    open = false;
    dialogTitle;
    description;
    submitLabel = 'Save';
    cancelLabel = 'Cancel';
    /**
     * Hide the footer (Cancel/Submit) entirely — for dialogs that are dismissed by
     * the × / backdrop and have no explicit confirm action (e.g. the Weather panel).
     */
    hideFooter = false;
    /**
     * Opt into a slotted HEADER BAR: a single flex row laid out as
     *   `[ slot="header" …flex-grows… ] [ slot="header-actions" ] [ × close ]`
     * so the consumer supplies its OWN title + right-side control (a list-select, a
     * room switcher, …) INLINE with the close/action buttons — nothing overlaps the
     * ×, and the consumer's control can't be clipped in the top-right corner.
     *
     * When false (the default) the dialog keeps its legacy chrome: the absolutely
     * positioned round × plus an optional `dialogTitle` heading. Existing consumers
     * that pass `dialogTitle` are unaffected — this is purely additive.
     */
    headerBar = false;
    popSubmit;
    popClose;
    handleKeydown(ev) {
        if (ev.key === 'Escape' && this.open) {
            this.handleClose();
        }
    }
    handleOpenChange() {
        if (this.open) {
            requestAnimationFrame(() => {
                const firstInput = this.el.querySelector('input, textarea, select, button:not(.fd-close)');
                if (firstInput)
                    firstInput.focus();
            });
        }
    }
    handleClose() {
        this.open = false;
        this.popClose.emit();
    }
    /**
     * The content lives in a <form> so consumers WITH a footer keep Enter-to-submit
     * (e.g. type a thread name → Enter creates it). But ANY slotted <button> without
     * type="button" defaults to type=submit and would otherwise submit the form.
     * To prevent unintended close/submit:
     *   - We ALWAYS preventDefault (the form never navigates).
     *   - We only emit popSubmit when a footer is shown (an explicit submit action
     *     exists). With hideFooter there is NO submit semantics, so a stray slotted
     *     button can never trigger popSubmit — only ×/backdrop/Esc close the dialog.
     * The explicit footer submit button is type="submit" so Enter + click both
     * route through here; the close stays on × / backdrop / Esc, never on submit.
     */
    handleSubmit(e) {
        e.preventDefault();
        if (!this.hideFooter)
            this.popSubmit.emit();
    }
    render() {
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: { 'fd-backdrop': true, 'fd-backdrop--open': this.open }, onClick: () => this.handleClose() }),
            h("div", { key: '2', class: { 'fd-card': true }, style: { display: this.open ? 'flex' : 'none' } },
                h("div", { key: '3', class: { 'fd-panel': true, 'fd-panel--open': this.open, 'fd-panel--headerbar': this.headerBar } },
                    this.headerBar ? (h("div", { class: "fd-header" },
                        h("div", { class: "fd-header-main" },
                            h("slot", { name: "header" })),
                        h("div", { class: "fd-header-actions" },
                            h("slot", { name: "header-actions" }),
                            h("button", { type: "button", class: "fd-close fd-close--inline", "aria-label": "Close", onClick: () => this.handleClose() }, "\u00D7")))) : (h("button", { type: "button", class: "fd-close", "aria-label": "Close", onClick: () => this.handleClose() }, "\u00D7")),
                    this.dialogTitle && h("h2", { key: '4', class: "fd-title" }, this.dialogTitle),
                    this.description && h("p", { key: '5', class: "fd-description" }, this.description),
                    h("form", { key: '6', onSubmit: (e) => this.handleSubmit(e) },
                        h("div", { key: '7', class: "fd-body" },
                            h("slot", { key: '8' })),
                        !this.hideFooter && (h("div", { key: '9', class: "fd-footer" },
                            h("slot", { key: 'a', name: "footer" },
                                h("button", { key: 'b', type: "button", class: "outline", onClick: () => this.handleClose() }, this.cancelLabel),
                                h("button", { key: 'c', type: "submit" }, this.submitLabel)))))))));
    }
    static get watchers() { return {
        "open": [{
                "handleOpenChange": 0
            }]
    }; }
    static get style() { return PopFormDialogStyle0(); }
};
__stencil_proxyCustomElement(FormDialog, [774, "pop-form-dialog", {
        "open": [1540],
        "dialogTitle": [1, "dialog-title"],
        "description": [1],
        "submitLabel": [1, "submit-label"],
        "cancelLabel": [1, "cancel-label"],
        "hideFooter": [4, "hide-footer"],
        "headerBar": [4, "header-bar"]
    }, [[8, "keydown", "handleKeydown"]], {
        "open": [{
                "handleOpenChange": 0
            }]
    }]);
//# sourceMappingURL=form-dialog.js.map