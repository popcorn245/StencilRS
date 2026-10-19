import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { CARD_FALLBACK_TEXT, readCard, visibleActions, } from '../thread-card/thread-card-types';
import PopThreadCardTaskStyle0 from "./ui-kit/molecules/thread-card-task/thread-card-task.css?tag=pop-thread-card-task&encapsulation=scoped";
export const PopThreadCardTask = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    actionsFor(taskId) {
        const params = taskId ? { taskId } : undefined;
        return [
            { actionId: 'complete', label: 'Complete', icon: 'checkmark-circle-outline', mutating: true, params },
            { actionId: 'reassign', label: 'Reassign', icon: 'people-outline', mutating: true, params },
            { actionId: 'open', label: 'Open in Tasks', icon: 'open-outline', mutating: false, params },
        ];
    }
    fire(action) {
        this.popCardAction.emit({ actionId: action.actionId, params: action.params });
    }
    /** "Aug 3" / the raw string when it isn't parseable. Never throws. */
    static due(raw) {
        if (typeof raw !== 'string' || !raw.trim())
            return '';
        const ms = Date.parse(raw);
        if (Number.isNaN(ms))
            return raw.trim();
        return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    renderActions(frozen, taskId) {
        const actions = visibleActions(this.actionsFor(taskId), frozen ? 'frozen' : 'live', this.readonly);
        if (!actions.length)
            return null;
        return (h("div", { class: "tcta__actions" }, actions.map((a) => (h("button", { key: a.actionId, class: "pop-iconbtn tcta__btn", type: "button", title: a.label, "aria-label": a.label, onClick: () => this.fire(a) },
            h("ion-icon", { name: a.icon, "aria-hidden": "true" }))))));
    }
    renderCard() {
        const card = readCard(this.payload);
        if (!card.ok) {
            return h("div", { class: "tcta tcta--broken" }, CARD_FALLBACK_TEXT);
        }
        const data = card.data;
        const taskId = typeof data.taskId === 'string' ? data.taskId : '';
        const status = typeof data.status === 'string' ? data.status : '';
        const priority = typeof data.priority === 'string' && data.priority.trim() ? data.priority.trim() : '';
        const quest = typeof data.questTitle === 'string' && data.questTitle.trim() ? data.questTitle.trim() : '';
        const due = PopThreadCardTask.due(data.dueDate);
        const frozen = this.liveness === 'frozen';
        const title = card.title || 'Untitled task';
        return (h("div", { class: { tcta: true, 'tcta--frozen': frozen } },
            h("div", { class: "tcta__head" },
                h("ion-icon", { class: "tcta__glyph", name: frozen ? 'checkmark-circle' : 'ellipse-outline', "aria-hidden": "true" }),
                h("div", { class: "tcta__titles" },
                    h("span", { class: "tcta__title" }, title),
                    (card.subtitle || quest) && h("span", { class: "tcta__subtitle" }, card.subtitle || quest))),
            h("div", { class: "tcta__meta" },
                due && (h("span", { class: "tcta__chip tcta__chip--due" },
                    h("ion-icon", { name: "calendar-outline", "aria-hidden": "true" }),
                    due)),
                priority && h("span", { class: "tcta__chip tcta__chip--priority" }, priority),
                status && h("span", { class: "tcta__chip tcta__chip--status" }, status),
                card.assignees.map((p) => (h("span", { key: p.uid || p.displayName, class: "tcta__chip tcta__chip--person" }, p.displayName)))),
            this.renderActions(frozen, taskId)));
    }
    render() {
        // A single broken card must never blank the timeline it lives in.
        try {
            return this.renderCard();
        }
        catch {
            return h("div", { class: "tcta tcta--broken" }, CARD_FALLBACK_TEXT);
        }
    }
};
PopThreadCardTask.style = PopThreadCardTaskStyle0();
//# sourceMappingURL=thread-card-task.js.map