import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopCommunityChatStyle0 from "./ui-kit/organisms/community-chat/community-chat.css?tag=pop-community-chat&encapsulation=scoped";
export const PopCommunityChat = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popMessageSent = __stencil_createEvent(this, "popMessageSent", 7);
        this.popThreadOpened = __stencil_createEvent(this, "popThreadOpened", 7);
        this.popLoginRequested = __stencil_createEvent(this, "popLoginRequested", 7);
        this.popMessageEdited = __stencil_createEvent(this, "popMessageEdited", 7);
        this.popMessageDeleted = __stencil_createEvent(this, "popMessageDeleted", 7);
        this.popLoadHistory = __stencil_createEvent(this, "popLoadHistory", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** JSON string of message objects */
    messages = '[]';
    channelName = 'Chat';
    currentUserId = '';
    mode = 'channel';
    defaultSort = 'oldest';
    messagePlaceholder = '';
    guestPlaceholder = 'Please log in to chat';
    loginButtonText = 'Login to Chat';
    showFullChatLink = false;
    fullChatLink = '/chat';
    popMessageSent;
    popThreadOpened;
    popLoginRequested;
    popMessageEdited;
    popMessageDeleted;
    popLoadHistory;
    inputText = '';
    sortOrder = 'oldest';
    showSortMenu = false;
    wasAtBottom = true;
    wasAtTop = true;
    shouldForceScroll = false;
    lastKnownMessageId = null;
    componentDidLoad() {
        this.sortOrder = this.defaultSort;
        const container = this.el.querySelector('.cc-messages');
        if (container) {
            container.scrollTop = this.sortOrder === 'oldest' ? container.scrollHeight : 0;
            container.addEventListener('scroll', this.handleScroll);
        }
    }
    componentWillUpdate() {
        const container = this.el.querySelector('.cc-messages');
        if (!container)
            return;
        this.wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
        this.wasAtTop = container.scrollTop <= 20;
        let msgs = [];
        try {
            msgs = JSON.parse(this.messages);
        }
        catch { /* ok */ }
        if (msgs.length > 0) {
            const sorted = [...msgs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            const newest = sorted[sorted.length - 1];
            if (newest && newest.id !== this.lastKnownMessageId) {
                if (newest.userId === this.currentUserId)
                    this.shouldForceScroll = true;
                this.lastKnownMessageId = newest.id;
            }
        }
    }
    componentDidUpdate() {
        const container = this.el.querySelector('.cc-messages');
        if (!container)
            return;
        if (this.sortOrder === 'oldest' && (this.shouldForceScroll || this.wasAtBottom)) {
            container.scrollTop = container.scrollHeight;
        }
        else if (this.sortOrder === 'newest' && (this.shouldForceScroll || this.wasAtTop)) {
            container.scrollTop = 0;
        }
        this.shouldForceScroll = false;
    }
    disconnectedCallback() {
        const container = this.el.querySelector('.cc-messages');
        container?.removeEventListener('scroll', this.handleScroll);
    }
    handleScroll = (e) => {
        const target = e.target;
        if (this.sortOrder === 'oldest' && target.scrollTop <= 50) {
            this.popLoadHistory.emit();
        }
        else if (this.sortOrder === 'newest') {
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                this.popLoadHistory.emit();
            }
        }
    };
    sendMessage = () => {
        if (!this.currentUserId) {
            this.popLoginRequested.emit();
            return;
        }
        if (!this.inputText.trim())
            return;
        this.popMessageSent.emit(this.inputText);
        this.inputText = '';
    };
    parsedMessages() {
        try {
            const raw = typeof this.messages === 'string' ? JSON.parse(this.messages) : this.messages;
            const arr = Array.isArray(raw) ? raw : [];
            if (this.sortOrder === 'newest')
                return [...arr].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            if (this.sortOrder === 'popular')
                return [...arr].sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
            return [...arr].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
        catch {
            return [];
        }
    }
    render() {
        const isThread = this.mode === 'thread';
        const msgs = this.parsedMessages();
        const placeholder = this.currentUserId
            ? (this.messagePlaceholder || (isThread ? 'Reply to thread...' : `Message ${this.channelName}`))
            : this.guestPlaceholder;
        return (h("div", { key: '0', class: "cc-container" },
            h("header", { key: '1', class: "cc-header" },
                h("slot", { key: '2', name: "header-prefix" }),
                h("span", { key: '3', class: "cc-channel-name" }, this.channelName),
                h("slot", { key: '4', name: "header-suffix" }),
                h("div", { key: '5', class: "cc-header-actions" },
                    h("div", { key: '6', class: "cc-sort-wrap" },
                        h("button", { key: '7', class: "cc-icon-btn", title: "Sort", onClick: () => this.showSortMenu = !this.showSortMenu },
                            h("svg", { key: '8', xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 512 512", fill: "currentColor" },
                                h("path", { key: '9', d: "M472,168H40a24,24,0,0,1,0-48H472a24,24,0,0,1,0,48Z" }),
                                h("path", { key: 'a', d: "M392,280H120a24,24,0,0,1,0-48H392a24,24,0,0,1,0,48Z" }),
                                h("path", { key: 'b', d: "M296,392H216a24,24,0,0,1,0-48h80a24,24,0,0,1,0,48Z" }))),
                        this.showSortMenu && (h("div", { key: 'c', class: "cc-sort-dropdown" }, ['oldest', 'newest', 'popular'].map(s => (h("div", { key: s, class: { 'cc-sort-option': true, 'cc-sort-option--active': this.sortOrder === s }, onClick: () => { this.sortOrder = s; this.showSortMenu = false; } }, s === 'oldest' ? 'Oldest First' : s === 'newest' ? 'Newest First' : 'Most Discussed')))))),
                    this.showFullChatLink && (h("a", { key: 'd', href: this.fullChatLink, target: "_blank", class: "cc-icon-btn", title: "Open full chat" },
                        h("svg", { key: 'e', xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 512 512", fill: "none", stroke: "currentColor", "stroke-width": "32", "stroke-linecap": "round", "stroke-linejoin": "round" },
                            h("path", { key: 'f', d: "M384,224v184a40,40,0,0,1-40,40H104a40,40,0,0,1-40-40V168a40,40,0,0,1,40-40H288" }),
                            h("polyline", { key: 'g', points: "336 64 448 64 448 176" }),
                            h("line", { key: 'h', x1: "224", y1: "288", x2: "440", y2: "72" })))))),
            h("div", { key: 'i', class: "cc-messages" }, msgs.length === 0 ? (h("div", { class: "cc-empty" }, "No messages yet. Be the first!")) : (msgs.map((msg) => (h("pop-message-bubble", { key: msg.id, role: "member", content: msg.text || '', "message-id": msg.id, "avatar-url": msg.userPhotoUrl || '', "avatar-initials": (msg.userDisplayName || '?').slice(0, 2), "user-name": msg.userDisplayName || 'Anonymous', timestamp: msg.createdAt || 0, "is-own": msg.userId === this.currentUserId, "is-thread": isThread, "thread-count": msg.replyCount || 0, "thread-preview": msg.lastReplyText || '', "thread-avatar-url": msg.lastReplyUserPhotoUrl || '', "thread-last-at": msg.lastReplyAt || 0, onPopThreadOpened: (e) => this.popThreadOpened.emit(e.detail), onPopMessageEdited: (e) => this.popMessageEdited.emit(e.detail), onPopMessageDeleted: (e) => this.popMessageDeleted.emit(e.detail) }))))),
            h("footer", { key: 'j', class: "cc-footer" }, this.currentUserId ? (h("pop-message-box", { placeholder: placeholder, disabled: false, onSend: (e) => {
                    this.inputText = typeof e.detail === 'string' ? e.detail : e.detail.text;
                    this.sendMessage();
                    e.target.clear?.();
                }, onValueChange: (e) => this.inputText = e.detail })) : (h("button", { class: "cc-login-btn", onClick: () => this.popLoginRequested.emit() }, this.loginButtonText)))));
    }
};
PopCommunityChat.style = PopCommunityChatStyle0();
//# sourceMappingURL=community-chat.js.map