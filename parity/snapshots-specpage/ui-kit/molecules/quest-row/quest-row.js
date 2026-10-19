import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopQuestRow = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-quest-row",
        "componentClassName": "PopQuestRow",
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
                    "text": "Quest document ID"
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
                "defaultValue": "''",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Quest emoji"
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
                    "text": "Quest title (named 'heading' to avoid conflict with HTML title attribute)"
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
                    "text": "Completed task count"
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
                    "text": "Total task count"
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
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Priority level"
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
                    "text": "Row tapped, navigate to quest detail"
                },
                "complexType": {
                    "original": "{ questId: string }",
                    "resolved": "{ questId: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-QUEST-ROW",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/molecules/quest-row/quest-row.css",
                        "relativePath": "quest-row.css",
                        "originalComponentPath": "quest-row.css"
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
        "htmlAttrNames": ["key", "class", "role", "tabIndex", "onClick", "onKeyDown", "style"],
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
//# sourceMappingURL=quest-row.js.map