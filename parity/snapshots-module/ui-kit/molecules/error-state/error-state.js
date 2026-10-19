import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopErrorStateStyle0 from "./ui-kit/molecules/error-state/error-state.css?tag=pop-error-state&encapsulation=scoped";
export const ErrorState = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popRetry = __stencil_createEvent(this, "popRetry", 7);
    }
    /** `pop-brand-icon` name for the illustration. */
    iconName = 'warning';
    heading = 'Something went wrong';
    message = '';
    /** `inline` (compact) or `full` (centered, min-height). */
    size = 'inline';
    /** Show a Retry button (emits `popRetry`). */
    retryable = false;
    /** Retry button label. */
    retryLabel = 'Try again';
    popRetry;
    render() {
        return (h("div", { key: '0', class: { 'err': true, [`err--${this.size}`]: true }, role: "alert" },
            h("div", { key: '1', class: "err-icon", "aria-hidden": "true" },
                h("pop-brand-icon", { key: '2', name: this.iconName })),
            this.heading && h("h3", { key: '3', class: "err-heading" }, this.heading),
            this.message && h("p", { key: '4', class: "err-message" }, this.message),
            this.retryable && (h("button", { key: '5', type: "button", class: "err-retry", onClick: () => this.popRetry.emit() }, this.retryLabel))));
    }
    static get style() { return PopErrorStateStyle0(); }
};
__stencil_proxyCustomElement(ErrorState, [514, "pop-error-state", {
        "iconName": [1, "icon-name"],
        "heading": [1],
        "message": [1],
        "size": [1],
        "retryable": [4],
        "retryLabel": [1, "retry-label"]
    }]);
//# sourceMappingURL=error-state.js.map