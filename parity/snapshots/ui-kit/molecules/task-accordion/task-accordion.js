import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopTaskAccordionStyle0 from "./ui-kit/molecules/task-accordion/task-accordion.css?tag=pop-task-accordion&encapsulation=scoped";
const STATUS_OPTIONS = [
    { value: 'open', label: 'Open', color: '#9ca3af' },
    { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
    { value: 'review', label: 'Review', color: '#8b5cf6' },
    { value: 'done', label: 'Done', color: '#22c55e' },
    { value: 'blocked', label: 'Blocked', color: '#ef4444' },
    { value: 'skipped', label: 'Skipped', color: '#eab308' },
    { value: 'cancelled', label: 'Cancelled', color: '#6b7280' },
];
const PRIORITY_OPTIONS = [
    { value: 'urgent', label: 'Urgent', color: '#ef4444' },
    { value: 'high', label: 'High', color: '#f97316' },
    { value: 'medium', label: 'Medium', color: '#3b82f6' },
    { value: 'low', label: 'Low', color: '#9ca3af' },
];
const PopTaskAccordion = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.taskUpdate = __stencil_createEvent(this, "taskUpdate", 7);
        this.taskDelete = __stencil_createEvent(this, "taskDelete", 7);
    }
    /** Task document ID */
    taskId = '';
    /** Current title (named 'heading' to avoid conflict with HTML title attribute) */
    heading = '';
    /** Current status */
    status = 'open';
    /** Current priority */
    priority = 'medium';
    /** ISO date */
    dueDate = null;
    /** Current quest ID */
    questId = null;
    /** JSON array of {id, emoji, title} for quest picker */
    quests = '[]';
    /** JSON array of assignee UIDs */
    assignedTo = '[]';
    /** JSON array of {uid, name} for assignee picker */
    members = '[]';
    /** Linked note ID */
    noteId = null;
    /** Any field changed (auto-save trigger) */
    taskUpdate;
    /** Delete button pressed */
    taskDelete;
    localTitle = '';
    parsedQuests = [];
    parsedMembers = [];
    parsedAssignedTo = [];
    componentWillLoad() {
        this.localTitle = this.heading;
        this.parseProps();
    }
    componentWillUpdate() {
        this.parseProps();
    }
    parseProps() {
        try {
            this.parsedQuests = JSON.parse(this.quests);
        }
        catch {
            this.parsedQuests = [];
        }
        try {
            this.parsedMembers = JSON.parse(this.members);
        }
        catch {
            this.parsedMembers = [];
        }
        try {
            this.parsedAssignedTo = JSON.parse(this.assignedTo);
        }
        catch {
            this.parsedAssignedTo = [];
        }
    }
    emitUpdate(field, value) {
        this.taskUpdate.emit({ taskId: this.taskId, field, value });
    }
    handleTitleBlur = () => {
        const trimmed = this.localTitle.trim();
        if (trimmed && trimmed !== this.heading) {
            this.emitUpdate('title', trimmed);
        }
    };
    handleStatusClick = (value) => {
        if (value !== this.status) {
            this.emitUpdate('status', value);
        }
    };
    handlePriorityClick = (value) => {
        if (value !== this.priority) {
            this.emitUpdate('priority', value);
        }
    };
    handleDueDateChange = (e) => {
        const val = e.target.value || null;
        this.emitUpdate('dueDate', val);
    };
    handleQuestChange = (e) => {
        const val = e.target.value || null;
        this.emitUpdate('questId', val);
    };
    handleAssigneeToggle = (uid) => {
        const current = [...this.parsedAssignedTo];
        const idx = current.indexOf(uid);
        if (idx >= 0) {
            current.splice(idx, 1);
        }
        else {
            current.push(uid);
        }
        this.emitUpdate('assignedTo', current);
    };
    handleDelete = () => {
        this.taskDelete.emit({ taskId: this.taskId });
    };
    render() {
        return (h("div", { key: '0', class: "ta-root" },
            h("div", { key: '1', class: "ta-field" },
                h("label", { key: '2', class: "ta-label" }, "Title"),
                h("input", { key: '3', type: "text", class: "ta-input", value: this.localTitle, onInput: (e) => { this.localTitle = e.target.value; }, onBlur: this.handleTitleBlur })),
            h("div", { key: '4', class: "ta-field" },
                h("label", { key: '5', class: "ta-label" }, "Status"),
                h("div", { key: '6', class: "ta-chips" }, STATUS_OPTIONS.map(opt => (h("button", { type: "button", class: { 'ta-chip': true, 'ta-chip--active': this.status === opt.value }, style: { '--chip-color': opt.color }, onClick: () => this.handleStatusClick(opt.value) }, opt.label))))),
            h("div", { key: '7', class: "ta-field" },
                h("label", { key: '8', class: "ta-label" }, "Priority"),
                h("div", { key: '9', class: "ta-chips" }, PRIORITY_OPTIONS.map(opt => (h("button", { type: "button", class: { 'ta-chip': true, 'ta-chip--active': this.priority === opt.value }, style: { '--chip-color': opt.color }, onClick: () => this.handlePriorityClick(opt.value) }, opt.label))))),
            h("div", { key: 'a', class: "ta-field" },
                h("label", { key: 'b', class: "ta-label" }, "Due date"),
                h("input", { key: 'c', type: "date", class: "ta-input", value: this.dueDate || '', onChange: this.handleDueDateChange })),
            this.parsedQuests.length > 0 && (h("div", { key: 'd', class: "ta-field" },
                h("label", { key: 'e', class: "ta-label" }, "Quest"),
                h("select", { key: 'f', class: "ta-input", onChange: this.handleQuestChange },
                    h("option", { key: 'g', value: "", selected: !this.questId }, "Inbox (no quest)"),
                    this.parsedQuests.map(q => (h("option", { value: q.id, selected: this.questId === q.id },
                        q.emoji,
                        " ",
                        q.title)))))),
            this.parsedMembers.length > 0 && (h("div", { key: 'h', class: "ta-field" },
                h("label", { key: 'i', class: "ta-label" }, "Assignee"),
                h("div", { key: 'j', class: "ta-assignees" }, this.parsedMembers.map(m => (h("label", { class: "ta-assignee-option" },
                    h("input", { type: "checkbox", checked: this.parsedAssignedTo.includes(m.uid), onChange: () => this.handleAssigneeToggle(m.uid) }),
                    h("span", null, m.name))))))),
            h("div", { key: 'k', class: "ta-field" },
                h("label", { key: 'l', class: "ta-label" }, "Note"),
                this.noteId ? (h("a", { href: `/notes/${this.noteId}`, class: "ta-note-link" }, "View linked note")) : (h("span", { class: "ta-note-empty" }, "No note linked"))),
            h("button", { key: 'm', type: "button", class: "ta-delete-btn", onClick: this.handleDelete }, "Delete Task")));
    }
    static get style() { return PopTaskAccordionStyle0(); }
};
__stencil_defineCustomElement(PopTaskAccordion, [514, "pop-task-accordion", {
        "taskId": [1, "task-id"],
        "heading": [1],
        "status": [1],
        "priority": [1],
        "dueDate": [1, "due-date"],
        "questId": [1, "quest-id"],
        "quests": [1],
        "assignedTo": [1, "assigned-to"],
        "members": [1],
        "noteId": [1, "note-id"],
        "localTitle": [32]
    }]);
//# sourceMappingURL=task-accordion.js.map