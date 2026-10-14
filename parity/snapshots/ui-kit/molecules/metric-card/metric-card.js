import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h, Host } from "@stencil/core/runtime/client/standalone";
import PopMetricCardStyle0 from "./ui-kit/molecules/metric-card/metric-card.css?tag=pop-metric-card&encapsulation=scoped";
const PopMetricCard = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popCardTap = __stencil_createEvent(this, "popCardTap", 7);
    }
    /** The emoji / glyph shown before the title (e.g. "⚖️"). Kept as a literal
     *  glyph by design — this is NOT a pop-icon slot. */
    glyph = '';
    /** The card title (e.g. "Weight"). */
    label = '';
    /** The big value (e.g. "150.7 lbs"). Rendered on one line where it fits. */
    value = '';
    /** Optional sub-line under the value (e.g. "Jul 15" or "of 2,000 goal"). */
    sub = '';
    /** Highlighted/pressed state — e.g. the card whose log form is open, or the
     *  one just logged. Rotates the "+" badge to a "✕". */
    active = false;
    /** Shows the tap-to-log affordance (the "+" badge + "Tap to log" hint). Off →
     *  the card is a plain (still tappable) stat tile. */
    loggable = false;
    /** Identity emitted with `popCardTap` so a host with many cards knows which
     *  one was tapped. Defaults to the label when unset. */
    cardKey = '';
    /** Fires when the card is tapped — detail is the card's `cardKey` (or label). */
    popCardTap;
    onTap = () => {
        this.popCardTap.emit(this.cardKey || this.label);
    };
    render() {
        return (h(Host, { key: '0' },
            h("button", { key: '1', type: "button", class: { mc: true, 'mc--on': this.active, 'mc--loggable': this.loggable }, "aria-pressed": this.loggable ? String(this.active) : undefined, onClick: this.onTap },
                this.loggable && (h("span", { key: '2', class: "mc__plus", "aria-hidden": "true" }, "+")),
                h("span", { key: '3', class: "mc__title" },
                    this.glyph && h("span", { key: '4', class: "mc__glyph" }, this.glyph),
                    h("span", { key: '5', class: "mc__label" }, this.label)),
                h("span", { key: '6', class: "mc__value" }, this.value),
                this.sub && h("span", { key: '7', class: "mc__sub" }, this.sub),
                this.loggable && (h("span", { key: '8', class: "mc__hint", "aria-hidden": "true" }, "Tap to log")))));
    }
    static get style() { return PopMetricCardStyle0(); }
};
__stencil_defineCustomElement(PopMetricCard, [514, "pop-metric-card", {
        "glyph": [1],
        "label": [1],
        "value": [1],
        "sub": [1],
        "active": [4],
        "loggable": [4],
        "cardKey": [1, "card-key"]
    }]);
//# sourceMappingURL=metric-card.js.map