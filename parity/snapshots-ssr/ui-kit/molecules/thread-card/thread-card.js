import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { CARD_FALLBACK_TEXT, readAssignees, readCard, visibleActions, } from './thread-card-types';
import PopThreadCardStyle0 from "./ui-kit/molecules/thread-card/thread-card.css?tag=pop-thread-card&encapsulation=scoped";
/**
 * pop-thread-card — the Thread Model v2 card WRAPPER.
 *
 * Every card renderer (`pop-thread-card-timer|task|list|showtimes`, and anything
 * added later) sits INSIDE this component. The wrapper owns the shared chrome:
 * the header, the assignee chips, the action row and the frozen treatment; the
 * renderer owns only the card's own face.
 *
 * The renderer is INJECTED as a tag name (`renderer="pop-thread-card-timer"`) so
 * ui-kit never needs a registry of card types — the host maps cardType → tag and
 * a MISS in that map simply yields no `renderer`. A missing tag, a tag outside
 * the `pop-*` namespace, or a payload too broken to read all degrade to the
 * fallback face (title + subtitle + "couldn't render this card"). The wrapper
 * must NEVER render blank.
 *
 * Props in, `popCardAction` out. No Firebase, no fetch, no Astro.
 */
export class PopThreadCard {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-thread-card",
        "$members$": {
            "cardType": [1, "card-type"],
            "payload": [8],
            "liveness": [8],
            "actions": [16],
            "assignees": [16],
            "readonly": [4],
            "renderer": [1]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=thread-card.js.map