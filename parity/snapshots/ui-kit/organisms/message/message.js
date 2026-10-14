import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopMessageStyle0 from "./ui-kit/organisms/message/message.css?tag=pop-message&encapsulation=scoped";
const PopMessage = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.popThreadOpened = __stencil_createEvent(this, "popThreadOpened", 7);
        this.popMessageEdited = __stencil_createEvent(this, "popMessageEdited", 7);
        this.popMessageDeleted = __stencil_createEvent(this, "popMessageDeleted", 7);
    }
    /**
     * The message object (serialized or object)
     */
    message = {};
    /**
     * The current user's ID
     */
    currentUserId = '';
    /**
     * Whether this message is displayed inside a thread view (hides thread actions, changes context)
     */
    isThread = false;
    /**
     * Whether the current user has admin privileges (allows deleting any message)
     */
    isAdmin = false;
    /**
     * Emitted when a user wants to open a thread
     */
    popThreadOpened;
    /**
     * Emitted when a message is edited
     */
    popMessageEdited;
    /**
     * Emitted when a message is deleted
     */
    popMessageDeleted;
    innerMessage = {};
    editing = false;
    editInputText = '';
    componentWillLoad() {
        this.parseMessage();
    }
    parseMessage() {
        try {
            let msg = {};
            if (typeof this.message === 'string') {
                msg = JSON.parse(this.message);
            }
            else {
                msg = this.message || {};
            }
            // Helper to normalize dates
            const normalize = (date) => {
                if (!date)
                    return null;
                if (typeof date === 'number' || typeof date === 'string')
                    return date;
                // Firestore Timestamp (object or instance)
                if (typeof date.toMillis === 'function')
                    return date.toMillis();
                if ('seconds' in date)
                    return date.seconds * 1000;
                return date;
            };
            if (msg.createdAt)
                msg.createdAt = normalize(msg.createdAt);
            if (msg.lastReplyAt)
                msg.lastReplyAt = normalize(msg.lastReplyAt);
            this.innerMessage = msg;
        }
        catch (e) {
            console.error('PopMessage: Invalid message prop', e);
            this.innerMessage = {};
        }
    }
    handleEditClick = () => {
        // Just in case
        if (this.currentUserId !== this.innerMessage.userId)
            return;
        this.editing = true;
        this.editInputText = this.innerMessage.text;
    };
    handleCancelEdit = () => {
        this.editing = false;
        this.editInputText = '';
    };
    handleSaveEdit = () => {
        if (!this.editInputText.trim())
            return;
        this.popMessageEdited.emit({ id: this.innerMessage.id, text: this.editInputText });
        this.editing = false;
    };
    handleDeleteClick = () => {
        if (confirm("Are you sure you want to delete this message?")) {
            this.popMessageDeleted.emit(this.innerMessage.id);
        }
    };
    formatRelativeTime(dateInput) {
        if (!dateInput)
            return '';
        const date = new Date(dateInput);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 1)
            return date.toLocaleDateString();
        if (days === 1)
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        if (now.getDate() !== date.getDate())
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    formatShortRelativeTime(dateInput) {
        if (!dateInput)
            return '';
        const date = new Date(dateInput);
        const now = new Date();
        const diff = (now.getTime() - date.getTime()) / 1000; // seconds
        if (diff < 60)
            return 'Just now';
        if (diff < 3600)
            return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400)
            return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800)
            return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    }
    render() {
        const msg = this.innerMessage;
        const isOwner = msg.userId === this.currentUserId;
        return (h("div", { class: {
                'message': true,
                'mine': isOwner,
                'editing': this.editing
            }, key: msg.id },
            h("div", { key: '0', class: "message-avatar" },
                h("img", { key: '1', src: msg.userPhotoUrl || 'https://via.placeholder.com/40', alt: "Avatar", style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }, onError: (e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${msg.userDisplayName || '?'}&background=random`; } })),
            h("div", { key: '2', class: "message-content-wrapper" },
                h("div", { key: '3', class: "message-header" },
                    h("span", { key: '4', class: "message-meta" }, msg.userDisplayName || 'Anonymous'),
                    msg.createdAt && h("span", { key: '5', class: "message-time" }, this.formatRelativeTime(msg.createdAt))),
                this.editing ? (h("div", { class: "edit-mode" },
                    h("textarea", { class: "edit-textarea", value: this.editInputText, onInput: (e) => this.editInputText = e.target.value, onKeyDown: (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                this.handleSaveEdit();
                            }
                            if (e.key === 'Escape')
                                this.handleCancelEdit();
                        } }),
                    h("div", { class: "edit-controls" },
                        h("span", { class: "edit-hint" }, "escape to cancel \u2022 enter to save"),
                        h("div", { class: "edit-buttons" },
                            h("button", { class: "save-edit-btn", onClick: () => this.handleSaveEdit() }, "Save"),
                            h("button", { class: "cancel-edit-btn", onClick: this.handleCancelEdit }, "Cancel"))))) : (h("div", { class: "message-text" },
                    msg.imageUrl && (h("img", { src: msg.imageUrl, style: { maxWidth: '300px', maxHeight: '300px', borderRadius: '4px', display: 'block', marginBottom: '8px' } })),
                    msg.text)),
                !this.isThread && msg.replyCount > 0 && !this.editing && (h("div", { key: '6', class: "thread-summary", onClick: () => this.popThreadOpened.emit(msg) },
                    h("div", { key: '7', class: "thread-spine" }),
                    h("div", { key: '8', class: "thread-info" },
                        h("div", { key: '9', style: { display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', maxWidth: '250px' } },
                            h("img", { key: 'a', src: msg.lastReplyUserPhotoUrl || 'https://via.placeholder.com/16', style: { width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' } }),
                            h("span", { key: 'b', style: { fontSize: '0.85em', color: '#b9bbbe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' } }, msg.lastReplyText || 'Thread reply...')),
                        msg.lastReplyAt && (h("span", { key: 'c', style: { fontSize: '0.75em', color: '#72767d', marginLeft: '4px', whiteSpace: 'nowrap' } }, this.formatShortRelativeTime(msg.lastReplyAt))))))),
            !this.editing && (h("div", { key: 'd', class: {
                    'message-actions-container': true,
                    'has-thread': msg.replyCount > 0
                } },
                !this.isThread && (h("button", { key: 'e', class: {
                        'thread-btn': true,
                        'action-btn': true,
                        'thread-visible': msg.replyCount > 0
                    }, onClick: () => this.popThreadOpened.emit(msg), title: msg.replyCount ? "View Thread" : "Start Thread" },
                    h("div", { key: 'f', style: { display: 'flex' } },
                        h("svg", { key: 'g', xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 512 512", style: { fill: 'currentColor' } },
                            h("path", { key: 'h', d: "M448,440a16,16,0,0,1-12.61-6.15c-22.86-29.27-44.07-51.86-73.32-67C335,352.88,301,345.59,256,344.23V424A16,16,0,0,1,229,435.57l-176-168a16,16,0,0,1,0-23.14l176-168A16,16,0,0,1,256,88v80.36c74.14,3.41,129.38,30.91,164.35,81.87C449.32,292.44,464,350.9,464,424a16,16,0,0,1-16,16Z" }))),
                    msg.replyCount > 0 && (h("div", { key: 'i', style: { position: 'absolute', top: '-4px', right: '-6px', background: '#5865f2', color: 'white', fontSize: '0.65em', fontWeight: 'bold', padding: '1px 4px', borderRadius: '8px', minWidth: '14px', textAlign: 'center', border: '2px solid #2f3136', lineHeight: '1' } }, msg.replyCount)))),
                (isOwner || this.isAdmin) && ([
                    isOwner && (h("button", { key: 'j', class: "action-btn edit-btn", title: "Edit", onClick: this.handleEditClick },
                        h("svg", { key: 'k', xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 512 512" },
                            h("polygon", { key: 'l', points: "358.62 129.28 86.49 402.08 70 442 109.92 425.51 382.72 153.38 358.62 129.28", style: { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '44px' } }),
                            h("path", { key: 'm', d: "M413.07,74.84,401.28,86.62l24.1,24.1,11.79-11.79a16.51,16.51,0,0,0,0-23.34l-.75-.75A16.51,16.51,0,0,0,413.07,74.84Z", style: { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '44px' } })))),
                    h("button", { key: 'n', class: "action-btn delete-btn", title: "Delete", onClick: this.handleDeleteClick },
                        h("svg", { key: 'o', xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 512 512", style: { fill: 'currentColor' } },
                            h("path", { key: 'p', d: "M296,64H216a7.91,7.91,0,0,0-8,8V96h96V72A7.91,7.91,0,0,0,296,64Z" }),
                            h("path", { key: 'q', d: "M432,96H336V72a40,40,0,0,0-40-40H216a40,40,0,0,0-40,40V96H80a16,16,0,0,0,0,32H97L116,432.92c1.42,26.85,22,47.08,48,47.08H348c26.13,0,46.3-19.78,48-47L415,128h17a16,16,0,0,0,0-32ZM192.57,416H192a16,16,0,0,1-16-15.43l-8-224a16,16,0,1,1,32-1.14l8,224A16,16,0,0,1,192.57,416ZM272,400a16,16,0,0,1-32,0V176a16,16,0,0,1,32,0ZM304,96H208V72a7.91,7.91,0,0,1,8-8h80a7.91,7.91,0,0,1,8,8Zm32,304.57A16,16,0,0,1,320,416h-.58A16,16,0,0,1,304,399.43l8-224a16,16,0,1,1,32,1.14Z" })))
                ])))));
    }
    static get watchers() { return {
        "message": [{
                "parseMessage": 0
            }]
    }; }
    static get style() { return PopMessageStyle0(); }
};
__stencil_defineCustomElement(PopMessage, [514, "pop-message", {
        "message": [8],
        "currentUserId": [1, "current-user-id"],
        "isThread": [4, "is-thread"],
        "isAdmin": [4, "is-admin"],
        "innerMessage": [32],
        "editing": [32],
        "editInputText": [32]
    }, undefined, {
        "message": [{
                "parseMessage": 0
            }]
    }]);
//# sourceMappingURL=message.js.map