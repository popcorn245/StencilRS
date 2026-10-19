import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopErrorStateStyle0 from "./ui-kit/molecules/error-state/error-state.css?tag=pop-error-state&encapsulation=scoped";
/**
 * pop-error-state — the shared error primitive for the notes-app.
 *
 * A centered warning illustration (themeable `pop-brand-icon`) + heading +
 * message, with an optional **Retry** button that emits `popRetry`. Pages that
 * hand-rolled ad-hoc error markup route through this so every failure looks the
 * same. Announced with `role="alert"`.
 */
export class ErrorState {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-error-state",
        "$members$": {
            "iconName": [1, "icon-name"],
            "heading": [1],
            "message": [1],
            "size": [1],
            "retryable": [4],
            "retryLabel": [1, "retry-label"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=error-state.js.map