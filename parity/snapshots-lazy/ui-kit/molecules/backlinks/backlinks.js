import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopBacklinksStyle0 from "./ui-kit/molecules/backlinks/backlinks.css?tag=pop-backlinks&encapsulation=scoped";
export const PopBacklinks = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.open = __stencil_createEvent(this, "open", 7);
    }
    /**
     * Backlink source notes. Accepts a BacklinkItem[] (set as a DOM property) or a
     * JSON string (so it can be used declaratively / in Storybook attributes).
     */
    items = [];
    /** Loading state — show skeleton rows while the query resolves. */
    loading = false;
    /** Emitted with the source note id when a backlink is activated. */
    open;
    parsed() {
        if (Array.isArray(this.items))
            return this.items;
        try {
            const v = JSON.parse(this.items || '[]');
            return Array.isArray(v) ? v : [];
        }
        catch {
            return [];
        }
    }
    render() {
        if (this.loading) {
            return (h("ul", { class: "bl bl--loading", "aria-busy": "true", "aria-label": "Loading backlinks" }, [0, 1, 2].map((i) => (h("li", { class: "bl__skeleton", key: i },
                h("span", { class: "bl__skeleton-title" }),
                h("span", { class: "bl__skeleton-snippet" }))))));
        }
        const items = this.parsed();
        if (!items.length) {
            return (h("p", { class: "bl__empty", role: "status" }, "No backlinks yet."));
        }
        return (h("ul", { class: "bl", "aria-label": "Linked references" }, items.map((it) => (h("li", { class: "bl__item", key: it.id },
            h("button", { type: "button", class: "bl__link", title: `Open “${it.title || 'Untitled'}”`, onClick: () => this.open.emit(it.id) },
                h("span", { class: "bl__icon", "aria-hidden": "true" },
                    h("pop-brand-icon", { name: "link" })),
                h("span", { class: "bl__body" },
                    h("span", { class: "bl__title" }, it.title || 'Untitled'),
                    it.snippet && h("span", { class: "bl__snippet" }, it.snippet))))))));
    }
};
PopBacklinks.style = PopBacklinksStyle0();
//# sourceMappingURL=backlinks.js.map