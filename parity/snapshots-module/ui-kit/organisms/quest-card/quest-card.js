import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopQuestCardStyle0 from "./ui-kit/organisms/quest-card/quest-card.css?tag=pop-quest-card&encapsulation=scoped";
export const PopQuestCard = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.questSelect = __stencil_createEvent(this, "questSelect", 7);
    }
    /** Quest ID */
    questId = '';
    /** Display emoji for the quest */
    emoji = '🗺️';
    /** Quest title */
    heading = '';
    /** Status: active | paused | completed | archived */
    status = 'active';
    /** Has an associated research session (shows 🔬 badge) */
    hasResearch = false;
    /** Number of completed tasks */
    tasksCompleted = 0;
    /** Total number of tasks */
    tasksTotal = 0;
    /** Number of completed events (past events count as done) */
    eventsCompleted = 0;
    /** Total number of events */
    eventsTotal = 0;
    /** Optional priority: high | medium | low */
    priority = '';
    /** Emitted when the card is clicked */
    questSelect;
    get progress() {
        const total = this.tasksTotal + this.eventsTotal;
        if (total === 0)
            return 0;
        return (this.tasksCompleted + this.eventsCompleted) / total;
    }
    get progressPercent() {
        return Math.round(this.progress * 100);
    }
    get isComplete() {
        return this.status === 'completed';
    }
    get allTasksDone() {
        return this.tasksTotal > 0 && this.tasksCompleted >= this.tasksTotal
            && this.eventsCompleted >= this.eventsTotal;
    }
    render() {
        const pct = this.progressPercent;
        return (h("div", { key: '0', class: {
                'qc-root': true,
                [`qc-status--${this.status}`]: true,
                [`qc-priority--${this.priority}`]: !!this.priority,
                'qc-all-done': this.allTasksDone,
            }, role: "button", tabIndex: 0, onClick: () => this.questSelect.emit(this.questId), onKeyDown: (e) => e.key === 'Enter' && this.questSelect.emit(this.questId) },
            h("div", { key: '1', class: "qc-top" },
                h("span", { key: '2', class: "qc-emoji" }, this.emoji),
                h("div", { key: '3', class: "qc-badges" },
                    this.hasResearch && h("span", { key: '4', class: "qc-badge qc-badge--research", title: "Has research session" }, "\uD83D\uDD2C"),
                    this.priority === 'high' && h("span", { key: '5', class: "qc-badge qc-badge--priority", title: "High priority" }, "!"),
                    this.isComplete && h("span", { key: '6', class: "qc-badge qc-badge--done", title: "Completed" }, "\u2713"))),
            h("div", { key: '7', class: "qc-title" }, this.heading),
            (this.tasksTotal > 0 || this.eventsTotal > 0) && (h("div", { key: '8', class: "qc-progress-area" },
                h("div", { key: '9', class: "qc-progress-bar" },
                    h("div", { key: 'a', class: "qc-progress-fill", style: { width: `${pct}%` } })),
                h("div", { key: 'b', class: "qc-progress-label" },
                    this.allTasksDone ? (h("span", { class: "qc-all-done-label" }, "All done!")) : (h("span", null,
                        pct,
                        "%")),
                    h("span", { key: 'c', class: "qc-progress-detail" },
                        this.tasksCompleted,
                        "/",
                        this.tasksTotal,
                        " tasks",
                        this.eventsTotal > 0 && ` · ${this.eventsCompleted}/${this.eventsTotal} events`))))));
    }
    static get style() { return PopQuestCardStyle0(); }
};
__stencil_proxyCustomElement(PopQuestCard, [514, "pop-quest-card", {
        "questId": [1, "quest-id"],
        "emoji": [1],
        "heading": [1],
        "status": [1],
        "hasResearch": [4, "has-research"],
        "tasksCompleted": [2, "tasks-completed"],
        "tasksTotal": [2, "tasks-total"],
        "eventsCompleted": [2, "events-completed"],
        "eventsTotal": [2, "events-total"],
        "priority": [1]
    }]);
//# sourceMappingURL=quest-card.js.map