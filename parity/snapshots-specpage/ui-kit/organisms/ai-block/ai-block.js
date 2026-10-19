import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopAiBlock = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.aiGenerate = __stencil_createEvent(this, "aiGenerate", 7);
        this.aiCancel = __stencil_createEvent(this, "aiCancel", 7);
        this.aiModelChange = __stencil_createEvent(this, "aiModelChange", 7);
        this.aiChange = __stencil_createEvent(this, "aiChange", 7);
    }
    /** User's prompt text */
    prompt = '';
    /** Generated response text */
    response = '';
    /** Selected model identifier */
    model = 'gemma4:e4b';
    /** Generation status: idle, generating, done, error */
    status = 'idle';
    /** Whether Ollama is reachable */
    ollamaAvailable = false;
    /** User clicked Generate */
    aiGenerate;
    /** User cancelled generation */
    aiCancel;
    /** Model selection changed */
    aiModelChange;
    /** Any data change */
    aiChange;
    showPrompt = true;
    statusText = '';
    promptRef = null;
    componentWillLoad() {
        this.showPrompt = !this.response;
    }
    get availableModels() {
        const models = [];
        if (this.ollamaAvailable) {
            models.push({ label: 'Gemma 4', value: 'gemma4:e4b' });
        }
        models.push({ label: 'Claude', value: 'claude-sonnet-4-20250514' });
        return models;
    }
    handleGenerate = () => {
        const prompt = this.promptRef?.value?.trim() || this.prompt;
        if (!prompt)
            return;
        this.prompt = prompt;
        this.status = 'generating';
        this.showPrompt = false;
        this.aiGenerate.emit({ prompt, model: this.model });
        this.emitChange();
    };
    handleEditPrompt = () => {
        this.showPrompt = true;
    };
    handleRefresh = () => {
        this.response = '';
        this.status = 'generating';
        this.aiGenerate.emit({ prompt: this.prompt, model: this.model });
        this.emitChange();
    };
    handleModelChange = (e) => {
        this.model = e.target.value;
        this.aiModelChange.emit({ model: this.model });
        this.emitChange();
    };
    emitChange() {
        this.aiChange.emit({
            prompt: this.prompt,
            response: this.response,
            model: this.model,
            status: this.status,
        });
    }
    render() {
        return (h("div", { key: '0', class: "aib-wrap" },
            h("div", { key: '1', class: "aib-header" },
                h("span", { key: '2', class: "aib-label" }, "AI"),
                h("select", { key: '3', class: "aib-model-select", onChange: this.handleModelChange }, this.availableModels.map(m => (h("option", { value: m.value, selected: this.model === m.value }, m.label))))),
            this.showPrompt && (h("div", { key: '4', class: "aib-prompt-area" },
                h("textarea", { key: '5', class: "aib-prompt-input", placeholder: "Ask AI...", value: this.prompt, rows: 2, ref: el => this.promptRef = el, onKeyDown: (e) => e.stopPropagation() }),
                h("button", { key: '6', type: "button", class: "aib-generate-btn", onClick: this.handleGenerate, disabled: this.status === 'generating' }, this.status === 'generating' ? 'Generating...' : 'Generate'))),
            this.statusText && (h("div", { key: '7', class: "aib-status" }, this.statusText)),
            this.response && (h("div", { key: '8', class: "aib-content" }, this.response)),
            this.status === 'error' && (h("div", { key: '9', class: "aib-error" }, "Generation failed. Please try again.")),
            this.response && !this.showPrompt && (h("div", { key: 'a', class: "aib-actions" },
                h("button", { key: 'b', type: "button", class: "aib-action-btn aib-action-btn--primary", onClick: this.handleRefresh }, "Refresh"),
                h("button", { key: 'c', type: "button", class: "aib-action-btn", onClick: this.handleEditPrompt }, "Edit prompt")))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-ai-block",
        "componentClassName": "PopAiBlock",
        "elementRef": null,
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
                "name": "prompt",
                "type": "string",
                "attribute": "prompt",
                "reflect": false,
                "mutable": true,
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
                    "text": "User's prompt text"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "response",
                "type": "string",
                "attribute": "response",
                "reflect": false,
                "mutable": true,
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
                    "text": "Generated response text"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "model",
                "type": "string",
                "attribute": "model",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'gemma4:e4b'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Selected model identifier"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "status",
                "type": "string",
                "attribute": "status",
                "reflect": false,
                "mutable": true,
                "required": false,
                "optional": false,
                "defaultValue": "'idle'",
                "complexType": {
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "docs": {
                    "tags": [],
                    "text": "Generation status: idle, generating, done, error"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "ollamaAvailable",
                "type": "boolean",
                "attribute": "ollama-available",
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
                    "text": "Whether Ollama is reachable"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }],
        "virtualProperties": [],
        "states": [{
                "name": "showPrompt"
            }, {
                "name": "statusText"
            }],
        "methods": [],
        "listeners": [],
        "events": [{
                "name": "aiGenerate",
                "method": "aiGenerate",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "User clicked Generate"
                },
                "complexType": {
                    "original": "{ prompt: string; model: string }",
                    "resolved": "{ prompt: string; model: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "aiCancel",
                "method": "aiCancel",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "User cancelled generation"
                },
                "complexType": {
                    "original": "{}",
                    "resolved": "{}",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "aiModelChange",
                "method": "aiModelChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Model selection changed"
                },
                "complexType": {
                    "original": "{ model: string }",
                    "resolved": "{ model: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "aiChange",
                "method": "aiChange",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Any data change"
                },
                "complexType": {
                    "original": "{ prompt: string; response: string; model: string; status: string }",
                    "resolved": "{ prompt: string; response: string; model: string; status: string; }",
                    "references": {}
                },
                "internal": false
            }],
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-AI-BLOCK",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/ai-block/ai-block.css",
                        "relativePath": "ai-block.css",
                        "originalComponentPath": "ai-block.css"
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
        "hasPropMutable": true,
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
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": false,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "onChange", "value", "selected", "placeholder", "rows", "ref", "onKeyDown", "type", "onClick", "disabled"],
        "htmlTagNames": ["div", "span", "select", "option", "textarea", "button"],
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
//# sourceMappingURL=ai-block.js.map