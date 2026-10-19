import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
const LS_MODEL = 'pop-tb-model';
const LS_MODE = 'pop-tb-mode';
const LS_TOOLS = 'pop-tb-tools';
function ls(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function lsSet(key, val) {
    try {
        localStorage.setItem(key, val);
    }
    catch { /* ignore */ }
}
export const PopChatToolbar = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
        this.popToolToggled = __stencil_createEvent(this, "popToolToggled", 7);
        this.micPressed = __stencil_createEvent(this, "micPressed", 7);
        this.micReleased = __stencil_createEvent(this, "micReleased", 7);
    }
    /** JSON string of ModelGroup[] */
    models = '[]';
    /** Initial/controlled model value */
    selectedModel = '';
    /** Initial/controlled mode */
    selectedMode = 'chat';
    /** JSON string of ToolDefinition[] (extra tools merged with built-ins) */
    tools = '[]';
    /** JSON string of string[] — initially active tool IDs */
    activeTools = '[]';
    /** Show mic button in toolbar */
    showMicButton = false;
    popModelChanged;
    popModeChanged;
    popToolToggled;
    micPressed;
    micReleased;
    currentModel = '';
    currentMode = 'chat';
    activeToolIds = [];
    parsedModels = [];
    parsedTools = [];
    showToolsPopover = false;
    componentWillLoad() {
        this.parseProps();
        this.restoreFromStorage();
    }
    parseProps() {
        try {
            this.parsedModels = JSON.parse(this.models);
        }
        catch {
            this.parsedModels = [];
        }
        try {
            this.parsedTools = JSON.parse(this.tools);
        }
        catch {
            this.parsedTools = [];
        }
    }
    restoreFromStorage() {
        // Controlled props take priority; fall back to localStorage; fall back to defaults
        const storedModel = ls(LS_MODEL);
        const storedMode = ls(LS_MODE);
        const storedTools = ls(LS_TOOLS);
        this.currentModel = this.selectedModel || storedModel || this.firstModelValue() || '';
        this.currentMode = this.selectedMode || storedMode || 'chat';
        if (this.activeTools !== '[]') {
            try {
                this.activeToolIds = JSON.parse(this.activeTools);
            }
            catch {
                this.activeToolIds = [];
            }
        }
        else if (storedTools) {
            try {
                this.activeToolIds = JSON.parse(storedTools);
            }
            catch {
                this.activeToolIds = [];
            }
        }
        else {
            this.activeToolIds = [];
        }
    }
    firstModelValue() {
        return this.parsedModels[0]?.models[0]?.value ?? '';
    }
    toggleTool(id) {
        const enabled = !this.activeToolIds.includes(id);
        const next = enabled
            ? [...this.activeToolIds, id]
            : this.activeToolIds.filter(t => t !== id);
        this.activeToolIds = next;
        lsSet(LS_TOOLS, JSON.stringify(next));
        this.popToolToggled.emit({ id, enabled });
    }
    renderToolsPopover() {
        return (h("div", { class: "ct-dropdown-panel ct-tools-panel" },
            h("div", { class: "ct-section-label" }, "Tools"),
            this.parsedTools.map(tool => {
                const on = this.activeToolIds.includes(tool.id);
                return (h("button", { key: tool.id, class: { 'ct-tool-item': true, 'ct-tool-item--on': on }, onClick: () => this.toggleTool(tool.id) },
                    h("span", { class: "ct-tool-icon" }, tool.icon),
                    h("span", { class: "ct-tool-label" }, tool.label),
                    h("span", { class: { 'ct-toggle': true, 'ct-toggle--on': on } }, on ? 'On' : 'Off')));
            }),
            this.parsedTools.length === 0 && (h("div", { class: "ct-empty" }, "No tools configured")),
            h("slot", { name: "tool" })));
    }
    render() {
        const hasActiveTools = this.activeToolIds.length > 0;
        // Active tool icons to display in toolbar
        const activeToolDefs = this.parsedTools.filter(t => this.activeToolIds.includes(t.id));
        return (h("div", { key: '0', class: "ct-root" },
            h("pop-model-selector", { key: '1', models: this.models, selectedModel: this.currentModel, selectedMode: this.currentMode, onPopModelChanged: (e) => {
                    this.currentModel = e.detail;
                    this.popModelChanged.emit(e.detail);
                }, onPopModeChanged: (e) => {
                    this.currentMode = e.detail;
                    this.popModeChanged.emit(e.detail);
                } }),
            h("div", { key: '2', class: "ct-tools-wrap" },
                h("button", { key: '3', class: { 'ct-tools-btn': true, 'ct-tools-btn--open': this.showToolsPopover }, onClick: () => {
                        this.showToolsPopover = !this.showToolsPopover;
                    }, title: "Tools" },
                    hasActiveTools ? (activeToolDefs.map(t => (h("span", { key: t.id, class: "ct-active-tool-icon", title: t.label }, t.icon)))) : (h("span", { class: "ct-tools-label" }, "Tools")),
                    h("svg", { key: '4', class: "ct-chevron", width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round" },
                        h("polyline", { key: '5', points: "6 9 12 15 18 9" }))),
                this.showToolsPopover && this.renderToolsPopover()),
            this.showMicButton && (h("button", { key: '6', class: "ct-mic-btn", title: "Voice input", onMouseDown: () => this.micPressed.emit(), onMouseUp: () => this.micReleased.emit(), onTouchStart: () => this.micPressed.emit(), onTouchEnd: () => this.micReleased.emit() },
                h("svg", { key: '7', width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" },
                    h("path", { key: '8', d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" }),
                    h("path", { key: '9', d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
                    h("line", { key: 'a', x1: "12", y1: "19", x2: "12", y2: "23" }),
                    h("line", { key: 'b', x1: "8", y1: "23", x2: "16", y2: "23" })))),
            h("slot", { key: 'c', name: "toolbar-end" })));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-chat-toolbar",
        "componentClassName": "PopChatToolbar",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
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
                    "text": "JSON string of ModelGroup[]"
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
                    "text": "Initial/controlled model value"
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
                    "text": "Initial/controlled mode"
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
                    "text": "JSON string of ToolDefinition[] (extra tools merged with built-ins)"
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
                    "text": "JSON string of string[] \u2014 initially active tool IDs"
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
                    "text": "Show mic button in toolbar"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "currentModel"
            }, {
                "name": "currentMode"
            }, {
                "name": "activeToolIds"
            }, {
                "name": "parsedModels"
            }, {
                "name": "parsedTools"
            }, {
                "name": "showToolsPopover"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
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
            }, {
                "name": "micPressed",
                "method": "micPressed",
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
                "name": "micReleased",
                "method": "micReleased",
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
            }],
        "watchers": [{
                "propName": "models",
                "methodName": "parseProps",
                "handlerOptions": undefined
            }, {
                "propName": "tools",
                "methodName": "parseProps",
                "handlerOptions": undefined
            }, {
                "propName": "selectedModel",
                "methodName": "parseProps",
                "handlerOptions": undefined
            }, {
                "propName": "selectedMode",
                "methodName": "parseProps",
                "handlerOptions": undefined
            }, {
                "propName": "activeTools",
                "methodName": "parseProps",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-CHAT-TOOLBAR",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/chat-toolbar/chat-toolbar.css",
                        "relativePath": "chat-toolbar.css",
                        "originalComponentPath": "chat-toolbar.css"
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
        "hasMethod": false,
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
        "htmlAttrNames": ["class", "key", "onClick", "name", "models", "selectedModel", "selectedMode", "onPopModelChanged", "onPopModeChanged", "title", "width", "height", "viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "points", "onMouseDown", "onMouseUp", "onTouchStart", "onTouchEnd", "stroke-linejoin", "d", "x1", "y1", "x2", "y2"],
        "htmlTagNames": ["div", "button", "span", "slot", "pop-model-selector", "svg", "polyline", "path", "line"],
        "htmlParts": [],
        "htmlSlots": ["tool", "toolbar-end"],
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
        "models": [{
                "parseProps": 0
            }],
        "tools": [{
                "parseProps": 0
            }],
        "selectedModel": [{
                "parseProps": 0
            }],
        "selectedMode": [{
                "parseProps": 0
            }],
        "activeTools": [{
                "parseProps": 0
            }]
    }; }
};
//# sourceMappingURL=chat-toolbar.js.map