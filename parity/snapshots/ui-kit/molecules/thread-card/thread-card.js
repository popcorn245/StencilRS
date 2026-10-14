import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { CARD_FALLBACK_TEXT, readAssignees, readCard, visibleActions, } from './thread-card-types';
import PopThreadCardStyle0 from "./ui-kit/molecules/thread-card/thread-card.css?tag=pop-thread-card&encapsulation=scoped";
const PopThreadCard = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popCardAction = __stencil_createEvent(this, "popCardAction", 7);
    }
    /** The card's type key (`timer`, `task`, …). Shown as the chrome's type label. */
    cardType = '';
    /**
     * The validated card payload object (set as a PROPERTY, not an attribute).
     * Optional on purpose: a missing or broken payload is a supported state that
     * renders the fallback face, so hosts never have to pre-validate.
     */
    payload;
    /** `frozen` = historical snapshot: muted chrome, mutating actions dropped. */
    liveness = 'live';
    /** Wrapper-level actions, before liveness/readonly filtering. */
    actions = [];
    /** People the card is assigned to; falls back to `payload.assignees`. */
    assignees = [];
    /** Viewer / public render — no action buttons at all. */
    readonly = false;
    /** The `pop-*` tag to mount inside. Unknown/missing ⇒ fallback face. */
    renderer;
    /**
     * Emitted when one of the WRAPPER's actions is tapped.
     *
     * The inner renderer emits its own `popCardAction` with
     * `{ composed: true, bubbles: true }`, so renderer actions reach the same
     * listener by natural propagation — the wrapper deliberately does not
     * intercept and re-dispatch them, which would double-fire every action.
     */
    popCardAction;
    /** Only a real custom-element tag in our namespace may be mounted. */
    rendererTag() {
        const tag = typeof this.renderer === 'string' ? this.renderer.trim().toLowerCase() : '';
        return /^pop-[a-z0-9-]+$/.test(tag) ? tag : '';
    }
    /** Push the object props onto the dynamically-created renderer element. */
    hydrate = (el) => {
        if (!el)
            return;
        const target = el;
        target.payload = this.payload;
        target.liveness = this.liveness;
        target.readonly = this.readonly;
    };
    fire(action) {
        this.popCardAction.emit({ actionId: action.actionId, params: action.params });
    }
    renderChips(people) {
        if (!people.length)
            return null;
        return (h("div", { class: "tcw__people" }, people.map((p) => (h("span", { key: p.uid || p.displayName, class: "tcw__chip" }, p.displayName)))));
    }
    renderActions() {
        const actions = visibleActions(Array.isArray(this.actions) ? this.actions : [], this.liveness, this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tcw__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tcw__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        const frozen = this.liveness === 'frozen';
        const tag = this.rendererTag();
        const people = readAssignees(this.assignees).length
            ? readAssignees(this.assignees)
            : card.assignees;
        const Renderer = tag;
        return (h("div", { class: { tcw: true, 'tcw--frozen': frozen, 'tcw--readonly': this.readonly } },
            h("div", { class: "tcw__head" },
                h("div", { class: "tcw__titles" },
                    h("span", { class: "tcw__title" }, card.title || 'Card'),
                    card.subtitle && h("span", { class: "tcw__subtitle" }, card.subtitle)),
                this.cardType && h("span", { class: "tcw__type" }, this.cardType),
                frozen && (h("span", { class: "tcw__frozen", title: "Historical snapshot" },
                    h("ion-icon", { name: "snow-outline", "aria-hidden": "true" }),
                    "frozen"))),
            h("div", { class: "tcw__body" }, tag && card.ok ? (h(Renderer, { class: "tcw__renderer", ref: this.hydrate })) : (h("p", { class: "tcw__fallback" }, CARD_FALLBACK_TEXT))),
            this.renderChips(people),
            this.renderActions()));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tcw tcw--broken" }, CARD_FALLBACK_TEXT);
        }
    }
    static get style() { return PopThreadCardStyle0(); }
};
__stencil_defineCustomElement(PopThreadCard, [514, "pop-thread-card", {
        "cardType": [1, "card-type"],
        "payload": [8],
        "liveness": [8],
        "actions": [16],
        "assignees": [16],
        "readonly": [4],
        "renderer": [1]
    }]);
//# sourceMappingURL=thread-card.js.map