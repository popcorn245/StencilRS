import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopCafeteriaPanel = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.actionSelected = __stencil_createEvent(this, "actionSelected", 7);
        this.contextSubmitted = __stencil_createEvent(this, "contextSubmitted", 7);
        this.panelToggled = __stencil_createEvent(this, "panelToggled", 7);
        this.cycleNpc = __stencil_createEvent(this, "cycleNpc", 7);
    }
    /** One-liner summary of the active NPC's request */
    summary = '';
    /** Full paragraph description */
    paragraph = '';
    /** NPC agent role (exploration, planning, codegen, orchestrator) */
    agentRole = '';
    /** NPC ID for display */
    npcId = '';
    /** Available food actions as JSON string (array of CafeteriaPanelAction) */
    actions = '[]';
    /** Queue position (1-indexed) */
    queuePosition = 0;
    /** Total queue size */
    queueTotal = 0;
    /** Whether game is paused (panel expanded) */
    paused = false;
    /** Review time in seconds */
    reviewTime = 0;
    /** Whether there's an active NPC at the counter */
    hasActiveNpc = false;
    parsedActions = [];
    chatText = '';
    expanded = false;
    /** Fired when the user clicks an action card */
    actionSelected;
    /** Fired when the user submits chat context */
    contextSubmitted;
    /** Fired when user toggles the expanded/paused state */
    panelToggled;
    /** Fired when user clicks Tab/cycle */
    cycleNpc;
    chatInputEl;
    parseActions() {
        try {
            this.parsedActions = JSON.parse(this.actions);
        }
        catch {
            this.parsedActions = [];
        }
    }
    componentWillLoad() {
        this.parseActions();
    }
    handleActionClick(key) {
        this.actionSelected.emit({ key });
    }
    handleChatSubmit() {
        const text = this.chatText.trim();
        if (!text)
            return;
        this.chatText = '';
        this.contextSubmitted.emit({ text });
    }
    handleChatKeyDown(e) {
        e.stopPropagation(); // prevent game from eating keys
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleChatSubmit();
        }
    }
    toggleExpanded() {
        this.expanded = !this.expanded;
        this.paused = this.expanded;
        this.panelToggled.emit({ expanded: this.expanded });
    }
    handleCycleClick() {
        this.cycleNpc.emit();
    }
    /** Public method to toggle expanded state (called from game) */
    async toggle() {
        this.toggleExpanded();
    }
    /** Public method to set chat text (for autoplay typing animation) */
    async setChatText(text) {
        this.chatText = text;
    }
    /** Public method to focus the chat input */
    async focusChat() {
        if (!this.expanded) {
            this.toggleExpanded();
        }
        this.chatInputEl?.focus();
    }
    getRoleColor(role) {
        switch (role) {
            case 'exploration': return '#3498db';
            case 'planning': return '#9b59b6';
            case 'codegen': return '#2ecc71';
            case 'orchestrator': return '#e67e22';
            default: return '#888';
        }
    }
    getRoleLabel(role) {
        switch (role) {
            case 'exploration': return 'Explorer';
            case 'planning': return 'Architect';
            case 'codegen': return 'Developer';
            case 'orchestrator': return 'Manager';
            default: return 'Agent';
        }
    }
    render() {
        if (!this.hasActiveNpc) {
            return (h("div", { class: "cp-empty" },
                h("span", { class: "cp-empty-text" }, "Waiting for agents to arrive at the counter...")));
        }
        const roleColor = this.getRoleColor(this.agentRole);
        const roleLabel = this.getRoleLabel(this.agentRole);
        return (h("div", { class: { 'cp-container': true, 'cp-expanded': this.expanded } },
            h("div", { class: "cp-header", onClick: () => this.toggleExpanded() },
                h("div", { class: "cp-header-left" },
                    h("span", { class: "cp-role-dot", style: { background: roleColor } }),
                    h("span", { class: "cp-role-label" }, roleLabel),
                    h("span", { class: "cp-npc-id" }, this.npcId),
                    h("span", { class: "cp-queue-info" },
                        "(",
                        this.queuePosition,
                        "/",
                        this.queueTotal,
                        ")"),
                    h("button", { class: "cp-cycle-btn", onClick: (e) => { e.stopPropagation(); this.handleCycleClick(); }, title: "Next NPC (Tab)" }, "Tab \u2192")),
                h("div", { class: "cp-header-right" },
                    this.expanded && this.reviewTime > 0 && (h("span", { class: "cp-review-timer" },
                        "Review: ",
                        this.reviewTime,
                        "s")),
                    this.expanded && h("span", { class: "cp-paused-badge" }, "PAUSED"),
                    h("span", { class: "cp-expand-hint" }, this.expanded ? '\u25BC Close' : '\u25B2 Details [D]'))),
            h("div", { class: "cp-summary" }, this.summary),
            this.expanded && (h("div", { class: "cp-details" },
                this.paragraph && (h("div", { class: "cp-paragraph" }, this.paragraph)),
                h("div", { class: "cp-actions" }, this.parsedActions
                    .filter(a => a.key !== 2) // "Add Context" is the chat input, not a card
                    .map(action => (h("div", { class: "cp-action-row", onClick: () => this.handleActionClick(action.key) },
                    h("span", { class: "cp-action-emoji" }, action.emoji),
                    h("span", { class: "cp-action-key" }, action.key),
                    h("span", { class: "cp-action-title" }, action.title),
                    h("span", { class: "cp-action-desc" },
                        "\u2014 ",
                        action.description))))),
                h("div", { class: "cp-chat" },
                    h("textarea", { ref: el => this.chatInputEl = el, class: "cp-chat-input", rows: 2, placeholder: "Add context... [Enter to send]", value: this.chatText, onInput: (e) => this.chatText = e.target.value, onKeyDown: (e) => this.handleChatKeyDown(e) }))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-cafeteria-panel",
        "componentClassName": "PopCafeteriaPanel",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "summary",
                "type": "string",
                "attribute": "summary",
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
                    "text": "One-liner summary of the active NPC's request"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "paragraph",
                "type": "string",
                "attribute": "paragraph",
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
                    "text": "Full paragraph description"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "agentRole",
                "type": "string",
                "attribute": "agent-role",
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
                    "text": "NPC agent role (exploration, planning, codegen, orchestrator)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "npcId",
                "type": "string",
                "attribute": "npc-id",
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
                    "text": "NPC ID for display"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "actions",
                "type": "string",
                "attribute": "actions",
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
                    "text": "Available food actions as JSON string (array of CafeteriaPanelAction)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "queuePosition",
                "type": "number",
                "attribute": "queue-position",
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
                    "text": "Queue position (1-indexed)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "queueTotal",
                "type": "number",
                "attribute": "queue-total",
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
                    "text": "Total queue size"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "paused",
                "type": "boolean",
                "attribute": "paused",
                "reflect": true,
                "mutable": true,
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
                    "text": "Whether game is paused (panel expanded)"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "reviewTime",
                "type": "number",
                "attribute": "review-time",
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
                    "text": "Review time in seconds"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "hasActiveNpc",
                "type": "boolean",
                "attribute": "has-active-npc",
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
                    "text": "Whether there's an active NPC at the counter"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "parsedActions"
            }, {
                "name": "chatText"
            }, {
                "name": "expanded"
            }],
        "methods": [{
                "name": "toggle",
                "docs": {
                    "text": "Public method to toggle expanded state (called from game)",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "setChatText",
                "docs": {
                    "text": "Public method to set chat text (for autoplay typing animation)",
                    "tags": []
                },
                "complexType": {
                    "signature": "(text: string) => Promise<any>",
                    "parameters": [{
                            "name": "text",
                            "type": "string",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "focusChat",
                "docs": {
                    "text": "Public method to focus the chat input",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<any>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }],
        "listeners": [],
        "events": [{
                "name": "actionSelected",
                "method": "actionSelected",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired when the user clicks an action card"
                },
                "complexType": {
                    "original": "{ key: number }",
                    "resolved": "{ key: number; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "contextSubmitted",
                "method": "contextSubmitted",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired when the user submits chat context"
                },
                "complexType": {
                    "original": "{ text: string }",
                    "resolved": "{ text: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "panelToggled",
                "method": "panelToggled",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired when user toggles the expanded/paused state"
                },
                "complexType": {
                    "original": "{ expanded: boolean }",
                    "resolved": "{ expanded: boolean; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "cycleNpc",
                "method": "cycleNpc",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired when user clicks Tab/cycle"
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "actions",
                "methodName": "parseActions",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CAFETERIA-PANEL",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/cafeteria-panel/cafeteria-panel.css",
                        "relativePath": "cafeteria-panel.css",
                        "originalComponentPath": "cafeteria-panel.css"
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
        "hasComponentWillUpdateFn": false,
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
        "hasMethod": true,
        "hasMode": false,
        "hasModernPropertyDecls": true,
        "hasAttribute": true,
        "hasProp": true,
        "hasPropNumber": true,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": true,
        "hasReflect": true,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": false,
        "hasState": true,
        "hasStyle": true,
        "hasVdomAttribute": true,
        "hasVdomXlink": false,
        "hasVdomClass": true,
        "hasVdomFunctional": false,
        "hasVdomKey": false,
        "hasVdomListener": true,
        "hasVdomPropOrAttr": true,
        "hasVdomPropOrAttrPrefix": false,
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "onClick", "style", "title", "ref", "rows", "placeholder", "value", "onInput", "onKeyDown"],
        "htmlTagNames": ["div", "span", "button", "textarea"],
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
    static get watchers() { return {
        "actions": [{
                "parseActions": 0
            }]
    }; }
};
//# sourceMappingURL=cafeteria-panel.js.map