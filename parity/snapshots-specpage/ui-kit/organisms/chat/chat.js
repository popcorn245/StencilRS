import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/testing";
import { h } from "@stencil/core/testing";
export const PopChat = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popMessageSent = __stencil_createEvent(this, "popMessageSent", 7);
        this.popThreadOpened = __stencil_createEvent(this, "popThreadOpened", 7);
        this.popLoginRequested = __stencil_createEvent(this, "popLoginRequested", 7);
        this.popMessageEdited = __stencil_createEvent(this, "popMessageEdited", 7);
        this.popMessageDeleted = __stencil_createEvent(this, "popMessageDeleted", 7);
        this.popLoadHistory = __stencil_createEvent(this, "popLoadHistory", 7);
    }
    /**
     * JSON string of messages. Array of { id, text, userDisplayName, userId, createdAt }
     */
    messages = '[]';
    /**
     * The name of the channel to display
     */
    channelName = 'Chat';
    /**
     * The ID of the current user (to align messages right)
     */
    currentUserId = '';
    /**
     * Emitted when the user attempts to send a message
     */
    popMessageSent;
    /**
     * Emitted when a user wants to open a thread
     */
    popThreadOpened;
    /**
     * Emitted when the user clicks 'Login'
     */
    popLoginRequested;
    /**
     * Mode of the chat: 'channel' (default) or 'thread' (hides thread controls)
     */
    mode = 'channel';
    defaultSort = 'oldest';
    inputText = '';
    sortOrder = 'oldest';
    // ... (keeping other properties)
    handleScroll = (e) => {
        const target = e.target;
        // Infinite Scroll Trigger
        if (this.sortOrder === 'oldest') {
            // Standard: Load history at top
            // Use a threshold (e.g., 50px) to trigger before hitting hard top
            if (target.scrollTop <= 50) {
                this.popLoadHistory.emit();
            }
        }
        else if (this.sortOrder === 'newest') {
            // Reverse: Load history at bottom
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                this.popLoadHistory.emit();
            }
        }
    };
    showSortMenu = false;
    messagePlaceholder = '';
    guestPlaceholder = 'Please log in to chat';
    loginButtonText = 'Login to Chat';
    /**
     * Whether to show a link to the full chat application in the header
     */
    showFullChatLink = false;
    /**
     * The URL for the full chat link
     */
    fullChatLink = '/chat';
    popMessageEdited;
    /**
     * Emitted when a message is deleted
     */
    popMessageDeleted;
    // Auto-scroll State
    wasAtBottom = true;
    wasAtTop = true;
    shouldForceScroll = false;
    lastKnownMessageId = null;
    /**
     * Emitted when the user scrolls to the top of the history
     */
    popLoadHistory;
    get el() { return __stencil_getElement(this); }
    componentDidLoad() {
        this.sortOrder = this.defaultSort;
        const messagesContainer = this.el.querySelector('.messages');
        if (messagesContainer) {
            // Initial Scroll Position based on sort
            if (this.sortOrder === 'oldest') {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            else {
                messagesContainer.scrollTop = 0;
            }
            messagesContainer.addEventListener('scroll', this.handleScroll);
        }
    }
    componentWillUpdate() {
        const container = this.el.querySelector('.messages');
        if (container) {
            // Check if at bottom (with threshold)
            this.wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
            this.wasAtTop = container.scrollTop <= 20;
            // Parse current messages to check for new ones
            let msgs = [];
            try {
                msgs = typeof this.messages === 'string' ? JSON.parse(this.messages) : this.messages;
            }
            catch (e) { }
            if (msgs.length > 0) {
                // Check for new message
                // Strategy depends on sort? No, "new" is "newly added to list".
                // But effectively we want to track if a new message arrived.
                // We'll peek at the "latest" based on time if possible, or just change in ID/Length.
                // Simplest: Check if the set of IDs changed or length increased. 
                // But we only have `lastKnownMessageId`.
                // Let's assume the "Unread" message is the one with highest createdAt.
                // We'll just rely on determining if *any* message is new.
                // For auto-scroll:
                // If sort=oldest (Standard): Scroll to bottom if I posted OR if I was at bottom.
                // If sort=newest (Reverse): Scroll to top if I posted OR if I was at top.
                // Find the "newest" message in the list
                const sortedByTime = [...msgs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                const newestMsg = sortedByTime[sortedByTime.length - 1];
                if (newestMsg && newestMsg.id !== this.lastKnownMessageId) {
                    // New message detected
                    if (newestMsg.userId === this.currentUserId) {
                        this.shouldForceScroll = true;
                    }
                    this.lastKnownMessageId = newestMsg.id;
                }
            }
        }
    }
    componentDidUpdate() {
        const container = this.el.querySelector('.messages');
        if (container) {
            if (this.sortOrder === 'oldest') {
                if (this.shouldForceScroll || this.wasAtBottom) {
                    container.scrollTop = container.scrollHeight;
                }
            }
            else if (this.sortOrder === 'newest') {
                if (this.shouldForceScroll || this.wasAtTop) {
                    container.scrollTop = 0;
                }
            }
            // Popular: No auto-scroll usually?
            this.shouldForceScroll = false;
        }
    }
    disconnectedCallback() {
        const messagesContainer = this.el.querySelector('.messages');
        if (messagesContainer) {
            messagesContainer.removeEventListener('scroll', this.handleScroll);
        }
    }
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
    render() {
        let parsedMessages = [];
        try {
            if (typeof this.messages === 'string') {
                parsedMessages = JSON.parse(this.messages);
            }
            else {
                parsedMessages = this.messages;
            }
        }
        catch (e) {
            console.error('Invalid messages JSON', e);
        }
        const isThread = this.mode === 'thread';
        let finalMessages = [...parsedMessages];
        // Sort logic
        if (this.sortOrder === 'newest') {
            finalMessages.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }
        else if (this.sortOrder === 'oldest') {
            finalMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
        else if (this.sortOrder === 'popular') {
            finalMessages.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
        }
        // Determine placeholder
        let placeholder = this.guestPlaceholder;
        if (this.currentUserId) {
            if (this.messagePlaceholder) {
                placeholder = this.messagePlaceholder;
            }
            else {
                placeholder = isThread ? 'Reply to thread...' : `Message ${this.channelName}`;
            }
        }
        return (h("div", { key: '0', class: "chat-container" },
            h("header", { key: '1' },
                h("slot", { key: '2', name: "header-prefix" }),
                this.channelName,
                h("slot", { key: '3', name: "header-suffix" }),
                h("div", { key: '4', style: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' } },
                    h("div", { key: '5', class: "sort-menu-container", style: { position: 'relative' } },
                        h("button", { key: '6', class: "header-action-btn sort-btn", onClick: () => this.showSortMenu = !this.showSortMenu, title: "Sort Messages" },
                            h("svg", { key: '7', xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 512 512", style: { fill: 'currentColor' } },
                                h("path", { key: '8', d: "M472,168H40a24,24,0,0,1,0-48H472a24,24,0,0,1,0,48Z" }),
                                h("path", { key: '9', d: "M392,280H120a24,24,0,0,1,0-48H392a24,24,0,0,1,0,48Z" }),
                                h("path", { key: 'a', d: "M296,392H216a24,24,0,0,1,0-48h80a24,24,0,0,1,0,48Z" }))),
                        this.showSortMenu && (h("div", { key: 'b', class: "sort-dropdown", style: {
                                position: 'absolute',
                                top: '100%',
                                right: '0',
                                background: '#2f3136',
                                border: '1px solid #202225',
                                borderRadius: '4px',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                zIndex: '50',
                                marginTop: '4px',
                                minWidth: '150px'
                            } },
                            h("div", { key: 'c', class: { 'sort-option': true, 'active': this.sortOrder === 'newest' }, onClick: () => { this.sortOrder = 'newest'; this.showSortMenu = false; } }, "Newest First"),
                            h("div", { key: 'd', class: { 'sort-option': true, 'active': this.sortOrder === 'oldest' }, onClick: () => { this.sortOrder = 'oldest'; this.showSortMenu = false; } }, "Oldest First"),
                            h("div", { key: 'e', class: { 'sort-option': true, 'active': this.sortOrder === 'popular' }, onClick: () => { this.sortOrder = 'popular'; this.showSortMenu = false; } }, "Most Discussed")))),
                    this.showFullChatLink && (h("a", { key: 'f', href: this.fullChatLink, target: "_blank", class: "header-action-btn full-chat-link", title: "Open Full Chat", style: { display: 'flex', alignItems: 'center', color: '#b9bbbe', textDecoration: 'none' } },
                        h("svg", { key: 'g', xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 512 512", style: { fill: 'currentColor' } },
                            h("path", { key: 'h', d: "M384,224v184a40,40,0,0,1-40,40H104a40,40,0,0,1-40-40V168a40,40,0,0,1,40-40H288", style: { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' } }),
                            h("polyline", { key: 'i', points: "336 64 448 64 448 176", style: { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' } }),
                            h("line", { key: 'j', x1: "224", y1: "288", x2: "440", y2: "72", style: { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '32px' } })))))),
            h("div", { key: 'k', class: "messages" }, finalMessages.length === 0 ? (h("div", { class: "empty-state" }, "No messages yet. Be the first!")) : (finalMessages.map((msg) => (h("pop-message", { key: msg.id, message: msg, currentUserId: this.currentUserId, isThread: isThread, onPopThreadOpened: (e) => this.popThreadOpened.emit(e.detail), onPopMessageEdited: (e) => this.popMessageEdited.emit(e.detail), onPopMessageDeleted: (e) => this.popMessageDeleted.emit(e.detail) }))))),
            h("footer", { key: 'l' }, this.currentUserId ? (h("pop-message-box", { placeholder: placeholder, disabled: false, onSend: (e) => {
                    const detail = e.detail;
                    // Handle backward compatibility or object structure
                    this.inputText = typeof detail === 'string' ? detail : detail.text;
                    this.sendMessage();
                    e.target.clear();
                }, onValueChange: (e) => this.inputText = e.detail })) : (h("button", { class: "login-prompt-btn", onClick: () => this.popLoginRequested.emit() }, this.loginButtonText)))));
    }
    static get COMPILER_META() { return {
        "attachInternalsMemberName": null,
        "attachInternalsCustomStates": [],
        "formAssociated": false,
        "tagName": "pop-chat",
        "componentClassName": "PopChat",
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
                    "text": "JSON string of messages. Array of { id, text, userDisplayName, userId, createdAt }"
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
                    "text": "The name of the channel to display"
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
                    "text": "The ID of the current user (to align messages right)"
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
                    "text": "Mode of the chat: 'channel' (default) or 'thread' (hides thread controls)"
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
                    "text": "Whether to show a link to the full chat application in the header"
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
                    "text": "The URL for the full chat link"
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
                    "text": "Emitted when the user attempts to send a message"
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
                    "text": "Emitted when a user wants to open a thread"
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
                    "text": "Emitted when the user clicks 'Login'"
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
                    "original": "{ id: string, text: string }",
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
                    "text": "Emitted when a message is deleted"
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
                    "text": "Emitted when the user scrolls to the top of the history"
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
                "styleId": "POP-CHAT",
                "styleStr": null,
                "styleIdentifier": null,
                "externalStyles": [{
                        "absolutePath": "./ui-kit/organisms/chat/chat.css",
                        "relativePath": "chat.css",
                        "originalComponentPath": "chat.css"
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
        "hasVdomStyle": true,
        "hasVdomText": true,
        "hasSignalsImport": false,
        "hasWatchCallback": false,
        "isPlain": false,
        "htmlAttrNames": ["key", "class", "name", "style", "onClick", "title", "xmlns", "width", "height", "viewBox", "d", "href", "target", "points", "x1", "y1", "x2", "y2", "message", "currentUserId", "isThread", "onPopThreadOpened", "onPopMessageEdited", "onPopMessageDeleted", "placeholder", "disabled", "onSend", "onValueChange"],
        "htmlTagNames": ["div", "header", "slot", "button", "svg", "path", "a", "polyline", "line", "pop-message", "footer", "pop-message-box"],
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
//# sourceMappingURL=chat.js.map