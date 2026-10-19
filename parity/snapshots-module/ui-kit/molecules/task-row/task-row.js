import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopTaskRowStyle0 from "./ui-kit/molecules/task-row/task-row.css?tag=pop-task-row&encapsulation=scoped";
export const PopTaskRow = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.taskToggle = __stencil_createEvent(this, "taskToggle", 7);
        this.taskSelect = __stencil_createEvent(this, "taskSelect", 7);
        this.taskMenu = __stencil_createEvent(this, "taskMenu", 7);
    }
    /** Task document ID */
    taskId = '';
    /** Task title (named 'heading' to avoid conflict with HTML title attribute) */
    heading = '';
    /** One of: open, in_progress, review, done, blocked, skipped, cancelled */
    status = 'open';
    /** One of: urgent, high, medium, low */
    priority = 'medium';
    /** ISO date string */
    dueDate = null;
    /** Emoji of parent quest (displayed as chip) */
    questEmoji = null;
    /** Title of parent quest */
    questTitle = null;
    /** JSON array of assignee UIDs */
    assignedTo = '[]';
    /** Inline error message to display */
    error = null;
    /** Checkbox toggled (open<->done) */
    taskToggle;
    /** Row tapped — for future right-pane integration */
    taskSelect;
    /** Ellipsis menu button tapped */
    taskMenu;
    get isDone() {
        return this.status === 'done' || this.status === 'cancelled' || this.status === 'skipped';
    }
    get isOverdue() {
        if (!this.dueDate)
            return false;
        const due = new Date(this.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today && !this.isDone;
    }
    get dueDateLabel() {
        if (!this.dueDate)
            return null;
        const d = new Date(this.dueDate);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    get priorityColor() {
        switch (this.priority) {
            case 'urgent': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#3b82f6';
            case 'low': return '#9ca3af';
            default: return '#9ca3af';
        }
    }
    handleCheckClick = (e) => {
        e.stopPropagation();
        const newStatus = this.isDone ? 'open' : 'done';
        this.taskToggle.emit({ taskId: this.taskId, newStatus });
    };
    handleRowClick = () => {
        this.taskSelect.emit({ taskId: this.taskId });
    };
    handleMenuClick = (e) => {
        e.stopPropagation();
        this.taskMenu.emit({ taskId: this.taskId });
    };
    render() {
        return (h("div", { key: '0', class: {
                'tr-root': true,
                'tr-done': this.isDone,
                'tr-overdue': this.isOverdue,
                'tr-error': !!this.error,
            } },
            h("div", { key: '1', class: "tr-row", onClick: this.handleRowClick },
                h("button", { key: '2', class: { 'tr-check': true, 'tr-check--done': this.isDone }, type: "button", onClick: this.handleCheckClick, "aria-label": this.isDone ? 'Mark incomplete' : 'Mark complete' }, this.isDone ? (h("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "currentColor" },
                    h("circle", { cx: "12", cy: "12", r: "10" }),
                    h("path", { d: "M9 12l2 2 4-4", stroke: "#fff", "stroke-width": "2", fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }))) : (h("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2" },
                    h("circle", { cx: "12", cy: "12", r: "10" })))),
                h("span", { key: '3', class: { 'tr-title': true, 'tr-title--done': this.isDone } }, this.heading),
                this.questEmoji && (h("span", { key: '4', class: "tr-quest-chip", title: this.questTitle || '' },
                    this.questEmoji,
                    this.questTitle && h("span", { key: '5', class: "tr-quest-label" }, this.questTitle))),
                h("span", { key: '6', class: "tr-priority-dot", style: { background: this.priorityColor }, title: this.priority }),
                this.dueDateLabel && (h("span", { key: '7', class: { 'tr-due': true, 'tr-due--overdue': this.isOverdue } }, this.dueDateLabel)),
                h("button", { key: '8', class: "tr-menu-btn", type: "button", onClick: this.handleMenuClick, "aria-label": "Task menu" },
                    h("svg", { key: '9', width: "16", height: "16", viewBox: "0 0 512 512", fill: "currentColor" },
                        h("circle", { key: 'a', cx: "256", cy: "96", r: "32" }),
                        h("circle", { key: 'b', cx: "256", cy: "256", r: "32" }),
                        h("circle", { key: 'c', cx: "256", cy: "416", r: "32" })))),
            this.error && (h("div", { key: 'd', class: "tr-error-msg" }, this.error))));
    }
    static get style() { return PopTaskRowStyle0(); }
};
__stencil_proxyCustomElement(PopTaskRow, [514, "pop-task-row", {
        "taskId": [1, "task-id"],
        "heading": [1],
        "status": [1],
        "priority": [1],
        "dueDate": [1, "due-date"],
        "questEmoji": [1, "quest-emoji"],
        "questTitle": [1, "quest-title"],
        "assignedTo": [1, "assigned-to"],
        "error": [1]
    }]);
//# sourceMappingURL=task-row.js.map