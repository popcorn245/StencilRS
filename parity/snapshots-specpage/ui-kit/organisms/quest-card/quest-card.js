import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopQuestCard = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-quest-card",
        "componentClassName": "PopQuestCard",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "questId",
                "type": "string",
                "attribute": "quest-id",
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
                    "text": "Quest ID"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "emoji",
                "type": "string",
                "attribute": "emoji",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'\uD83D\uDDFA\uFE0F'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Display emoji for the quest"
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
                    "text": "Quest title"
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
                "defaultValue": "'active'",
                "complexType": {
                    "original": "'active' | 'paused' | 'completed' | 'archived'",
                    "resolved": "\"active\" | \"archived\" | \"completed\" | \"paused\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Status: active | paused | completed | archived"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "hasResearch",
                "type": "boolean",
                "attribute": "has-research",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "false",
                "complexType": {
                    "original": "boolean",
                    "resolved": "boolean",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Has an associated research session (shows \uD83D\uDD2C badge)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tasksCompleted",
                "type": "number",
                "attribute": "tasks-completed",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Number of completed tasks"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tasksTotal",
                "type": "number",
                "attribute": "tasks-total",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Total number of tasks"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "eventsCompleted",
                "type": "number",
                "attribute": "events-completed",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Number of completed events (past events count as done)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "eventsTotal",
                "type": "number",
                "attribute": "events-total",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "0",
                "complexType": {
                    "original": "number",
                    "resolved": "number",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Total number of events"
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
                "defaultValue": "''",
                "complexType": {
                    "original": "'high' | 'medium' | 'low' | ''",
                    "resolved": "\"\" | \"high\" | \"low\" | \"medium\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Optional priority: high | medium | low"
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
                "name": "questSelect",
                "method": "questSelect",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Emitted when the card is clicked"
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-QUEST-CARD",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/quest-card/quest-card.css",
                        "relativePath": "quest-card.css",
                        "originalComponentPath": "quest-card.css"
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
        "hasPropNumber": true,
        "hasPropBoolean": true,
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
        "htmlAttrNames": ["key", "class", "role", "tabIndex", "onClick", "onKeyDown", "title", "style"],
        "htmlTagNames": ["div", "span"],
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
//# sourceMappingURL=quest-card.js.map