import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopTabbedChat = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popSessionSelected = __stencil_createEvent(this, "popSessionSelected", 7);
        this.popSessionCreated = __stencil_createEvent(this, "popSessionCreated", 7);
        this.popSessionDeleted = __stencil_createEvent(this, "popSessionDeleted", 7);
        this.popMessageSent = __stencil_createEvent(this, "popMessageSent", 7);
        this.popResponseComplete = __stencil_createEvent(this, "popResponseComplete", 7);
        this.popError = __stencil_createEvent(this, "popError", 7);
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
        this.popToolToggled = __stencil_createEvent(this, "popToolToggled", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** JSON string of ChatSession[] */
    sessions = '[]';
    /** Currently active session ID */
    activeSessionId = '';
    // pop-ai-chat forwarded props
    endpoint = '';
    context = '';
    aiName = 'Assistant';
    aiAvatarUrl = '';
    aiAccentColor = '';
    userAvatarUrl = '';
    userInitials = '';
    layout = 'bubble';
    streamingMode = 'inline';
    placeholder = 'Message...';
    showMicButton = false;
    models = '[]';
    selectedModel = '';
    selectedMode = 'chat';
    tools = '[]';
    activeTools = '[]';
    popSessionSelected;
    popSessionCreated;
    popSessionDeleted;
    popMessageSent;
    popResponseComplete;
    popError;
    popModelChanged;
    popModeChanged;
    popToolToggled;
    parsedSessions = [];
    currentSessionId = '';
    componentWillLoad() {
        this.parseSessions();
        this.currentSessionId = this.activeSessionId || this.parsedSessions[0]?.id || '';
    }
    parseSessions() {
        try {
            const parsed = JSON.parse(this.sessions);
            this.parsedSessions = Array.isArray(parsed) ? parsed : [];
        }
        catch {
            this.parsedSessions = [];
        }
    }
    onActiveSessionIdChange(val) {
        this.currentSessionId = val;
    }
    selectSession(id) {
        this.currentSessionId = id;
        this.popSessionSelected.emit(id);
    }
    deleteSession(e, id) {
        e.stopPropagation();
        this.popSessionDeleted.emit(id);
    }
    get activeSession() {
        return this.parsedSessions.find(s => s.id === this.currentSessionId);
    }
    async sendMessage(text) {
        const aiChat = this.el.querySelector('pop-ai-chat');
        await aiChat?.sendMessage(text);
    }
    async setInputValue(text) {
        const aiChat = this.el.querySelector('pop-ai-chat');
        await aiChat?.setInputValue(text);
    }
    render() {
        const active = this.activeSession;
        return (h("div", { key: '0', class: "tc-root" },
            h("div", { key: '1', class: "tc-tabs", role: "tablist" },
                this.parsedSessions.map(session => (h("button", { key: session.id, class: { 'tc-tab': true, 'tc-tab--active': session.id === this.currentSessionId }, role: "tab", "aria-selected": session.id === this.currentSessionId ? 'true' : 'false', onClick: () => this.selectSession(session.id) },
                    h("span", { class: "tc-tab-label" }, session.label),
                    h("span", { class: "tc-tab-close", title: "Close session", onClick: (e) => this.deleteSession(e, session.id) }, "\u00D7")))),
                h("button", { key: '2', class: "tc-new-btn", title: "New conversation", onClick: () => this.popSessionCreated.emit() },
                    h("svg", { key: '3', width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round" },
                        h("line", { key: '4', x1: "12", y1: "5", x2: "12", y2: "19" }),
                        h("line", { key: '5', x1: "5", y1: "12", x2: "19", y2: "12" })))),
            h("div", { key: '6', class: "tc-body" }, active ? (h("pop-ai-chat", { key: active.id, endpoint: this.endpoint, context: this.context, "session-id": active.id, messages: active.messages || '[]', "ai-name": this.aiName, "ai-avatar-url": this.aiAvatarUrl, "ai-accent-color": this.aiAccentColor, "user-avatar-url": this.userAvatarUrl, "user-initials": this.userInitials, layout: this.layout, "streaming-mode": this.streamingMode, placeholder: this.placeholder, "show-mic-button": this.showMicButton, models: this.models, "selected-model": this.selectedModel, "selected-mode": this.selectedMode, tools: this.tools, "active-tools": this.activeTools, onPopMessageSent: (e) => this.popMessageSent.emit(e.detail), onPopResponseComplete: (e) => this.popResponseComplete.emit(e.detail), onPopError: (e) => this.popError.emit(e.detail), onPopModelChanged: (e) => this.popModelChanged.emit(e.detail), onPopModeChanged: (e) => this.popModeChanged.emit(e.detail), onPopToolToggled: (e) => this.popToolToggled.emit(e.detail) },
                h("slot", { name: "toolbar-end", slot: "toolbar-end" }))) : (h("div", { class: "tc-empty" },
                h("p", null, "No conversation selected."),
                h("button", { class: "tc-start-btn", onClick: () => this.popSessionCreated.emit() }, "Start a new conversation"))))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-tabbed-chat",
        "componentClassName": "PopTabbedChat",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "sessions",
                "type": "string",
                "attribute": "sessions",
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
                    "text": "JSON string of ChatSession[]"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "activeSessionId",
                "type": "string",
                "attribute": "active-session-id",
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
                    "text": "Currently active session ID"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "endpoint",
                "type": "string",
                "attribute": "endpoint",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "context",
                "type": "string",
                "attribute": "context",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "aiName",
                "type": "string",
                "attribute": "ai-name",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Assistant'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "aiAvatarUrl",
                "type": "string",
                "attribute": "ai-avatar-url",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "aiAccentColor",
                "type": "string",
                "attribute": "ai-accent-color",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "userAvatarUrl",
                "type": "string",
                "attribute": "user-avatar-url",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "userInitials",
                "type": "string",
                "attribute": "user-initials",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "layout",
                "type": "string",
                "attribute": "layout",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'bubble'",
                "complexType": {
                    "original": "'bubble' | 'prose'",
                    "resolved": "\"bubble\" | \"prose\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "streamingMode",
                "type": "string",
                "attribute": "streaming-mode",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'inline'",
                "complexType": {
                    "original": "'inline' | 'dots'",
                    "resolved": "\"dots\" | \"inline\"",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "placeholder",
                "type": "string",
                "attribute": "placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Message...'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "showMicButton",
                "type": "boolean",
                "attribute": "show-mic-button",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "models",
                "type": "string",
                "attribute": "models",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "selectedModel",
                "type": "string",
                "attribute": "selected-model",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "selectedMode",
                "type": "string",
                "attribute": "selected-mode",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'chat'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "tools",
                "type": "string",
                "attribute": "tools",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "activeTools",
                "type": "string",
                "attribute": "active-tools",
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
                    "text": ""
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "parsedSessions"
            }, {
                "name": "currentSessionId"
            }],
        "methods": [{
                "name": "sendMessage",
                "docs": {
                    "text": "",
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
                "name": "setInputValue",
                "docs": {
                    "text": "",
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
            }],
        "listeners": [],
        "events": [{
                "name": "popSessionSelected",
                "method": "popSessionSelected",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popSessionCreated",
                "method": "popSessionCreated",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "void",
                    "resolved": "void",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popSessionDeleted",
                "method": "popSessionDeleted",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popMessageSent",
                "method": "popMessageSent",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popResponseComplete",
                "method": "popResponseComplete",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "any",
                    "resolved": "any",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popError",
                "method": "popError",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popModelChanged",
                "method": "popModelChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popModeChanged",
                "method": "popModeChanged",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popToolToggled",
                "method": "popToolToggled",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string; enabled: boolean }",
                    "resolved": "{ id: string; enabled: boolean; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [{
                "propName": "sessions",
                "methodName": "parseSessions",
                "handlerOptions": undefined
            }, {
                "propName": "activeSessionId",
                "methodName": "onActiveSessionIdChange",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-TABBED-CHAT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/tabbed-chat/tabbed-chat.css",
                        "relativePath": "tabbed-chat.css",
                        "originalComponentPath": "tabbed-chat.css"
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
        "hasPropNumber": false,
        "hasPropBoolean": true,
        "hasPropString": true,
        "hasPropMutable": false,
        "hasReflect": false,
        "hasRenderFn": true,
        "hasSerializer": false,
        "hasSlot": true,
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
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "role", "aria-selected", "onClick", "title", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "x1", "y1", "x2", "y2", "endpoint", "context", "session-id", "messages", "ai-name", "ai-avatar-url", "ai-accent-color", "user-avatar-url", "user-initials", "layout", "streaming-mode", "placeholder", "show-mic-button", "models", "selected-model", "selected-mode", "tools", "active-tools", "onPopMessageSent", "onPopResponseComplete", "onPopError", "onPopModelChanged", "onPopModeChanged", "onPopToolToggled", "name", "slot"],
        "htmlTagNames": ["div", "button", "span", "svg", "line", "pop-ai-chat", "slot", "p"],
        "htmlParts": [],
        "htmlSlots": ["toolbar-end"],
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
        "sessions": [{
                "parseSessions": 0
            }],
        "activeSessionId": [{
                "onActiveSessionIdChange": 0
            }]
    }; }
};
//# sourceMappingURL=tabbed-chat.js.map