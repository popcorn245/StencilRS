import { proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopLoadingStateStyle0 from "./ui-kit/molecules/loading-state/loading-state.css?tag=pop-loading-state&encapsulation=scoped";
export const LoadingState = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
    }
    /** `spinner` (default) or `card-skeleton`. */
    variant = 'spinner';
    /** Number of skeleton cards (card-skeleton variant). */
    count = 5;
    /** Tile the skeletons in a gallery grid instead of a single column. */
    grid = false;
    /** Visible / announced label. */
    label = 'Loading…';
    /** Show the label text next to the spinner (spinner variant). */
    showLabel = false;
    renderSkeletonCard = () => (h("div", { class: "ls-card", "aria-hidden": "true" },
        h("div", { class: "ls-card__head" },
            h("span", { class: "ls-bar ls-bar--title" }),
            h("span", { class: "ls-bar ls-bar--pin" })),
        h("span", { class: "ls-bar ls-bar--snippet" }),
        h("span", { class: "ls-bar ls-bar--snippet ls-bar--snippet-short" }),
        h("div", { class: "ls-card__meta" },
            h("span", { class: "ls-bar ls-bar--tag" }),
            h("span", { class: "ls-bar ls-bar--tag" }),
            h("span", { class: "ls-bar ls-bar--time" }))));
    render() {
        if (this.variant === 'card-skeleton') {
            return (h("div", { class: { 'ls': true, 'ls--skeleton': true, 'ls--grid': this.grid }, role: "status", "aria-busy": "true", "aria-label": this.label }, Array.from({ length: Math.max(1, this.count) }).map(this.renderSkeletonCard)));
        }
        return (h("div", { class: "ls ls--spinner", role: "status", "aria-busy": "true", "aria-label": this.label },
            h("span", { class: "ls-spinner", "aria-hidden": "true" }),
            this.showLabel && h("span", { class: "ls-label" }, this.label)));
    }
    static get style() { return PopLoadingStateStyle0(); }
};
__stencil_proxyCustomElement(LoadingState, [514, "pop-loading-state", {
        "variant": [1],
        "count": [2],
        "grid": [4],
        "label": [1],
        "showLabel": [4, "show-label"]
    }]);
//# sourceMappingURL=loading-state.js.map