import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopConfirmDialogStyle0 from "./ui-kit/molecules/confirm-dialog/confirm-dialog.css?tag=pop-confirm-dialog&encapsulation=scoped";
const ConfirmDialog = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popConfirm = __stencil_createEvent(this, "popConfirm", 7);
        this.popCancel = __stencil_createEvent(this, "popCancel", 7);
    }
    confirmTitle = 'Confirm';
    message = 'Are you sure?';
    confirmLabel = 'Delete';
    cancelLabel = 'Cancel';
    danger = true;
    isOpen = false;
    popConfirm;
    popCancel;
    resolvePromise = null;
    async confirm() {
        this.isOpen = true;
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }
    handleConfirm() {
        this.isOpen = false;
        this.popConfirm.emit();
        this.resolvePromise?.(true);
        this.resolvePromise = null;
    }
    handleKeydown(ev) {
        if (ev.key === 'Escape' && this.isOpen) {
            this.handleCancel();
        }
    }
    handleCancel() {
        this.isOpen = false;
        this.popCancel.emit();
        this.resolvePromise?.(false);
        this.resolvePromise = null;
    }
    render() {
        return (h(Host, { key: '0' },
            h("div", { key: '1', class: { 'cd-backdrop': true, 'cd-backdrop--open': this.isOpen }, onClick: () => this.handleCancel() }),
            h("div", { key: '2', class: { 'cd-panel-wrap': true, 'cd-panel-wrap--open': this.isOpen } },
                h("div", { key: '3', class: { 'cd-panel': true, 'cd-panel--open': this.isOpen } },
                    h("h3", { key: '4', class: "cd-title" }, this.confirmTitle),
                    h("p", { key: '5', class: "cd-message" }, this.message),
                    h("div", { key: '6', class: "cd-actions" },
                        h("button", { key: '7', class: "outline", onClick: () => this.handleCancel() }, this.cancelLabel),
                        h("button", { key: '8', class: { 'cd-btn-danger': this.danger }, onClick: () => this.handleConfirm() }, this.confirmLabel))))));
    }
    static get style() { return PopConfirmDialogStyle0(); }
};
__stencil_defineCustomElement(ConfirmDialog, [514, "pop-confirm-dialog", {
        "confirmTitle": [1, "confirm-title"],
        "message": [1],
        "confirmLabel": [1, "confirm-label"],
        "cancelLabel": [1, "cancel-label"],
        "danger": [4],
        "isOpen": [32],
        "confirm": [64]
    }, [[8, "keydown", "handleKeydown"]]]);
//# sourceMappingURL=confirm-dialog.js.map