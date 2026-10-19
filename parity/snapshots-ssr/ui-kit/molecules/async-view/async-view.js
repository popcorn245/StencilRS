import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { Host, h } from "@stencil/core/runtime/server";
import PopAsyncViewStyle0 from "./ui-kit/molecules/async-view/async-view.css?tag=pop-async-view&encapsulation=scoped";
/**
 * pop-async-view — declarative loading / empty / error / content states for any
 * data-backed region (molecule).
 *
 * Pairs with `pop-sync-status`: sync-status shows FRESHNESS (last synced /
 * revalidating / stale), this shows LIFECYCLE (is there anything to render at
 * all). Composes the existing state primitives (`pop-loading-state`,
 * `pop-empty-state`, `pop-error-state`) for its defaults; each state slot can
 * be overridden.
 *
 *   <pop-async-view state={view} onPopRetry={() => data.refresh()}>
 *     …content…
 *     <div slot="loading">custom skeleton</div>   <!-- optional -->
 *   </pop-async-view>
 *
 * Consumer rule (the hub cache philosophy): content stays MOUNTED during
 * revalidation — `state="loading"` is for the COLD hydrate only. All four
 * regions stay in the DOM (visibility toggled by CSS) so slotted content is
 * never torn down by a state flip.
 *
 * AsyncData mapping: status 'loading' with no data → "loading"; error with no
 * data → "error" (retry → refresh()); data present → "content"; empty result →
 * "empty" (the consumer decides emptiness).
 */
export class PopAsyncView {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-async-view",
        "$members$": {
            "state": [1],
            "emptyLabel": [1, "empty-label"],
            "errorLabel": [1, "error-label"],
            "retryLabel": [1, "retry-label"]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=async-view.js.map