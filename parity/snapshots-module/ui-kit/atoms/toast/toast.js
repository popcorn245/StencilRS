import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopToastStyle0 from "./ui-kit/atoms/toast/toast.css?tag=pop-toast&encapsulation=scoped";
export const Toast = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    get el() { return this; }
    position = 'bottom-center';
    duration = 5000;
    toasts = [];
    nextId = 0;
    /** Pending auto-dismiss timers, keyed by toast id, so a replacing `show` or an
     *  explicit `hide()` can cancel them (a sticky toast has no entry here). */
    timers = new Map();
    async show(message, type = 'default', action, options) {
        const id = this.nextId++;
        this.toasts = [...this.toasts, { id, message, type, action }];
        // A `duration <= 0` or `persistent: true` toast is sticky — it never
        // auto-dismisses and must be cleared via hide() (or a caller re-showing).
        // Otherwise arm a per-toast timer (tracked so hide() can cancel it).
        const ms = options?.duration ?? this.duration;
        const persistent = options?.persistent === true || ms <= 0;
        if (!persistent) {
            this.timers.set(id, setTimeout(() => {
                this.timers.delete(id);
                this.dismiss(id);
            }, ms));
        }
    }
    /**
     * Dismiss all currently-shown toasts, cancelling any pending auto-dismiss
     * timers. The single programmatic way to clear a sticky (persistent) toast.
     */
    async hide() {
        for (const t of [...this.toasts])
            this.dismiss(t.id);
    }
    dismiss(id) {
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        const toastEl = this.el.querySelector(`[data-toast-id="${id}"]`);
        if (toastEl) {
            toastEl.style.animation = 'toast-out 200ms ease forwards';
            toastEl.addEventListener('animationend', () => {
                this.toasts = this.toasts.filter(t => t.id !== id);
            }, { once: true });
        }
        else {
            this.toasts = this.toasts.filter(t => t.id !== id);
        }
    }
    handleAction = (toast) => {
        // Fire the in-page callback (e.g. Undo) then dismiss the toast at once so it
        // doesn't linger after the action completes.
        toast.action?.onAction?.();
        this.dismiss(toast.id);
    };
    render() {
        return (h("div", { key: '0', class: { 'toast-container': true, 'toast-container--bottom-right': this.position === 'bottom-right' }, "aria-live": "assertive", "aria-atomic": "true" }, this.toasts.map(toast => (h("div", { class: `toast toast--${toast.type}`, "data-toast-id": toast.id, key: toast.id },
            toast.message,
            toast.action &&
                (toast.action.onAction ? (h("button", { type: "button", class: "toast__action", onClick: () => this.handleAction(toast) }, toast.action.label)) : (h("a", { href: toast.action.href, class: "toast__action" }, toast.action.label))))))));
    }
    static get style() { return PopToastStyle0(); }
};
__stencil_proxyCustomElement(Toast, [514, "pop-toast", {
        "position": [1],
        "duration": [2],
        "toasts": [32],
        "show": [64],
        "hide": [64]
    }]);
//# sourceMappingURL=toast.js.map