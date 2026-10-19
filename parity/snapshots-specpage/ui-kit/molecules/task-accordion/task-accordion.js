import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
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
export const PopTaskAccordion = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-task-accordion",
        "componentClassName": "PopTaskAccordion",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "taskId",
                "type": "string",
                "attribute": "task-id",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Task document ID"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "heading",
                "type": "string",
                "attribute": "heading",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current title (named 'heading' to avoid conflict with HTML title attribute)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "status",
                "type": "string",
                "attribute": "status",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'open'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current status"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "priority",
                "type": "string",
                "attribute": "priority",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'medium'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current priority"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "dueDate",
                "type": "string",
                "attribute": "due-date",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "null",
                "complexType": {
                    "original": "string | null",
                    "resolved": "null | string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "ISO date"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "questId",
                "type": "string",
                "attribute": "quest-id",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "null",
                "complexType": {
                    "original": "string | null",
                    "resolved": "null | string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Current quest ID"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "quests",
                "type": "string",
                "attribute": "quests",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array of {id, emoji, title} for quest picker"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "assignedTo",
                "type": "string",
                "attribute": "assigned-to",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array of assignee UIDs"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "members",
                "type": "string",
                "attribute": "members",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'[]'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "JSON array of {uid, name} for assignee picker"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "noteId",
                "type": "string",
                "attribute": "note-id",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "null",
                "complexType": {
                    "original": "string | null",
                    "resolved": "null | string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Linked note ID"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "localTitle"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "taskUpdate",
                "method": "taskUpdate",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Any field changed (auto-save trigger)"
                },
                "complexType": {
                    "original": "{ taskId: string; field: string; value: any }",
                    "resolved": "{ taskId: string; field: string; value: any; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "taskDelete",
                "method": "taskDelete",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Delete button pressed"
                },
                "complexType": {
                    "original": "{ taskId: string }",
                    "resolved": "{ taskId: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-TASK-ACCORDION",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/task-accordion/task-accordion.css",
                        "relativePath": "task-accordion.css",
                        "originalComponentPath": "task-accordion.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": true,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": true,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": true,
        "hasListener": false,
        "hasListenerTarget": false,
        "hasListenerTargetWindow": false,
        "hasListenerTargetDocument": false,
        "hasListenerTargetBody": false,
        "hasMember": true,
        "hasMethod": false,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": false,
        "hasPropBoolean": false,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": true,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": false,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "type", "value", "onInput", "onBlur", "style", "onClick", "onChange", "selected", "checked", "href"],
        "htmlTagNames": ["div", "label", "input", "button", "select", "option", "span", "a"],
        "htmlParts": [],
        "htmlSlots": [],
        "isUpdateable": true,
        "dependents": [],
        "directDependents": [],
        "directDependencies": [],
        "hasPatchAll": false,
        "hasPatchChildren": false,
        "hasPatchClone": false,
        "hasPatchInsert": false
    }; }
};
//# sourceMappingURL=task-accordion.js.map