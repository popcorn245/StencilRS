import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopImageCardStyle0 from "./ui-kit/organisms/image-card/image-card.css?tag=pop-image-card&encapsulation=scoped";
export const PopImageCard = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.cardSelect = __stencil_createEvent(this, "cardSelect", 7);
    }
    /** Image URL for the fallback <img> (ignored when the `media` slot is filled). */
    src = '';
    /** Alt text for the fallback <img>. */
    alt = '';
    /** Optional title rendered above the default slot content. */
    cardTitle;
    /** CSS aspect-ratio for the media wrapper (e.g. '1/1', '4/3', '16/9'). */
    aspect = '1/1';
    /** Whether the whole card is a button (emits `cardSelect` on click/Enter). */
    clickable = false;
    /** Optional id echoed back in the `cardSelect` event detail. */
    cardId = '';
    /** When set, the card renders as an <a href> instead of emitting. */
    href;
    /** Emitted when a `clickable` card is activated (click / Enter / Space). */
    cardSelect;
    onActivate = (ev) => {
        if (this.href)
            return; // the anchor handles navigation itself
        ev.preventDefault();
        this.cardSelect.emit(this.cardId);
    };
    render() {
        const media = (h("div", { class: "pic-media", style: { aspectRatio: this.aspect.replace('/', ' / ') } },
            h("slot", { name: "media" }, this.src && h("img", { class: "pic-img", src: this.src, alt: this.alt, loading: "lazy" }))));
        const body = [
            this.cardTitle && h("div", { class: "pic-title" }, this.cardTitle),
            h("div", { class: "pic-content" },
                h("slot", null)),
        ];
        const actions = (h("div", { class: "pic-actions" },
            h("slot", { name: "actions" })));
        const rootClass = { 'pic-root': true, 'pic-root--clickable': this.clickable };
        if (this.href) {
            return (h("a", { class: rootClass, href: this.href },
                media,
                body,
                actions));
        }
        if (this.clickable) {
            return (h("div", { class: rootClass, role: "button", tabIndex: 0, onClick: this.onActivate, onKeyDown: (e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                        this.onActivate(e);
                } },
                media,
                body,
                actions));
        }
        return (h("div", { class: rootClass },
            media,
            body,
            actions));
    }
};
PopImageCard.style = PopImageCardStyle0();
//# sourceMappingURL=image-card.js.map