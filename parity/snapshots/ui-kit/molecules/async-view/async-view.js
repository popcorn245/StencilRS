import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopAsyncViewStyle0 from "./ui-kit/molecules/async-view/async-view.css?tag=pop-async-view&encapsulation=scoped";
const PopAsyncView = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popRetry = __stencil_createEvent(this, "popRetry", 7);
    }
    /** Which region shows. */
    state = 'loading';
    /** Default empty-state message (default empty slot). */
    emptyLabel = 'Nothing here yet';
    /** Default error-state message (default error slot). */
    errorLabel = 'Something went wrong';
    /** Default retry button label (default error slot). */
    retryLabel = 'Retry';
    /** The default error state's retry button was tapped. */
    popRetry;
    /** Re-emit the inner pop-error-state's popRetry as our own (single source). */
    onInnerRetry = (e) => {
        e.stopPropagation();
        this.popRetry.emit();
    };
    render() {
        const s = this.state;
        const region = (name) => ({
            av__region: true,
            [`av__region--${name}`]: true,
            'av__region--active': s === name,
        });
        return (h(Host, { key: '0', class: { [`pop-async-view--${s}`]: true } },
            h("div", { key: '1', class: region('loading'), role: "status", "aria-hidden": s !== 'loading' ? 'true' : 'false' },
                h("slot", { key: '2', name: "loading" },
                    h("pop-loading-state", { key: '3', variant: "spinner", label: "Loading\u2026" }))),
            h("div", { key: '4', class: region('empty'), "aria-hidden": s !== 'empty' ? 'true' : 'false' },
                h("slot", { key: '5', name: "empty" },
                    h("pop-empty-state", { key: '6', message: this.emptyLabel, size: "inline" }))),
            h("div", { key: '7', class: region('error'), "aria-hidden": s !== 'error' ? 'true' : 'false' },
                h("slot", { key: '8', name: "error" },
                    h("pop-error-state", { key: '9', heading: this.errorLabel, retryable: true, retryLabel: this.retryLabel, size: "inline", onPopRetry: this.onInnerRetry }))),
            h("div", { key: 'a', class: region('content'), "aria-hidden": s !== 'content' ? 'true' : 'false' },
                h("slot", { key: 'b' }))));
    }
    static get style() { return PopAsyncViewStyle0(); }
};
__stencil_defineCustomElement(PopAsyncView, [774, "pop-async-view", {
        "state": [1],
        "emptyLabel": [1, "empty-label"],
        "errorLabel": [1, "error-label"],
        "retryLabel": [1, "retry-label"]
    }]);
//# sourceMappingURL=async-view.js.map