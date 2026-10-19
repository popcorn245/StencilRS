import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopConfirmDialogStyle0 from "./ui-kit/molecules/confirm-dialog/confirm-dialog.css?tag=pop-confirm-dialog&encapsulation=scoped";
export const ConfirmDialog = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
};
ConfirmDialog.style = PopConfirmDialogStyle0();
//# sourceMappingURL=confirm-dialog.js.map