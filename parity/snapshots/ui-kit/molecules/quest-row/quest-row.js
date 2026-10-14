import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopQuestRowStyle0 from "./ui-kit/molecules/quest-row/quest-row.css?tag=pop-quest-row&encapsulation=scoped";
const PopQuestRow = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.questSelect = __stencil_createEvent(this, "questSelect", 7);
    }
    /** Quest document ID */
    questId = '';
    /** Quest emoji */
    emoji = '';
    /** Quest title (named 'heading' to avoid conflict with HTML title attribute) */
    heading = '';
    /** Completed task count */
    tasksCompleted = 0;
    /** Total task count */
    tasksTotal = 0;
    /** Priority level */
    priority = '';
    /** Row tapped, navigate to quest detail */
    questSelect;
    get progressPercent() {
        if (this.tasksTotal === 0)
            return 0;
        return Math.round((this.tasksCompleted / this.tasksTotal) * 100);
    }
    get priorityBorderColor() {
        switch (this.priority) {
            case 'high':
            case 'urgent':
                return '#ef4444';
            case 'medium':
                return '#f97316';
            default:
                return 'var(--pico-muted-border-color)';
        }
    }
    handleClick = () => {
        this.questSelect.emit({ questId: this.questId });
    };
    render() {
        const pct = this.progressPercent;
        return (h("div", { key: '0', class: "qr-root", role: "button", tabIndex: 0, onClick: this.handleClick, onKeyDown: (e) => e.key === 'Enter' && this.handleClick(), style: { borderLeftColor: this.priorityBorderColor } },
            h("span", { key: '1', class: "qr-emoji" }, this.emoji),
            h("span", { key: '2', class: "qr-title" }, this.heading),
            h("div", { key: '3', class: "qr-progress" },
                h("div", { key: '4', class: "qr-progress-bar" },
                    h("div", { key: '5', class: { 'qr-progress-fill': true, 'qr-progress-fill--done': pct === 100 }, style: { width: `${pct}%` } })),
                h("span", { key: '6', class: "qr-count" },
                    this.tasksCompleted,
                    "/",
                    this.tasksTotal))));
    }
    static get style() { return PopQuestRowStyle0(); }
};
__stencil_defineCustomElement(PopQuestRow, [514, "pop-quest-row", {
        "questId": [1, "quest-id"],
        "emoji": [1],
        "heading": [1],
        "tasksCompleted": [2, "tasks-completed"],
        "tasksTotal": [2, "tasks-total"],
        "priority": [1]
    }]);
//# sourceMappingURL=quest-row.js.map