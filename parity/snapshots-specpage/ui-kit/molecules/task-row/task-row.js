import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopTaskRow = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-task-row",
        "componentClassName": "PopTaskRow",
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
                    "text": "Task title (named 'heading' to avoid conflict with HTML title attribute)"
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
                    "text": "One of: open, in_progress, review, done, blocked, skipped, cancelled"
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
                    "text": "One of: urgent, high, medium, low"
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
                    "text": "ISO date string"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "questEmoji",
                "type": "string",
                "attribute": "quest-emoji",
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
                    "text": "Emoji of parent quest (displayed as chip)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "questTitle",
                "type": "string",
                "attribute": "quest-title",
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
                    "text": "Title of parent quest"
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
                "name": "error",
                "type": "string",
                "attribute": "error",
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
                    "text": "Inline error message to display"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "taskToggle",
                "method": "taskToggle",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Checkbox toggled (open<->done)"
                },
                "complexType": {
                    "original": "{ taskId: string; newStatus: string }",
                    "resolved": "{ taskId: string; newStatus: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "taskSelect",
                "method": "taskSelect",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Row tapped \u2014 for future right-pane integration"
                },
                "complexType": {
                    "original": "{ taskId: string }",
                    "resolved": "{ taskId: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "taskMenu",
                "method": "taskMenu",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Ellipsis menu button tapped"
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
                "styleId": "POP-TASK-ROW",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/task-row/task-row.css",
                        "relativePath": "task-row.css",
                        "originalComponentPath": "task-row.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": false,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": false,
        "hasComponentDidUpdateFn": false,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": false,
        "hasElement": false,
        "hasEvent": true,
        "hasLifecycle": false,
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
        "hasState": false,
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
        "htmlAttrNames": ["key", "class", "onClick", "type", "aria-label", "width", "height", "viewBox", "fill", "cx", "cy", "r", "d", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "title", "style"],
        "htmlTagNames": ["div", "button", "svg", "circle", "path", "span"],
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
//# sourceMappingURL=task-row.js.map