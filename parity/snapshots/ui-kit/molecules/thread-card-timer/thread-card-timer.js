import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { CARD_FALLBACK_TEXT, formatDuration, readCard, visibleActions, } from '../thread-card/thread-card-types';
import PopThreadCardTimerStyle0 from "./ui-kit/molecules/thread-card-timer/thread-card-timer.css?tag=pop-thread-card-timer&encapsulation=scoped";
const PopThreadCardTimer = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popCardAction = __stencil_createEvent(this, "popCardAction", 7);
    }
    /** The validated card payload object (set as a PROPERTY, not an attribute). */
    payload;
    /** `frozen` = historical snapshot: muted chrome, no mutating actions. */
    liveness = 'live';
    /** Viewer / public render — no action buttons at all. */
    readonly = false;
    /** Emitted when the user taps one of the card's actions. */
    popCardAction;
    /** Every action this card can offer, before liveness/readonly filtering. */
    static ACTIONS = [
        { actionId: 'snooze', label: 'Snooze', icon: 'alarm-outline', mutating: true },
        { actionId: 'plus5', label: 'Add 5 minutes', icon: 'add-circle-outline', mutating: true },
        { actionId: 'dismiss', label: 'Dismiss', icon: 'close-circle-outline', mutating: true },
    ];
    fire(action) {
        this.popCardAction.emit({ actionId: action.actionId, params: action.params });
    }
    renderActions(frozen) {
        const actions = visibleActions(PopThreadCardTimer.ACTIONS, frozen ? 'frozen' : 'live', this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tct__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tct__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        if (!card.ok) {
            return h("div", { class: "tct tct--broken" }, CARD_FALLBACK_TEXT);
        }
        const data = card.data;
        const fireAt = typeof data.fireAt === 'number' && Number.isFinite(data.fireAt) ? data.fireAt : 0;
        const mode = data.mode === 'reminder' ? 'reminder' : 'timer';
        const label = typeof data.label === 'string' && data.label.trim() ? data.label.trim() : '';
        const frozen = this.liveness === 'frozen';
        const heading = card.title || label || (mode === 'reminder' ? 'Reminder' : 'Timer');
        return (h("div", { class: { tct: true, 'tct--frozen': frozen } },
            h("div", { class: "tct__head" },
                h("ion-icon", { class: "tct__glyph", name: mode === 'reminder' ? 'notifications-outline' : 'timer-outline', "aria-hidden": "true" }),
                h("div", { class: "tct__titles" },
                    h("span", { class: "tct__title" }, heading),
                    card.subtitle && h("span", { class: "tct__subtitle" }, card.subtitle)),
                h("span", { class: "tct__mode" }, mode)),
            h("div", { class: "tct__face" }, frozen ? (h("span", { class: "tct__fired" },
                h("ion-icon", { name: "checkmark-done-outline", "aria-hidden": "true" }),
                "Timer fired",
                typeof data.durationMs === 'number' && (h("span", { class: "tct__duration" },
                    " \u00B7 ",
                    formatDuration(data.durationMs))))) : fireAt ? (h("pop-countdown", { deadline: fireAt, overdueText: "due" })) : (h("span", { class: "tct__idle" }, "No time set"))),
            card.assignees.length > 0 && (h("div", { class: "tct__people" }, card.assignees.map((p) => (h("span", { key: p.uid || p.displayName, class: "tct__chip" }, p.displayName))))),
            this.renderActions(frozen)));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tct tct--broken" }, CARD_FALLBACK_TEXT);
        }
    }
    static get style() { return PopThreadCardTimerStyle0(); }
};
__stencil_defineCustomElement(PopThreadCardTimer, [514, "pop-thread-card-timer", {
        "payload": [8],
        "liveness": [8],
        "readonly": [4]
    }]);
//# sourceMappingURL=thread-card-timer.js.map