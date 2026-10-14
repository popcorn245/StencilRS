import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopTabbedChatStyle0 from "./ui-kit/organisms/tabbed-chat/tabbed-chat.css?tag=pop-tabbed-chat&encapsulation=scoped";
const PopTabbedChat = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
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
    get el() { return this; }
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
    static get watchers() { return {
        "sessions": [{
                "parseSessions": 0
            }],
        "activeSessionId": [{
                "onActiveSessionIdChange": 0
            }]
    }; }
    static get style() { return PopTabbedChatStyle0(); }
};
__stencil_defineCustomElement(PopTabbedChat, [774, "pop-tabbed-chat", {
        "sessions": [1],
        "activeSessionId": [1, "active-session-id"],
        "endpoint": [1],
        "context": [1],
        "aiName": [1, "ai-name"],
        "aiAvatarUrl": [1, "ai-avatar-url"],
        "aiAccentColor": [1, "ai-accent-color"],
        "userAvatarUrl": [1, "user-avatar-url"],
        "userInitials": [1, "user-initials"],
        "layout": [1],
        "streamingMode": [1, "streaming-mode"],
        "placeholder": [1],
        "showMicButton": [4, "show-mic-button"],
        "models": [1],
        "selectedModel": [1, "selected-model"],
        "selectedMode": [1, "selected-mode"],
        "tools": [1],
        "activeTools": [1, "active-tools"],
        "parsedSessions": [32],
        "currentSessionId": [32],
        "sendMessage": [64],
        "setInputValue": [64]
    }, undefined, {
        "sessions": [{
                "parseSessions": 0
            }],
        "activeSessionId": [{
                "onActiveSessionIdChange": 0
            }]
    }]);
//# sourceMappingURL=tabbed-chat.js.map