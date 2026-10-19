import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopAiChat = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popMessageSent = __stencil_createEvent(this, "popMessageSent", 7);
        this.popResponseComplete = __stencil_createEvent(this, "popResponseComplete", 7);
        this.popError = __stencil_createEvent(this, "popError", 7);
        this.popCitationClick = __stencil_createEvent(this, "popCitationClick", 7);
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
        this.popToolToggled = __stencil_createEvent(this, "popToolToggled", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** POST endpoint that streams SSE: data: {token?, done?, error?, assistantMsgId?} */
    endpoint = '';
    /**
     * When true, the host drives the answer instead of the built-in SSE fetch:
     * on send the component emits `popMessageSent` and the host streams tokens via
     * `beginAssistant()` / `appendAssistantToken()` / `endAssistant()`. Used by the
     * notes-app right-dock so chat is backed by the in-browser RAG `askBrain`
     * (retrieval + required citations) rather than a raw endpoint.
     */
    externalDriver = false;
    /** Extra context injected into request payload */
    context = '';
    /** JSON string of AiMessage[] — pre-loaded history */
    messages = '[]';
    /** Session ID passed through in each request */
    sessionId = '';
    // AI persona
    aiName = 'Assistant';
    aiAvatarUrl = '';
    aiAccentColor = '';
    // User identity
    userAvatarUrl = '';
    userInitials = '';
    // Display
    layout = 'bubble';
    streamingMode = 'inline';
    placeholder = 'Message...';
    // Input features
    showMicButton = false;
    disabled = false;
    // Toolbar
    models = '[]';
    selectedModel = '';
    selectedMode = 'chat';
    tools = '[]';
    activeTools = '[]';
    localMessages = [];
    isStreaming = false;
    streamingContent = '';
    streamingCitations = [];
    currentModel = '';
    currentMode = 'chat';
    currentActiveTools = [];
    popMessageSent;
    popResponseComplete;
    popError;
    /** Fired when a source/citation chip is clicked — host navigates to the ref. */
    popCitationClick;
    popModelChanged;
    popModeChanged;
    popToolToggled;
    scrollAnchor;
    abortController = null;
    componentWillLoad() {
        this.parseMessages();
        this.currentModel = this.selectedModel;
        this.currentMode = this.selectedMode;
        try {
            this.currentActiveTools = JSON.parse(this.activeTools);
        }
        catch {
            this.currentActiveTools = [];
        }
    }
    componentDidUpdate() {
        this.scrollToBottom();
    }
    parseMessages() {
        try {
            const parsed = JSON.parse(this.messages);
            this.localMessages = Array.isArray(parsed) ? parsed : [];
        }
        catch {
            this.localMessages = [];
        }
    }
    scrollToBottom() {
        this.scrollAnchor?.scrollIntoView({ behavior: 'smooth' });
    }
    async handleSend(detail) {
        const text = detail.text?.trim();
        if (!text || this.isStreaming)
            return;
        const userMsg = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: Date.now(),
        };
        this.localMessages = [...this.localMessages, userMsg];
        this.isStreaming = true;
        this.streamingContent = '';
        this.popMessageSent.emit({
            text,
            sessionId: this.sessionId,
            model: this.currentModel,
            mode: this.currentMode,
            tools: this.currentActiveTools,
        });
        // In external-driver mode the host streams the reply (e.g. askBrain RAG);
        // the built-in SSE fetch is skipped. We still flip into the streaming state
        // so the typing bubble shows until the host calls beginAssistant/append/end.
        if (this.externalDriver) {
            this.streamingCitations = [];
            return;
        }
        await this.streamResponse(text);
    }
    // ── external driver (host-supplied streaming) ──────────────────────────────
    /** Host: start an assistant turn (shows the streaming bubble). */
    async beginAssistant() {
        this.streamingContent = '';
        this.streamingCitations = [];
        this.isStreaming = true;
    }
    /** Host: append a token to the in-flight assistant message. */
    async appendAssistantToken(token) {
        this.streamingContent = this.streamingContent + token;
    }
    /** Host: finalize the assistant turn with optional grounding citations. */
    async endAssistant(content, citations) {
        const finalContent = content ?? this.streamingContent;
        const msg = {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: finalContent,
            timestamp: Date.now(),
            citations: citations && citations.length ? citations : undefined,
        };
        this.localMessages = [...this.localMessages, msg];
        this.streamingContent = '';
        this.streamingCitations = [];
        this.isStreaming = false;
        this.popResponseComplete.emit({ content: finalContent, sessionId: this.sessionId });
    }
    async streamResponse(_userText) {
        if (!this.endpoint) {
            this.isStreaming = false;
            this.popError.emit('No endpoint configured');
            return;
        }
        this.abortController = new AbortController();
        try {
            const history = this.localMessages.map(m => ({ role: m.role, content: m.content }));
            const res = await fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    messages: history,
                    context: this.context || undefined,
                    model: this.currentModel || undefined,
                    mode: this.currentMode || undefined,
                    tools: this.currentActiveTools.length ? this.currentActiveTools : undefined,
                }),
                signal: this.abortController.signal,
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            while (reader) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: '))
                        continue;
                    const raw = line.slice(6).trim();
                    if (!raw || raw === '[DONE]')
                        continue;
                    try {
                        const event = JSON.parse(raw);
                        if (event.error)
                            throw new Error(event.error);
                        if (event.token) {
                            fullContent += event.token;
                            this.streamingContent = fullContent;
                        }
                        if (event.done) {
                            const assistantMsg = {
                                id: event.assistantMsgId || `a-${Date.now()}`,
                                role: 'assistant',
                                content: fullContent,
                                timestamp: Date.now(),
                            };
                            this.localMessages = [...this.localMessages, assistantMsg];
                            this.streamingContent = '';
                            this.isStreaming = false;
                            this.popResponseComplete.emit({ content: fullContent, sessionId: this.sessionId });
                            return;
                        }
                    }
                    catch (parseErr) {
                        // malformed line — skip
                    }
                }
            }
            // Stream ended without done flag — commit whatever we have
            if (fullContent) {
                this.localMessages = [...this.localMessages, {
                        id: `a-${Date.now()}`,
                        role: 'assistant',
                        content: fullContent,
                        timestamp: Date.now(),
                    }];
                this.popResponseComplete.emit({ content: fullContent, sessionId: this.sessionId });
            }
        }
        catch (err) {
            if (err?.name !== 'AbortError') {
                this.popError.emit(err?.message ?? 'Unknown error');
            }
        }
        finally {
            this.streamingContent = '';
            this.isStreaming = false;
            this.abortController = null;
        }
    }
    async getMessages() {
        return this.localMessages;
    }
    async sendMessage(text) {
        await this.handleSend({ text, files: [] });
    }
    async setInputValue(text) {
        const msgBox = this.el.querySelector('pop-message-box');
        await msgBox?.setInputValue(text);
    }
    disconnectedCallback() {
        this.abortController?.abort();
    }
    /** Render the required Source chips for an assistant answer (RAG citations). */
    renderCitations(citations) {
        if (!citations || !citations.length)
            return null;
        return (h("div", { class: "aic-cites", "aria-label": "Sources" }, citations.map(c => (h("button", { type: "button", class: "aic-cite", key: `${c.refId}-${c.index}`, title: c.snippet || c.label, onClick: () => this.popCitationClick.emit({ refId: c.refId, index: c.index }) },
            h("span", { class: "aic-cite-num" }, c.index),
            h("span", { class: "aic-cite-label" }, c.label))))));
    }
    render() {
        const accentStyle = this.aiAccentColor
            ? { '--section-accent': this.aiAccentColor }
            : undefined;
        return (h("div", { key: '0', class: { 'aic-root': true, [`aic-layout--${this.layout}`]: true }, style: accentStyle },
            h("div", { key: '1', class: "aic-messages" },
                this.localMessages.length === 0 && !this.isStreaming && (h("div", { key: '2', class: "aic-empty" }, "Start a conversation\u2026")),
                this.localMessages.map(msg => (h("div", { key: msg.id, class: "aic-msg" },
                    h("pop-message-bubble", { role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content, "message-id": msg.id, layout: this.layout, "avatar-url": msg.role === 'user' ? this.userAvatarUrl : this.aiAvatarUrl, "avatar-initials": msg.role === 'user' ? this.userInitials : (this.aiName?.[0] ?? 'A'), "user-name": msg.role === 'user' ? '' : this.aiName, timestamp: msg.timestamp ?? 0, "show-copy-button": msg.role === 'assistant', streaming: false }),
                    this.renderCitations(msg.citations)))),
                this.isStreaming && (h("div", { key: '3', class: "aic-msg" },
                    h("pop-message-bubble", { key: '4', role: "assistant", content: this.streamingContent, layout: this.layout, "streaming-mode": this.streamingMode, "avatar-url": this.aiAvatarUrl, "avatar-initials": this.aiName?.[0] ?? 'A', "user-name": this.aiName, streaming: true }),
                    this.renderCitations(this.streamingCitations))),
                h("div", { key: '5', ref: el => this.scrollAnchor = el })),
            h("div", { key: '6', class: "aic-input" },
                h("pop-message-box", { key: '7', placeholder: this.placeholder, disabled: this.disabled || this.isStreaming, models: this.models, "selected-model": this.selectedModel, "selected-mode": this.selectedMode, tools: this.tools, "active-tools": this.activeTools, "show-mic-button": this.showMicButton, onSend: (e) => this.handleSend(e.detail), onPopModelChanged: (e) => {
                        this.currentModel = e.detail;
                        this.popModelChanged.emit(e.detail);
                    }, onPopModeChanged: (e) => {
                        this.currentMode = e.detail;
                        this.popModeChanged.emit(e.detail);
                    }, onPopToolToggled: (e) => {
                        const { id, enabled } = e.detail;
                        this.currentActiveTools = enabled
                            ? [...this.currentActiveTools, id]
                            : this.currentActiveTools.filter(t => t !== id);
                        this.popToolToggled.emit(e.detail);
                    } },
                    h("slot", { key: '8', name: "toolbar-end", slot: "toolbar-end" })))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-ai-chat",
        "componentClassName": "PopAiChat",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
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
                    "text": "POST endpoint that streams SSE: data: {token?, done?, error?, assistantMsgId?}"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "externalDriver",
                "type": "boolean",
                "attribute": "external-driver",
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
                    "text": "When true, the host drives the answer instead of the built-in SSE fetch:\non send the component emits `popMessageSent` and the host streams tokens via\n`beginAssistant()` / `appendAssistantToken()` / `endAssistant()`. Used by the\nnotes-app right-dock so chat is backed by the in-browser RAG `askBrain`\n(retrieval + required citations) rather than a raw endpoint."
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
                    "text": "Extra context injected into request payload"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "messages",
                "type": "string",
                "attribute": "messages",
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
                    "text": "JSON string of AiMessage[] \u2014 pre-loaded history"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "sessionId",
                "type": "string",
                "attribute": "session-id",
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
                    "text": "Session ID passed through in each request"
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
                "name": "disabled",
                "type": "boolean",
                "attribute": "disabled",
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
                "name": "localMessages"
            }, {
                "name": "isStreaming"
            }, {
                "name": "streamingContent"
            }, {
                "name": "streamingCitations"
            }, {
                "name": "currentModel"
            }, {
                "name": "currentMode"
            }, {
                "name": "currentActiveTools"
            }],
        "methods": [{
                "name": "beginAssistant",
                "docs": {
                    "text": "Host: start an assistant turn (shows the streaming bubble).",
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
                "name": "appendAssistantToken",
                "docs": {
                    "text": "Host: append a token to the in-flight assistant message.",
                    "tags": []
                },
                "complexType": {
                    "signature": "(token: string) => Promise<any>",
                    "parameters": [{
                            "name": "token",
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
                "name": "endAssistant",
                "docs": {
                    "text": "Host: finalize the assistant turn with optional grounding citations.",
                    "tags": []
                },
                "complexType": {
                    "signature": "(content?: string, citations?: AiCitation[]) => Promise<any>",
                    "parameters": [{
                            "name": "content",
                            "type": "string | undefined",
                            "docs": ""
                        }, {
                            "name": "citations",
                            "type": "{} | undefined",
                            "docs": ""
                        }],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "AiCitation": {
                            "location": "local",
                            "path": "ui-kit/organisms/ai-chat/ai-chat.tsx",
                            "id": "ui-kit/organisms/ai-chat/ai-chat.tsx::AiCitation"
                        },
                        "AiMessage": {
                            "location": "local",
                            "path": "ui-kit/organisms/ai-chat/ai-chat.tsx",
                            "id": "ui-kit/organisms/ai-chat/ai-chat.tsx::AiMessage"
                        }
                    },
                    "return": "Promise<any>"
                },
                "internal": false
            }, {
                "name": "getMessages",
                "docs": {
                    "text": "",
                    "tags": []
                },
                "complexType": {
                    "signature": "() => Promise<AiMessage[]>",
                    "parameters": [],
                    "references": {
                        "Promise": {
                            "location": "global",
                            "id": "global::Promise"
                        },
                        "AiMessage": {
                            "location": "local",
                            "path": "ui-kit/organisms/ai-chat/ai-chat.tsx",
                            "id": "ui-kit/organisms/ai-chat/ai-chat.tsx::AiMessage"
                        }
                    },
                    "return": "Promise<{}>"
                },
                "internal": false
            }, {
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
                    "original": "{ text: string; sessionId: string; model: string; mode: string; tools: string[] }",
                    "resolved": "{ text: string; sessionId: string; model: string; mode: string; tools: {}; }",
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
                    "original": "{ content: string; sessionId: string }",
                    "resolved": "{ content: string; sessionId: string; }",
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
                "name": "popCitationClick",
                "method": "popCitationClick",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": "Fired when a source/citation chip is clicked \u2014 host navigates to the ref."
                },
                "complexType": {
                    "original": "{ refId: string; index: number }",
                    "resolved": "{ refId: string; index: number; }",
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
                "propName": "messages",
                "methodName": "parseMessages",
                "handlerOptions": undefined
            }],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-AI-CHAT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/ai-chat/ai-chat.css",
                        "relativePath": "ai-chat.css",
                        "originalComponentPath": "ai-chat.css"
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
        "hasComponentDidUpdateFn": true,
        "hasComponentWillRenderFn": false,
        "hasComponentDidRenderFn": false,
        "hasConnectedCallbackFn": false,
        "hasDeserializer": false,
        "hasDisconnectedCallbackFn": true,
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
        "hasVdomRef": true,
        "hasVdomRender": true,
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": true,
        "isPlain": false,
        "htmlAttrNames": ["class", "aria-label", "type", "key", "title", "onClick", "style", "role", "content", "message-id", "layout", "avatar-url", "avatar-initials", "user-name", "timestamp", "show-copy-button", "streaming", "streaming-mode", "ref", "placeholder", "disabled", "models", "selected-model", "selected-mode", "tools", "active-tools", "show-mic-button", "onSend", "onPopModelChanged", "onPopModeChanged", "onPopToolToggled", "name", "slot"],
        "htmlTagNames": ["div", "button", "span", "pop-message-bubble", "pop-message-box", "slot"],
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
        "messages": [{
                "parseMessages": 0
            }]
    }; }
};
//# sourceMappingURL=ai-chat.js.map