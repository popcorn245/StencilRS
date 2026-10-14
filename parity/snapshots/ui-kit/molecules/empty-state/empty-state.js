import { transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopEmptyStateStyle0 from "./ui-kit/molecules/empty-state/empty-state.css?tag=pop-empty-state&encapsulation=scoped";
const EmptyState = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
};
__stencil_defineCustomElement(EmptyState, [774, "pop-empty-state", {
        "iconName": [1, "icon-name"],
        "icon": [1],
        "heading": [1],
        "message": [1],
        "size": [1]
    }]);
//# sourceMappingURL=empty-state.js.map