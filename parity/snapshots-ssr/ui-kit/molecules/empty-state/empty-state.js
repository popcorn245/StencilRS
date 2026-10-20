import { registerInstance as __stencil_registerInstance } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import PopEmptyStateStyle0 from "./ui-kit/molecules/empty-state/empty-state.css?tag=pop-empty-state&encapsulation=scoped";
export class EmptyState {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
    }
    /**
     * A `pop-brand-icon` name (preferred — a themeable SVG). When set it renders
     * the vector icon; falls back to the legacy `icon` glyph string otherwise.
     */
    iconName;
    /** Legacy: a literal glyph/emoji. Prefer `iconName`. */
    icon;
    heading;
    message;
    size = 'inline';
    render() {
        return (h("div", { key: '0', class: { 'es': true, [`es--${this.size}`]: true }, role: "status" },
            this.iconName ? (h("div", { class: "es-icon es-icon--vector", "aria-hidden": "true" },
                h("pop-brand-icon", { name: this.iconName }))) : (this.icon && h("div", { class: "es-icon", "aria-hidden": "true" }, this.icon)),
            this.heading && h("h3", { key: '1', class: "es-heading" }, this.heading),
            this.message && h("p", { key: '2', class: "es-message" }, this.message),
            h("div", { key: '3', class: "es-action" },
                h("slot", { key: '4', name: "action" }))));
    }
    static get style() { return PopEmptyStateStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 774,
        "$tagName$": "pop-empty-state",
        "$members$": {
            "iconName": [1, "icon-name"],
            "icon": [1],
            "heading": [1],
            "message": [1],
            "size": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=empty-state.js.map