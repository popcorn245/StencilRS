import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopAiChatStyle0 from "./ui-kit/organisms/ai-chat/ai-chat.css?tag=pop-ai-chat&encapsulation=scoped";
export const PopAiChat = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popMessageSent = __stencil_createEvent(this, "popMessageSent", 7);
        this.popResponseComplete = __stencil_createEvent(this, "popResponseComplete", 7);
        this.popError = __stencil_createEvent(this, "popError", 7);
        this.popCitationClick = __stencil_createEvent(this, "popCitationClick", 7);
        this.popModelChanged = __stencil_createEvent(this, "popModelChanged", 7);
        this.popModeChanged = __stencil_createEvent(this, "popModeChanged", 7);
        this.popToolToggled = __stencil_createEvent(this, "popToolToggled", 7);
    }
    get el() { return this; }
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
    static get watchers() { return {
        "messages": [{
                "parseMessages": 0
            }]
    }; }
    static get style() { return PopAiChatStyle0(); }
};
__stencil_proxyCustomElement(PopAiChat, [774, "pop-ai-chat", {
        "endpoint": [1],
        "externalDriver": [4, "external-driver"],
        "context": [1],
        "messages": [1],
        "sessionId": [1, "session-id"],
        "aiName": [1, "ai-name"],
        "aiAvatarUrl": [1, "ai-avatar-url"],
        "aiAccentColor": [1, "ai-accent-color"],
        "userAvatarUrl": [1, "user-avatar-url"],
        "userInitials": [1, "user-initials"],
        "layout": [1],
        "streamingMode": [1, "streaming-mode"],
        "placeholder": [1],
        "showMicButton": [4, "show-mic-button"],
        "disabled": [4],
        "models": [1],
        "selectedModel": [1, "selected-model"],
        "selectedMode": [1, "selected-mode"],
        "tools": [1],
        "activeTools": [1, "active-tools"],
        "localMessages": [32],
        "isStreaming": [32],
        "streamingContent": [32],
        "streamingCitations": [32],
        "currentModel": [32],
        "currentMode": [32],
        "currentActiveTools": [32],
        "beginAssistant": [64],
        "appendAssistantToken": [64],
        "endAssistant": [64],
        "getMessages": [64],
        "sendMessage": [64],
        "setInputValue": [64]
    }, undefined, {
        "messages": [{
                "parseMessages": 0
            }]
    }]);
//# sourceMappingURL=ai-chat.js.map