import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopTaskItemStyle0 from "./ui-kit/molecules/task-item/task-item.css?tag=pop-task-item&encapsulation=scoped";
const PopTaskItem = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.taskChanged = __stencil_createEvent(this, "taskChanged", 7);
        this.taskChecked = __stencil_createEvent(this, "taskChecked", 7);
        this.taskDeleted = __stencil_createEvent(this, "taskDeleted", 7);
        this.taskDragHandleDown = __stencil_createEvent(this, "taskDragHandleDown", 7);
    }
    get el() { return this; }
    /** Firestore task document ID */
    taskId = '';
    /** Task title text */
    taskTitle = '';
    /** Task status */
    status = 'open';
    /** Priority: urgent, high, medium, low */
    priority = 'medium';
    /** ISO date string (YYYY-MM-DD) */
    dueDate = null;
    /** ISO timestamp — fire time of a reminder/timer. Shown as a time pill (⏰)
     *  when the task has no due date (a one-off transient nudge). */
    reminderAt = null;
    /** JSON stringified array of user UIDs */
    assignedTo = '[]';
    /** Whether the task is checked (derived from status === 'done') */
    checked = false;
    /** If true, disables title editing (contenteditable / long-press / dblclick).
     *  Does NOT disable the completion checkbox — see `checkable`. */
    readonly = false;
    /** Whether the completion checkbox can be toggled. Defaults to true so a
     *  list row stays `readonly` (title locked) yet still lets you tap to
     *  complete. Set false for a fully static render (e.g. read-only editor). */
    checkable = true;
    /** JSON stringified array of { id, displayName, photoURL } for avatar rendering */
    users = '[]';
    /** The logged-in user's id. Their own avatar is hidden (you don't need to see
     *  yourself on every task) — the assignee avatar only shows OTHER people. */
    currentUserId = '';
    /** Suppress the assignee avatar+name chip. Useful when the surrounding list is
     *  already grouped by person (e.g. the tasks-app Family view), where a per-row
     *  assignee chip would be redundant. */
    hideAssignee = false;
    /** Optional quest title — rendered as a small chip so you can see which
     *  quest a task belongs to (empty = no chip). */
    questLabel = '';
    /** JSON stringified array of tag strings — rendered as `#tag` chips in the
     *  meta row (empty array = no chips). */
    tags = '[]';
    /** Presentational thread label — a teal chip shown when a task is linked to a
     *  Bucket-Bot hub thread. Empty (default) hides it. Phase-1 hook only: the
     *  Share-to-Thread phase will populate this from the linked-thread field. */
    threadLabel = '';
    /** Whether to render the right-edge drag handle. The parent list gates this
     *  so handles only appear when a drag actually does something — i.e. when a
     *  grouping is active (drag-to-regroup) or the sort is Manual (drag-to-reorder).
     *  Defaults to true so standalone/legacy consumers keep the handle. */
    dragHandle = true;
    /** A task property was changed */
    taskChanged;
    /** Checkbox was toggled */
    taskChecked;
    /** Task was deleted */
    taskDeleted;
    /** The drag handle was pressed — the parent list starts a pointer drag. The
     *  pointer info lets the list build a ghost + track the move without the row
     *  itself owning any drag geometry. */
    taskDragHandleDown;
    isEditing = false;
    pressTimer = null;
    titleRef = null;
    get parsedUsers() {
        try {
            return JSON.parse(this.users);
        }
        catch {
            return [];
        }
    }
    get parsedAssignedTo() {
        try {
            return JSON.parse(this.assignedTo);
        }
        catch {
            return [];
        }
    }
    get parsedTags() {
        try {
            const arr = JSON.parse(this.tags);
            return Array.isArray(arr) ? arr.filter((t) => typeof t === 'string' && t) : [];
        }
        catch {
            return [];
        }
    }
    get isDone() {
        return this.status === 'done';
    }
    /** Parse the due date to a local Date, or null. Handles both a bare
     *  'YYYY-MM-DD' (local midnight) and a full ISO timestamp. */
    get dueDateObj() {
        if (!this.dueDate)
            return null;
        const raw = this.dueDate.includes('T') ? this.dueDate : this.dueDate + 'T00:00:00';
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
    }
    get isOverdue() {
        const d = this.dueDateObj;
        if (!d)
            return false;
        return d < new Date() && !this.isDone && !this.isToday;
    }
    /** True when the due date falls on today's calendar day. */
    get isToday() {
        const d = this.dueDateObj;
        if (!d)
            return false;
        return d.toDateString() === new Date().toDateString();
    }
    /** Priority → a modifier class for the coloured dot (urgent/high/med/low). */
    get priorityClass() {
        switch (this.priority) {
            case 'urgent': return 'task-item__pri--urgent';
            case 'high': return 'task-item__pri--high';
            case 'low': return 'task-item__pri--low';
            default: return 'task-item__pri--med';
        }
    }
    get formattedDate() {
        const d = this.dueDateObj;
        if (!d)
            return '';
        // Whole-day difference between the due day and today (ignores time-of-day).
        const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        const dayMs = 86400000;
        const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / dayMs);
        const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
        const time = hasTime
            ? ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined }).replace(':00', '')
            : '';
        if (diff === 0)
            return `Today${time}`;
        if (diff === 1)
            return `Tomorrow${time}`;
        if (diff === -1)
            return 'Yesterday';
        if (diff < -1)
            return `${-diff} days ago`;
        if (diff > 1 && diff < 7)
            return d.toLocaleDateString('en-US', { weekday: 'short' }) + time;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + time;
    }
    /** True when this row represents a reminder/timer with no due date. */
    get isReminder() {
        return !this.dueDate && !!this.reminderAt;
    }
    /** Reminder fire time — just the time if it's today, else date + time. */
    get formattedReminder() {
        if (!this.reminderAt)
            return '';
        const d = new Date(this.reminderAt);
        if (isNaN(d.getTime()))
            return '';
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const sameDay = d.toDateString() === new Date().toDateString();
        return sameDay
            ? time
            : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
    }
    handleCheckToggle = (e) => {
        if (!this.checkable)
            return;
        // The row is wrapped in a navigating <a>; keep a checkbox tap from also
        // bubbling up and opening the detail view.
        e?.stopPropagation();
        e?.preventDefault();
        const newChecked = !this.isDone;
        const newStatus = newChecked ? 'done' : 'open';
        this.checked = newChecked;
        this.status = newStatus;
        this.taskChecked.emit({ taskId: this.taskId, checked: newChecked });
        this.taskChanged.emit({ taskId: this.taskId, field: 'status', value: newStatus });
    };
    handleTitleBlur = () => {
        if (!this.titleRef)
            return;
        const newTitle = this.titleRef.textContent?.trim() || '';
        if (newTitle !== this.taskTitle) {
            this.taskTitle = newTitle;
            this.taskChanged.emit({ taskId: this.taskId, field: 'title', value: newTitle });
        }
        this.isEditing = false;
    };
    handleTitleKeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.titleRef?.blur();
        }
        if (e.key === 'Backspace' && !this.titleRef?.textContent?.trim()) {
            e.preventDefault();
            if (window.confirm('Delete this task?')) {
                this.taskDeleted.emit({ taskId: this.taskId });
            }
        }
    };
    /** Tap-hold (long-press) → enter edit mode. Single tap stays uncaptured
     *  so the parent row's onClick navigates normally. Cancels on
     *  pointer-up, leave, or cancel (sloppy press = no edit). Desktop users
     *  get the same affordance via double-click. */
    startPress = (e) => {
        if (this.readonly || this.isEditing)
            return;
        if (e.button !== undefined && e.button !== 0)
            return; // ignore right/middle
        this.cancelPress();
        this.pressTimer = window.setTimeout(() => {
            this.pressTimer = null;
            this.enterEditMode();
        }, 450);
    };
    cancelPress = () => {
        if (this.pressTimer !== null) {
            clearTimeout(this.pressTimer);
            this.pressTimer = null;
        }
    };
    handleTitleDblClick = (e) => {
        if (this.readonly || this.isEditing)
            return;
        e.preventDefault();
        e.stopPropagation();
        this.enterEditMode();
    };
    /** Drag handle pressed → hand off to the parent list (which owns bucket +
     *  map geometry). Stop propagation so the press doesn't also navigate / enter
     *  edit mode. */
    onHandleDown = (e) => {
        if (e.button !== undefined && e.button > 0)
            return;
        e.stopPropagation();
        e.preventDefault();
        this.taskDragHandleDown.emit({
            taskId: this.taskId,
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY,
        });
    };
    enterEditMode = () => {
        this.isEditing = true;
        requestAnimationFrame(() => {
            this.titleRef?.focus();
            const sel = window.getSelection();
            if (sel && this.titleRef) {
                const range = document.createRange();
                range.selectNodeContents(this.titleRef);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    };
    componentDidLoad() {
        // no-op
    }
    render() {
        const users = this.parsedUsers;
        // Only surface OTHER assignees — hide the avatar when the task is unassigned
        // or assigned (only) to the logged-in user.
        const assignedUsers = this.parsedAssignedTo.filter((uid) => uid && uid !== this.currentUserId);
        const tags = this.parsedTags;
        const hasMeta = !!this.dueDate || this.isReminder || !!this.questLabel || !!this.threadLabel ||
            tags.length > 0 || assignedUsers.length > 0;
        return (h("div", { key: '0', class: `task-item ${this.isDone ? 'task-item--done' : ''}` },
            h("button", { key: '1', type: "button", class: `task-item__check ${this.isDone ? 'task-item__check--on' : ''}`, onClick: (e) => this.handleCheckToggle(e), disabled: !this.checkable, "aria-label": this.isDone ? 'Mark incomplete' : 'Mark complete' },
                h("svg", { key: '2', width: "13", height: "13", viewBox: "0 0 24 24", fill: "none" },
                    h("path", { key: '3', d: "M20 6 9 17l-5-5", stroke: "#fff", "stroke-width": "3", "stroke-linecap": "round", "stroke-linejoin": "round" }))),
            h("span", { key: '4', class: `task-item__pri ${this.priorityClass}`, "aria-hidden": "true", title: `Priority: ${this.priority}` }),
            h("div", { key: '5', class: "task-item__body" },
                h("div", { key: '6', class: {
                        'task-item__title': true,
                        'task-item__title--done': this.isDone,
                        'task-item__title--editing': this.isEditing,
                    }, contentEditable: this.isEditing && !this.readonly, ref: el => this.titleRef = el, onBlur: this.handleTitleBlur, onKeyDown: this.handleTitleKeydown, onPointerDown: this.startPress, onPointerUp: this.cancelPress, onPointerCancel: this.cancelPress, onPointerLeave: this.cancelPress, onDblClick: this.handleTitleDblClick }, this.taskTitle),
                hasMeta && (h("div", { key: '7', class: "task-item__meta" },
                    this.dueDate && (h("span", { key: '8', class: {
                            'task-item__chip': true,
                            'task-item__chip--due': true,
                            'task-item__chip--overdue': this.isOverdue,
                            'task-item__chip--today': this.isToday && !this.isOverdue,
                        } },
                        h("svg", { key: '9', width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2" },
                            h("circle", { key: 'a', cx: "12", cy: "12", r: "9" }),
                            h("path", { key: 'b', d: "M12 7v5l3 2" })),
                        this.formattedDate)),
                    this.isReminder && (h("span", { key: 'c', class: "task-item__chip task-item__chip--reminder" },
                        h("svg", { key: 'd', width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" },
                            h("circle", { key: 'e', cx: "12", cy: "12", r: "9" }),
                            h("polyline", { key: 'f', points: "12 7 12 12 15 14" })),
                        this.formattedReminder)),
                    this.questLabel && (h("span", { key: 'g', class: "task-item__chip task-item__chip--quest", title: `Quest: ${this.questLabel}` },
                        h("svg", { key: 'h', width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linejoin": "round" },
                            h("path", { key: 'i', d: "m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 22.3 7 19.9l1-5.8L3.8 10l5.8-.8z" })),
                        h("span", { key: 'j', class: "task-item__chip-label" }, this.questLabel))),
                    this.threadLabel && (h("span", { key: 'k', class: "task-item__chip task-item__chip--thread", title: `Thread: ${this.threadLabel}` },
                        h("svg", { key: 'l', width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linejoin": "round" },
                            h("path", { key: 'm', d: "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z" })),
                        h("span", { key: 'n', class: "task-item__chip-label" }, this.threadLabel))),
                    tags.slice(0, 3).map((tag) => (h("span", { class: "task-item__chip task-item__chip--tag" }, tag))),
                    !this.hideAssignee && assignedUsers.length > 0 && (() => {
                        const uid = assignedUsers[0];
                        const user = users.find(u => u.id === uid);
                        // Prefer the resolved display name; if the uid has no roster
                        // entry, fall back to a short uid stub (not the word "Assignee").
                        const resolved = user?.displayName || user?.email || '';
                        const name = resolved || `${uid.slice(0, 6)}…`;
                        const initials = (resolved || uid).split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        const extra = assignedUsers.length - 1;
                        return (h("span", { class: "task-item__assignee" },
                            user?.photoURL
                                ? h("img", { class: "task-item__assignee-av", src: user.photoURL, alt: "" })
                                : h("span", { class: "task-item__assignee-av task-item__assignee-av--initials" }, initials),
                            h("span", { class: "task-item__assignee-name" },
                                name,
                                extra > 0 ? ` +${extra}` : '')));
                    })())),
                h("slot", { key: 'o', name: "actions" })),
            this.dragHandle && (h("button", { key: 'p', type: "button", class: "task-item__drag-handle", "aria-label": "Drag to move task", title: "Drag to move", onPointerDown: this.onHandleDown, onClick: (e) => { e.preventDefault(); e.stopPropagation(); } },
                h("svg", { key: 'q', width: "18", height: "18", viewBox: "0 0 512 512", fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "36", "aria-hidden": "true" },
                    h("line", { key: 'r', x1: "96", y1: "176", x2: "416", y2: "176" }),
                    h("line", { key: 's', x1: "96", y1: "256", x2: "416", y2: "256" }),
                    h("line", { key: 't', x1: "96", y1: "336", x2: "416", y2: "336" }))))));
    }
    static get style() { return PopTaskItemStyle0(); }
};
__stencil_defineCustomElement(PopTaskItem, [774, "pop-task-item", {
        "taskId": [1, "task-id"],
        "taskTitle": [1025, "task-title"],
        "status": [1025],
        "priority": [1025],
        "dueDate": [1025, "due-date"],
        "reminderAt": [1025, "reminder-at"],
        "assignedTo": [1025, "assigned-to"],
        "checked": [1028],
        "readonly": [4],
        "checkable": [4],
        "users": [1],
        "currentUserId": [1, "current-user-id"],
        "hideAssignee": [4, "hide-assignee"],
        "questLabel": [1, "quest-label"],
        "tags": [1],
        "threadLabel": [1, "thread-label"],
        "dragHandle": [4, "drag-handle"],
        "isEditing": [32]
    }]);
//# sourceMappingURL=task-item.js.map