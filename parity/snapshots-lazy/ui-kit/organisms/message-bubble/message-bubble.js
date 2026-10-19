import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import PopMessageBubbleStyle0 from "./ui-kit/organisms/message-bubble/message-bubble.css?tag=pop-message-bubble&encapsulation=scoped";
// Configure marked with highlight.js once at module load
const renderer = new Renderer();
renderer.code = ({ text, lang }) => {
    const validLang = lang && hljs.getLanguage(lang) ? lang : null;
    const highlighted = validLang
        ? hljs.highlight(text, { language: validLang }).value
        : hljs.highlightAuto(text).value;
    const langClass = lang ? ` language-${lang}` : '';
    return `<pre class="mb-code-block"><code class="hljs${langClass}">${highlighted}</code></pre>`;
};
marked.use({ renderer });
export const PopMessageBubble = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popThreadOpened = __stencil_createEvent(this, "popThreadOpened", 7);
        this.popMessageEdited = __stencil_createEvent(this, "popMessageEdited", 7);
        this.popMessageDeleted = __stencil_createEvent(this, "popMessageDeleted", 7);
        this.popCopied = __stencil_createEvent(this, "popCopied", 7);
    }
    /** Role determines layout: user = right bubble, assistant = left prose/bubble, member = Discord-style */
    role = 'member';
    /** Markdown content (plain text for member role) */
    content = '';
    /** Passed back in edit/delete events */
    messageId = '';
    /** bubble = rounded chat bubbles, prose = full-width document blocks */
    layout = 'bubble';
    /** Whether the message is still streaming in */
    streaming = false;
    /** inline = content builds token by token; dots = animated ellipsis while waiting */
    streamingMode = 'inline';
    /** Avatar image URL */
    avatarUrl = '';
    /** Fallback initials when no avatarUrl */
    avatarInitials = '';
    /** Display name shown in header */
    userName = '';
    /** Unix ms timestamp */
    timestamp = 0;
    /** Align bubble to the right (current user's own messages) */
    isOwn = false;
    /** Admin can delete any message */
    isAdmin = false;
    /** Show copy-to-clipboard button on AI messages */
    showCopyButton = false;
    /** When true, thread action is hidden (already inside a thread) */
    isThread = false;
    /** Thread reply count (member role) */
    threadCount = 0;
    /** Last reply preview text */
    threadPreview = '';
    /** Last reply author avatar */
    threadAvatarUrl = '';
    /** Last reply timestamp */
    threadLastAt = 0;
    /** JSON string of IntentChip[] shown on assistant messages after streaming */
    intents = '[]';
    parsedIntents = [];
    editing = false;
    editText = '';
    copied = false;
    popThreadOpened;
    popMessageEdited;
    popMessageDeleted;
    popCopied;
    componentWillLoad() {
        this.parseIntents();
    }
    parseIntents() {
        try {
            this.parsedIntents = JSON.parse(this.intents);
        }
        catch {
            this.parsedIntents = [];
        }
    }
    renderMarkdown(text) {
        if (!text)
            return '';
        const raw = marked.parse(text);
        if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
            return DOMPurify.sanitize(raw);
        }
        return raw;
    }
    formatRelativeTime(ts) {
        if (!ts)
            return '';
        const date = new Date(ts);
        const now = new Date();
        const isToday = now.toDateString() === date.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = yesterday.toDateString() === date.toDateString();
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isToday)
            return `Today at ${time}`;
        if (isYesterday)
            return `Yesterday at ${time}`;
        return date.toLocaleDateString();
    }
    handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(this.content);
            this.copied = true;
            this.popCopied.emit();
            setTimeout(() => { this.copied = false; }, 2000);
        }
        catch { /* clipboard may be unavailable */ }
    };
    handleTTS = () => {
        if (!('speechSynthesis' in window))
            return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(this.content);
        window.speechSynthesis.speak(utt);
    };
    handleSaveEdit = () => {
        if (!this.editText.trim())
            return;
        this.popMessageEdited.emit({ id: this.messageId, text: this.editText });
        this.editing = false;
    };
    handleDelete = () => {
        if (confirm('Delete this message?')) {
            this.popMessageDeleted.emit(this.messageId);
        }
    };
    intentColor(type) {
        const map = {
            task: '#3b82f6', event: '#22c55e', note: '#f59e0b',
            research: '#a855f7', quest: '#ec4899', unknown: '#6b7280',
        };
        return map[type] ?? map['unknown'];
    }
    intentIcon(type) {
        const icons = {
            task: '✓', event: '📅', note: '📝', research: '🔬', quest: '🗺️', unknown: '?',
        };
        return icons[type] ?? '?';
    }
    renderAvatar() {
        return (h("div", { class: "mb-avatar" }, this.avatarUrl
            ? h("img", { src: this.avatarUrl, alt: "", class: "mb-avatar-img" })
            : h("div", { class: "mb-avatar-fallback" }, (this.avatarInitials || '?').slice(0, 2).toUpperCase())));
    }
    renderBubbleContent() {
        if (this.streaming && this.streamingMode === 'dots') {
            return h("div", { class: "mb-dots" },
                h("span", null),
                h("span", null),
                h("span", null));
        }
        if (this.role === 'member') {
            return h("div", { class: "mb-text" }, this.content);
        }
        return (h("div", { class: { 'mb-markdown': true, 'mb-streaming': this.streaming }, innerHTML: this.renderMarkdown(this.content || (this.streaming ? '…' : '')) }));
    }
    render() {
        const isAI = this.role === 'assistant';
        const isUser = this.role === 'user';
        const isMember = this.role === 'member';
        const showOwnRight = isUser || (isMember && this.isOwn);
        return (h("div", { key: '0', class: {
                'mb-root': true,
                [`mb-role--${this.role}`]: true,
                [`mb-layout--${this.layout}`]: true,
                'mb-own': showOwnRight,
                'mb-editing': this.editing,
            } },
            (isAI || (isMember && !this.isOwn)) && this.renderAvatar(),
            h("div", { key: '1', class: "mb-body" },
                (isMember || isAI) && (this.userName || this.timestamp > 0) && (h("div", { key: '2', class: "mb-header" },
                    this.userName && h("span", { key: '3', class: "mb-name" }, this.userName),
                    this.timestamp > 0 && h("span", { key: '4', class: "mb-time" }, this.formatRelativeTime(this.timestamp)))),
                h("div", { key: '5', class: "mb-bubble-wrap" },
                    h("div", { key: '6', class: "mb-bubble" },
                        this.editing ? (h("div", { class: "mb-edit" },
                            h("textarea", { class: "mb-edit-textarea", value: this.editText, onInput: (e) => this.editText = e.target.value, onKeyDown: (e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        this.handleSaveEdit();
                                    }
                                    if (e.key === 'Escape') {
                                        this.editing = false;
                                    }
                                } }),
                            h("div", { class: "mb-edit-controls" },
                                h("span", { class: "mb-edit-hint" }, "esc to cancel \u00B7 enter to save"),
                                h("div", { class: "mb-edit-btns" },
                                    h("button", { class: "mb-btn-save", onClick: this.handleSaveEdit }, "Save"),
                                    h("button", { class: "mb-btn-cancel", onClick: () => { this.editing = false; } }, "Cancel"))))) : (this.renderBubbleContent()),
                        this.streaming && this.streamingMode === 'inline' && !this.editing && (h("span", { key: '7', class: "mb-cursor", "aria-hidden": "true" }))),
                    isAI && !this.streaming && !this.editing && (h("div", { key: '8', class: "mb-ai-actions" },
                        this.showCopyButton && (h("button", { key: '9', class: { 'mb-action-btn': true, 'mb-copied': this.copied }, title: this.copied ? 'Copied!' : 'Copy', onClick: this.handleCopy }, this.copied
                            ? h("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" },
                                h("polyline", { points: "20 6 9 17 4 12" }))
                            : h("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2" },
                                h("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }),
                                h("path", { d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" })))),
                        h("button", { key: 'a', class: "mb-action-btn", title: "Read aloud", onClick: this.handleTTS },
                            h("svg", { key: 'b', width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" },
                                h("polygon", { key: 'c', points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
                                h("path", { key: 'd', d: "M19.07 4.93a10 10 0 010 14.14" }),
                                h("path", { key: 'e', d: "M15.54 8.46a5 5 0 010 7.07" })))))),
                isAI && !this.streaming && this.parsedIntents.length > 0 && (h("div", { key: 'f', class: "mb-intents", role: "list", "aria-label": "Detected intents" }, this.parsedIntents.map((chip, i) => (h("span", { key: i, class: "mb-chip", role: "listitem", style: { '--chip-color': this.intentColor(chip.type) }, title: chip.type },
                    h("span", { class: "mb-chip-icon", "aria-hidden": "true" }, this.intentIcon(chip.type)),
                    chip.label))))),
                isMember && !this.isThread && this.threadCount > 0 && !this.editing && (h("pop-thread-summary", { key: 'g', messageId: this.messageId, threadCount: this.threadCount, threadPreview: this.threadPreview, threadAvatarUrl: this.threadAvatarUrl, threadLastAt: this.threadLastAt, onPopThreadOpened: (e) => this.popThreadOpened.emit(e.detail) }))),
            showOwnRight && this.renderAvatar(),
            isMember && !this.editing && (h("pop-message-actions", { key: 'h', messageId: this.messageId, isOwn: this.isOwn, isAdmin: this.isAdmin, isThread: this.isThread, threadCount: this.threadCount, onPopThreadOpened: (e) => this.popThreadOpened.emit(e.detail), onPopEditRequested: () => { this.editing = true; this.editText = this.content; }, onPopDeleteRequested: () => this.handleDelete() }))));
    }
    static get watchers() { return {
        "intents": [{
                "parseIntents": 0
            }]
    }; }
};
PopMessageBubble.style = PopMessageBubbleStyle0();
//# sourceMappingURL=message-bubble.js.map