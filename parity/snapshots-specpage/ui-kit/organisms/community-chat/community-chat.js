import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
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
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-community-chat",
        "componentClassName": "PopCommunityChat",
        "elementRef": "el",
        "encapsulation": "scoped",
        "shadowDelegatesFocus": false,
        "shadowClonable": false,
        "shadowSerializable": false,
        "shadowMode": null,
        "slotAssignment": null,
        "patches": null,
        "properties": [{
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
                    "text": "JSON string of message objects"
                },
                "internal": false,
                "getter": false,
                "setter": false
            }, {
                "name": "channelName",
                "type": "string",
                "attribute": "channel-name",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Chat'",
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
                "name": "currentUserId",
                "type": "string",
                "attribute": "current-user-id",
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
                "name": "mode",
                "type": "string",
                "attribute": "mode",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'channel'",
                "complexType": {
                    "original": "'channel' | 'thread'",
                    "resolved": "\"channel\" | \"thread\"",
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
                "name": "defaultSort",
                "type": "string",
                "attribute": "default-sort",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'oldest'",
                "complexType": {
                    "original": "'newest' | 'oldest' | 'popular'",
                    "resolved": "\"newest\" | \"oldest\" | \"popular\"",
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
                "name": "messagePlaceholder",
                "type": "string",
                "attribute": "message-placeholder",
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
                "name": "guestPlaceholder",
                "type": "string",
                "attribute": "guest-placeholder",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Please log in to chat'",
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
                "name": "loginButtonText",
                "type": "string",
                "attribute": "login-button-text",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'Login to Chat'",
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
                "name": "showFullChatLink",
                "type": "boolean",
                "attribute": "show-full-chat-link",
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
                "name": "fullChatLink",
                "type": "string",
                "attribute": "full-chat-link",
                "reflect": false,
                "mutable": false,
                "required": false,
                "optional": false,
                "defaultValue": "'/chat'",
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
                "name": "inputText"
            }, {
                "name": "sortOrder"
            }, {
                "name": "showSortMenu"
            }],
        "methods": [],
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
                    "original": "string",
                    "resolved": "string",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popThreadOpened",
                "method": "popThreadOpened",
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
                "name": "popLoginRequested",
                "method": "popLoginRequested",
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
                "name": "popMessageEdited",
                "method": "popMessageEdited",
                "bubbles": true,
                "cancelable": true,
                "composed": true,
                "docs": {
                    "tags": [],
                    "text": ""
                },
                "complexType": {
                    "original": "{ id: string; text: string }",
                    "resolved": "{ id: string; text: string; }",
                    "references": {}
                },
                "internal": false
            }, {
                "name": "popMessageDeleted",
                "method": "popMessageDeleted",
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
                "name": "popLoadHistory",
                "method": "popLoadHistory",
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
        "watchers": [],
        "doesExtend": false,
        "styles": [{
                "modeName": "$",
                "styleId": "POP-COMMUNITY-CHAT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/community-chat/community-chat.css",
                        "relativePath": "community-chat.css",
                        "originalComponentPath": "community-chat.css"
                    }]
            }],
        "globalStyles": [],
        "internal": false,
        "sourceMapPath": null,
        "serializers": [],
        "deserializers": [],
        "hasAttributeChangedCallbackFn": false,
        "hasComponentWillLoadFn": false,
        "hasComponentDidLoadFn": true,
        "hasComponentShouldUpdateFn": false,
        "hasComponentWillUpdateFn": true,
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
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "name", "title", "onClick", "xmlns", "width", "height", "viewBox", "fill", "d", "href", "target", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "points", "x1", "y1", "x2", "y2", "role", "content", "message-id", "avatar-url", "avatar-initials", "user-name", "timestamp", "is-own", "is-thread", "thread-count", "thread-preview", "thread-avatar-url", "thread-last-at", "onPopThreadOpened", "onPopMessageEdited", "onPopMessageDeleted", "placeholder", "disabled", "onSend", "onValueChange"],
        "htmlTagNames": ["div", "header", "slot", "span", "button", "svg", "path", "a", "polyline", "line", "pop-message-bubble", "footer", "pop-message-box"],
        "htmlParts": [],
        "htmlSlots": ["header-prefix", "header-suffix"],
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
//# sourceMappingURL=community-chat.js.map