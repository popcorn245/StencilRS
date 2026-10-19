import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/server";
import { h } from "@stencil/core/runtime/server";
import { MIC_DEVICE_KEY, TALKBACK_KEY } from './composer-keys';
import PopComposerStyle0 from "./ui-kit/organisms/composer/composer.css?tag=pop-composer&encapsulation=scoped";
export class PopComposer {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popSend = __stencil_createEvent(this, "popSend", 7);
        this.popSendAction = __stencil_createEvent(this, "popSendAction", 7);
        this.popValueChange = __stencil_createEvent(this, "popValueChange", 7);
        this.popMicRequested = __stencil_createEvent(this, "popMicRequested", 7);
        this.popMicDevice = __stencil_createEvent(this, "popMicDevice", 7);
        this.popTalkBack = __stencil_createEvent(this, "popTalkBack", 7);
        this.popAttach = __stencil_createEvent(this, "popAttach", 7);
    }
    get el() { return __stencil_getElement(this); }
    placeholder = 'Message…';
    value = '';
    disabled = false;
    /** Slash-commands offered by the `/` popover. Pass as a property (not stringified). */
    commands = [];
    /** Family members offered by the `@` popover. Pass as a property. */
    people = [];
    showMic = false;
    showAttach = true;
    /**
     * Submit-button glyph:
     *  - 'send' (default): the paper-plane arrow (a chat message).
     *  - 'add': a `+` (signals the submit CREATES something — e.g. a new thread).
     */
    submitIcon = 'send';
    /**
     * SECONDARY send actions. When non-empty, a press-and-hold (~450ms, mouse + touch)
     * on the send button opens a small popover ABOVE the button listing these actions.
     * A normal tap (no hold) performs the DEFAULT send (`popSend`); selecting a popover
     * item emits `popSendAction { id, text, … }`. Pass as a PROPERTY (not stringified).
     */
    sendActions = [];
    /** Emitted on send (Enter / tap / send button) — the default action. */
    popSend;
    /** Emitted when a SECONDARY action is chosen from the press-hold popover. */
    popSendAction;
    /** Emitted whenever the text changes. */
    popValueChange;
    /** Emitted when the mic button is pressed (consumer wires STT → setValue). */
    popMicRequested;
    /** Emitted when the active audio-input device changes (mic press-hold popover).
     *  Also persisted to localStorage[MIC_DEVICE_KEY] so the consumer's capture can
     *  read it. `deviceId === ''` means "System default". */
    popMicDevice;
    /** Emitted when the "Talk back" toggle flips (mic press-hold popover). Persisted
     *  to localStorage[TALKBACK_KEY]. Consumer speaks assistant replies when on. */
    popTalkBack;
    /** Emitted when images are attached. */
    popAttach;
    open = false;
    mode = 'command';
    items = [];
    activeIndex = 0;
    hasContent = false;
    pendingImages = [];
    /** Whether the press-and-hold send-actions popover is open. */
    actionsOpen = false;
    /** Keyboard-highlighted action index while the popover is open (-1 = none). */
    actionIndex = -1;
    // ── Mic press-hold popover state ──
    /** Whether the mic press-hold popover (device select + Talk back) is open. */
    micMenuOpen = false;
    /** Enumerated audio-input devices (empty until enumerated). */
    micDevices = [];
    /** The active input deviceId ('' = System default). Persisted. */
    micDeviceId = '';
    /** The "Talk back" (speak replies) toggle state. Persisted. */
    talkBack = false;
    /** A user-facing note when devices can't be listed (no perm / none). */
    micNote = '';
    editor;
    fileInput;
    /** Press-and-hold timer for the send button (long-press → open the popover). */
    holdTimer;
    /** Set true when a long-press fired so the subsequent click is suppressed. */
    holdFired = false;
    /** Bound outside-click listener (added only while the SEND popover is open). */
    onDocPointerDown;
    /** Press-and-hold timer for the MIC button. */
    micHoldTimer;
    /** Set true when a mic long-press fired (swallow the trailing click). */
    micHoldFired = false;
    /** Bound outside-click listener while the MIC popover is open. */
    onMicDocPointerDown;
    /** The mic wrapper (button + popover). Outside-click is scoped to THIS, not the
     *  whole composer host, so taps elsewhere in the composer dismiss the popover. */
    micHoldEl;
    componentDidLoad() {
        if (this.value)
            this.setEditorText(this.value);
        this.refreshHasContent();
        // Hydrate the persisted mic device + talk-back preferences.
        try {
            this.micDeviceId = localStorage.getItem(MIC_DEVICE_KEY) || '';
            this.talkBack = localStorage.getItem(TALKBACK_KEY) === '1';
        }
        catch { /* storage disabled — defaults are fine */ }
    }
    onValueProp(next) {
        // Controlled-ish: only push when the editor's plain text differs.
        if (this.editor && this.readText() !== next) {
            this.setEditorText(next || '');
            this.refreshHasContent();
        }
    }
    // ─────────────── public methods ───────────────
    async clear() {
        if (this.editor)
            this.editor.innerHTML = '';
        this.pendingImages = [];
        this.closePopover();
        this.refreshHasContent();
        this.popValueChange.emit('');
    }
    async setFocus() {
        this.editor?.focus();
    }
    async setValue(text) {
        this.setEditorText(text || '');
        this.refreshHasContent();
        this.popValueChange.emit(this.readText());
        this.editor?.focus();
        this.placeCaretAtEnd();
    }
    /** The active mic deviceId ('' = System default) — the consumer's voice capture
     *  should pass it as getUserMedia({ audio: { deviceId: { exact } } }). Reads the
     *  persisted value so it's correct even before the popover is opened. */
    async getMicDeviceId() {
        if (this.micDeviceId)
            return this.micDeviceId;
        try {
            return localStorage.getItem(MIC_DEVICE_KEY) || '';
        }
        catch {
            return '';
        }
    }
    // ─────────────── value <-> DOM ───────────────
    /** Plain text with mentions serialized as `@Name`. */
    readText() {
        if (!this.editor)
            return '';
        let out = '';
        this.editor.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE)
                out += node.textContent || '';
            else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node;
                if (el.dataset?.mentionId)
                    out += `@${el.dataset.mentionName || el.textContent?.replace(/^@/, '') || ''}`;
                else if (el.tagName === 'BR')
                    out += '\n';
                else
                    out += el.textContent || '';
            }
        });
        return out.replace(/ /g, ' ');
    }
    readMentions() {
        if (!this.editor)
            return [];
        const out = [];
        this.editor.querySelectorAll('[data-mention-id]').forEach((n) => {
            const el = n;
            out.push({ id: el.dataset.mentionId, name: el.dataset.mentionName || el.textContent?.replace(/^@/, '') || '' });
        });
        return out;
    }
    setEditorText(text) {
        if (!this.editor)
            return;
        this.editor.textContent = text;
    }
    refreshHasContent() {
        const hasText = this.readText().trim().length > 0;
        this.hasContent = hasText || this.pendingImages.length > 0;
    }
    // ─────────────── trigger detection ───────────────
    cursorContext() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount)
            return null;
        const range = sel.getRangeAt(0);
        if (!this.editor?.contains(range.startContainer))
            return null;
        if (range.startContainer.nodeType !== Node.TEXT_NODE)
            return null;
        const node = range.startContainer;
        const pos = range.startOffset;
        return { node, before: (node.textContent || '').slice(0, pos), pos };
    }
    /** Find a trigger (`/` or `@`) at the start of the current token. */
    triggerMatch(before) {
        for (const trigger of ['/', '@']) {
            const idx = before.lastIndexOf(trigger);
            if (idx === -1)
                continue;
            // must be at start or preceded by whitespace
            if (idx > 0 && !/\s/.test(before[idx - 1]))
                continue;
            const query = before.slice(idx + 1);
            if (/\s/.test(query))
                continue; // a space closes the token
            return { trigger, query };
        }
        return null;
    }
    /** Pure: the popover items for a trigger + query (exported via instance for tests). */
    filterItems(trigger, query) {
        const q = query.toLowerCase();
        if (trigger === '/') {
            return this.commands
                .filter((c) => c.name.toLowerCase().includes(q))
                .slice(0, 50)
                .map((c) => ({ key: c.name, label: `/${c.name}`, detail: c.description }));
        }
        return this.people
            .filter((p) => p.name.toLowerCase().includes(q))
            .slice(0, 50)
            .map((p) => ({ key: p.id, label: p.name, avatar: p.avatar }));
    }
    refreshPopover() {
        const ctx = this.cursorContext();
        if (!ctx)
            return this.closePopover();
        const match = this.triggerMatch(ctx.before);
        if (!match)
            return this.closePopover();
        const items = this.filterItems(match.trigger, match.query);
        if (items.length === 0)
            return this.closePopover();
        this.openPopover(match.trigger === '/' ? 'command' : 'mention', items);
    }
    openPopover(mode, items) {
        this.mode = mode;
        this.items = items;
        this.activeIndex = 0;
        this.open = true;
    }
    closePopover() {
        this.open = false;
        this.items = [];
    }
    // ─────────────── insert ───────────────
    accept(item) {
        const ctx = this.cursorContext();
        if (!ctx)
            return this.closePopover();
        const trigger = this.mode === 'command' ? '/' : '@';
        const idx = ctx.before.lastIndexOf(trigger);
        if (idx === -1)
            return this.closePopover();
        const full = ctx.node.textContent || '';
        const prefix = full.slice(0, idx);
        const suffix = full.slice(ctx.pos);
        const parent = ctx.node.parentNode;
        if (!parent)
            return this.closePopover();
        const prefixNode = document.createTextNode(prefix);
        const spaceNode = document.createTextNode(' ');
        const suffixNode = document.createTextNode(suffix);
        parent.insertBefore(prefixNode, ctx.node);
        if (this.mode === 'command') {
            // commands insert as plain TEXT: `/name `
            parent.insertBefore(document.createTextNode(`/${item.key}`), ctx.node);
        }
        else {
            // people insert as a styled PILL carrying the uid
            parent.insertBefore(this.buildPill(item.key, item.label), ctx.node);
        }
        parent.insertBefore(spaceNode, ctx.node);
        parent.insertBefore(suffixNode, ctx.node);
        parent.removeChild(ctx.node);
        const sel = window.getSelection();
        if (sel) {
            const r = document.createRange();
            r.setStartAfter(spaceNode);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        }
        this.closePopover();
        this.refreshHasContent();
        this.popValueChange.emit(this.readText());
    }
    buildPill(id, name) {
        const span = document.createElement('span');
        span.className = 'pc__pill';
        span.dataset.mentionId = id;
        span.dataset.mentionName = name;
        span.contentEditable = 'false';
        span.textContent = `@${name}`;
        return span;
    }
    // ─────────────── handlers ───────────────
    onInput = () => {
        this.refreshHasContent();
        this.popValueChange.emit(this.readText());
        this.refreshPopover();
    };
    onKeyDown = (e) => {
        if (this.open && this.items.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.activeIndex = (this.activeIndex + 1) % this.items.length;
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.activeIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                this.accept(this.items[this.activeIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closePopover();
                return;
            }
            if (e.key === ' ') {
                this.closePopover(); /* let the space type */
            }
        }
        if (e.key === 'Enter' && !e.shiftKey && !this.open) {
            e.preventDefault();
            this.send();
            return;
        }
        if (e.key === 'Backspace') {
            // delete a pill when the caret sits right after it
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount)
                return;
            const range = sel.getRangeAt(0);
            if (range.collapsed && range.startOffset === 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
                const prev = range.startContainer.previousSibling;
                if (prev?.dataset?.mentionId) {
                    e.preventDefault();
                    prev.remove();
                    this.refreshHasContent();
                    this.popValueChange.emit(this.readText());
                }
            }
        }
    };
    onPaste = (e) => {
        // plain text only (keep the slim composer free of pasted rich markup)
        const txt = e.clipboardData?.getData('text/plain');
        if (txt != null) {
            e.preventDefault();
            document.execCommand('insertText', false, txt);
        }
    };
    send = () => {
        if (this.disabled)
            return;
        const text = this.readText().trim();
        const images = this.pendingImages.slice();
        if (!text && images.length === 0)
            return;
        this.popSend.emit({ text, mentions: this.readMentions(), images: images.length ? images : undefined });
        void this.clear();
    };
    // ─────────────── press-and-hold send-actions popover ───────────────
    get hasActions() {
        return Array.isArray(this.sendActions) && this.sendActions.length > 0;
    }
    /** Fire a SECONDARY action: emit popSendAction with the current text, then clear. */
    runAction = (id) => {
        if (this.disabled)
            return;
        const text = this.readText().trim();
        const images = this.pendingImages.slice();
        this.closeActions();
        this.popSendAction.emit({ id, text, mentions: this.readMentions(), images: images.length ? images : undefined });
        void this.clear();
    };
    openActions = () => {
        if (this.disabled || !this.hasActions)
            return;
        this.actionsOpen = true;
        this.actionIndex = -1;
        // Outside-click closes the popover (capture so it beats inner stopPropagation).
        this.onDocPointerDown = (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            if (!path.includes(this.el))
                this.closeActions();
        };
        document.addEventListener('pointerdown', this.onDocPointerDown, true);
    };
    closeActions = () => {
        if (!this.actionsOpen && this.actionIndex === -1)
            return;
        this.actionsOpen = false;
        this.actionIndex = -1;
        if (this.onDocPointerDown) {
            document.removeEventListener('pointerdown', this.onDocPointerDown, true);
            this.onDocPointerDown = undefined;
        }
    };
    /** Pointer-down on the send button arms the hold timer (mouse + touch). */
    onSendPointerDown = () => {
        if (this.disabled || !this.hasActions)
            return;
        this.holdFired = false;
        this.clearHold();
        this.holdTimer = setTimeout(() => {
            this.holdFired = true;
            this.openActions();
        }, 450);
    };
    clearHold = () => {
        if (this.holdTimer) {
            clearTimeout(this.holdTimer);
            this.holdTimer = undefined;
        }
    };
    /** Tap on the send button → DEFAULT send, UNLESS a press-and-hold just opened the
     *  popover (swallow that trailing click). */
    onSendClick = () => {
        this.clearHold();
        if (this.holdFired) {
            this.holdFired = false;
            return;
        }
        this.send();
    };
    /** Arrow-key navigation + Esc inside the popover (anchored on the send button). */
    onActionsKeyDown = (e) => {
        const n = this.sendActions.length;
        if (!this.actionsOpen || n === 0)
            return;
        if (e.key === 'Escape') {
            e.preventDefault();
            this.closeActions();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.actionIndex = (this.actionIndex + 1) % n;
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.actionIndex = (this.actionIndex - 1 + n) % n;
            return;
        }
        if (e.key === 'Enter' && this.actionIndex >= 0) {
            e.preventDefault();
            this.runAction(this.sendActions[this.actionIndex].id);
            return;
        }
    };
    // ─────────────── press-and-hold MIC popover (device select + talk-back) ───────
    /** Pointer-down on the mic arms the hold timer (mouse + touch). A hold opens the
     *  popover; a plain tap keeps the existing voice-input behavior (popMicRequested). */
    onMicPointerDown = () => {
        if (this.disabled)
            return;
        this.micHoldFired = false;
        this.clearMicHold();
        this.micHoldTimer = setTimeout(() => {
            this.micHoldFired = true;
            void this.openMicMenu();
        }, 450);
    };
    clearMicHold = () => {
        if (this.micHoldTimer) {
            clearTimeout(this.micHoldTimer);
            this.micHoldTimer = undefined;
        }
    };
    /** Tap the mic → the existing voice input, UNLESS a hold just opened the popover. */
    onMicClick = () => {
        this.clearMicHold();
        if (this.micHoldFired) {
            this.micHoldFired = false;
            return;
        }
        this.popMicRequested.emit();
    };
    openMicMenu = async () => {
        this.micMenuOpen = true;
        this.micNote = '';
        this.onMicDocPointerDown = (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            // Scope the containment test to the mic wrapper (button + popover) rather
            // than the whole composer host, so a tap anywhere ELSE in the composer
            // (the text input, send button, empty gutter) dismisses the popover.
            const anchor = this.micHoldEl ?? this.el;
            if (!path.includes(anchor))
                this.closeMicMenu();
        };
        document.addEventListener('pointerdown', this.onMicDocPointerDown, true);
        await this.enumerateMics();
    };
    closeMicMenu = () => {
        if (!this.micMenuOpen)
            return;
        this.micMenuOpen = false;
        if (this.onMicDocPointerDown) {
            document.removeEventListener('pointerdown', this.onMicDocPointerDown, true);
            this.onMicDocPointerDown = undefined;
        }
    };
    /** Enumerate audio-input devices. Labels need mic permission — if they're blank,
     *  request getUserMedia once to populate them, then stop the tracks. Graceful on
     *  no-devices / permission-denied (sets a note). */
    async enumerateMics() {
        const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
        if (!md?.enumerateDevices) {
            this.micNote = 'Audio device selection isn’t supported here.';
            this.micDevices = [];
            return;
        }
        try {
            let devices = await md.enumerateDevices();
            let inputs = devices.filter((d) => d.kind === 'audioinput');
            // Labels are empty until permission is granted → request once to populate.
            const needLabels = inputs.length === 0 || inputs.every((d) => !d.label);
            if (needLabels && md.getUserMedia) {
                try {
                    const stream = await md.getUserMedia({ audio: true });
                    stream.getTracks().forEach((t) => t.stop());
                    devices = await md.enumerateDevices();
                    inputs = devices.filter((d) => d.kind === 'audioinput');
                }
                catch {
                    this.micNote = 'Allow microphone access to choose a device.';
                }
            }
            this.micDevices = inputs.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Microphone ${i + 1}`,
            }));
            if (this.micDevices.length === 0 && !this.micNote)
                this.micNote = 'No microphones found.';
        }
        catch {
            this.micNote = 'Couldn’t list microphones.';
            this.micDevices = [];
        }
    }
    /** Select an input device: persist it, emit popMicDevice. '' = System default. */
    pickMicDevice = (deviceId) => {
        this.micDeviceId = deviceId;
        try {
            localStorage.setItem(MIC_DEVICE_KEY, deviceId);
        }
        catch { /* ignore */ }
        this.popMicDevice.emit({ deviceId });
    };
    /** Flip the Talk-back toggle: persist + emit. */
    toggleTalkBack = () => {
        this.talkBack = !this.talkBack;
        try {
            localStorage.setItem(TALKBACK_KEY, this.talkBack ? '1' : '0');
        }
        catch { /* ignore */ }
        this.popTalkBack.emit({ on: this.talkBack });
    };
    /** Esc closes the mic popover (anchored on the mic button). */
    onMicMenuKeyDown = (e) => {
        if (this.micMenuOpen && e.key === 'Escape') {
            e.preventDefault();
            this.closeMicMenu();
        }
    };
    disconnectedCallback() {
        this.clearHold();
        this.clearMicHold();
        if (this.onDocPointerDown) {
            document.removeEventListener('pointerdown', this.onDocPointerDown, true);
            this.onDocPointerDown = undefined;
        }
        if (this.onMicDocPointerDown) {
            document.removeEventListener('pointerdown', this.onMicDocPointerDown, true);
            this.onMicDocPointerDown = undefined;
        }
    }
    onAttachClick = () => this.fileInput?.click();
    onFiles = (e) => {
        const input = e.target;
        const files = Array.from(input.files || []).filter((f) => f.type.startsWith('image/'));
        if (files.length) {
            this.pendingImages = [...this.pendingImages, ...files];
            this.refreshHasContent();
            this.popAttach.emit(files);
        }
        input.value = '';
    };
    removeImage(i) {
        this.pendingImages = this.pendingImages.filter((_, idx) => idx !== i);
        this.refreshHasContent();
    }
    placeCaretAtEnd() {
        if (!this.editor)
            return;
        const sel = window.getSelection();
        if (!sel)
            return;
        const r = document.createRange();
        r.selectNodeContents(this.editor);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
    }
    /** The default send glyph (paper-plane, or the `+` when submitIcon='add'). */
    defaultSendGlyph() {
        // pop-icon centers the glyph perfectly (no baseline drift). `add` mode → a
        // plus; normal → the paper-plane send glyph.
        return this.submitIcon === 'add'
            ? h("pop-icon", { class: "pc__glyph", name: "add" })
            : h("pop-icon", { class: "pc__glyph", name: "paper-plane" });
    }
    /** Plain (no sendActions) send button — the original behavior, unchanged. */
    renderSend() {
        return (h("button", { type: "button", class: "pc__send", "aria-label": this.submitIcon === 'add' ? 'Add to a new thread' : 'Send', disabled: this.disabled || !this.hasContent, onClick: this.send }, this.defaultSendGlyph()));
    }
    /** A small inline glyph for a popover item: an ion-icon (named) OR a literal char/emoji. */
    renderActionIcon(icon) {
        if (!icon)
            return null;
        const isIonName = /^[a-z][a-z0-9-]+$/.test(icon) && icon.length > 1;
        return isIonName
            ? h("pop-icon", { class: "pc__act-icon", name: icon })
            : h("span", { class: "pc__act-icon pc__act-glyph", "aria-hidden": "true" }, icon);
    }
    /** Send button with a press-and-hold popover of secondary actions. A normal tap
     *  performs the DEFAULT send; a press-and-hold opens the popover ABOVE the button. */
    renderHoldSend() {
        const disabled = this.disabled || !this.hasContent;
        return (h("div", { class: "pc__sendhold", onKeyDown: this.onActionsKeyDown },
            this.actionsOpen && (h("div", { class: "pc__actions", role: "menu", "aria-label": "Send options" }, this.sendActions.map((a, i) => (h("button", { type: "button", role: "menuitem", key: a.id, class: { 'pc__act': true, 'pc__act--active': i === this.actionIndex }, onMouseEnter: () => (this.actionIndex = i), onClick: (ev) => { ev.stopPropagation(); this.runAction(a.id); } },
                this.renderActionIcon(a.icon),
                h("span", { class: "pc__act-label" }, a.label)))))),
            h("button", { type: "button", class: "pc__send pc__send--hold", "aria-label": this.submitIcon === 'add' ? 'Add to a new thread' : 'Send', "aria-haspopup": "menu", "aria-expanded": this.actionsOpen ? 'true' : 'false', disabled: disabled, onClick: this.onSendClick, onMouseDown: this.onSendPointerDown, onMouseUp: this.clearHold, onMouseLeave: this.clearHold, onTouchStart: this.onSendPointerDown, onTouchEnd: this.clearHold, onTouchCancel: this.clearHold, onContextMenu: (e) => e.preventDefault() }, this.defaultSendGlyph())));
    }
    /** Mic button with a press-and-hold popover: audio-input device select + a
     *  "Talk back" toggle. A normal tap = voice input (popMicRequested); a hold opens
     *  the popover ABOVE the button (same mechanics as the send-actions popover). */
    renderMic() {
        return (h("div", { class: "pc__michold", ref: (el) => (this.micHoldEl = el), onKeyDown: this.onMicMenuKeyDown },
            this.micMenuOpen && (h("div", { class: "pc__micmenu", role: "menu", "aria-label": "Microphone options" },
                h("div", { class: "pc__micmenu-head" }, "Microphone"),
                this.micDevices.length > 0 ? (h("div", { class: "pc__micmenu-list" },
                    h("button", { type: "button", role: "menuitemradio", "aria-checked": this.micDeviceId === '' ? 'true' : 'false', class: { 'pc__micitem': true, 'pc__micitem--active': this.micDeviceId === '' }, onClick: (e) => { e.stopPropagation(); this.pickMicDevice(''); } },
                        h("span", { class: "pc__micitem-label" }, "System default"),
                        this.micDeviceId === '' && h("pop-icon", { class: "pc__micitem-check", name: "checkmark" })),
                    this.micDevices.map((d) => (h("button", { type: "button", role: "menuitemradio", key: d.deviceId, "aria-checked": this.micDeviceId === d.deviceId ? 'true' : 'false', class: { 'pc__micitem': true, 'pc__micitem--active': this.micDeviceId === d.deviceId }, onClick: (e) => { e.stopPropagation(); this.pickMicDevice(d.deviceId); } },
                        h("span", { class: "pc__micitem-label" }, d.label),
                        this.micDeviceId === d.deviceId && h("pop-icon", { class: "pc__micitem-check", name: "checkmark" })))))) : (h("div", { class: "pc__micmenu-note" }, this.micNote || 'No microphones found.')),
                h("button", { type: "button", role: "switch", "aria-checked": this.talkBack ? 'true' : 'false', class: "pc__micitem pc__talkback", onClick: (e) => { e.stopPropagation(); this.toggleTalkBack(); } },
                    h("pop-icon", { class: "pc__micitem-lead", name: this.talkBack ? 'volume-high' : 'volume-mute-outline' }),
                    h("span", { class: "pc__micitem-label" }, "Talk back"),
                    h("span", { class: { 'pc__switch': true, 'pc__switch--on': this.talkBack }, "aria-hidden": "true" },
                        h("span", { class: "pc__switch-knob" }))))),
            h("button", { type: "button", class: "pc__icon pc__icon--mic", "aria-label": "Record voice", "aria-haspopup": "menu", "aria-expanded": this.micMenuOpen ? 'true' : 'false', disabled: this.disabled, onClick: this.onMicClick, onMouseDown: this.onMicPointerDown, onMouseUp: this.clearMicHold, onMouseLeave: this.clearMicHold, onTouchStart: this.onMicPointerDown, onTouchEnd: this.clearMicHold, onTouchCancel: this.clearMicHold, onContextMenu: (e) => e.preventDefault() },
                h("pop-icon", { class: "pc__glyph", name: "mic-outline" }))));
    }
    render() {
        return (h("div", { key: '0', class: "pc" },
            this.open && this.items.length > 0 && (h("div", { key: '1', class: "pc__popover", role: "listbox", "aria-label": this.mode === 'command' ? 'Commands' : 'People' }, this.items.map((it, i) => (h("button", { type: "button", role: "option", "aria-selected": i === this.activeIndex ? 'true' : 'false', class: { 'pc__opt': true, 'pc__opt--active': i === this.activeIndex }, onMouseDown: (ev) => { ev.preventDefault(); this.accept(it); }, onMouseEnter: () => (this.activeIndex = i) },
                this.mode === 'mention'
                    ? (it.avatar
                        ? h("span", { class: "pc__opt-avatar" },
                            h("img", { src: it.avatar, alt: "" }))
                        : h("span", { class: "pc__opt-avatar pc__opt-avatar--initial" }, (it.label[0] || '@').toUpperCase()))
                    : h("span", { class: "pc__opt-icon" }, "/"),
                h("span", { class: "pc__opt-text" },
                    h("span", { class: "pc__opt-label" }, it.label),
                    it.detail && h("span", { class: "pc__opt-detail" }, it.detail))))))),
            this.pendingImages.length > 0 && (h("div", { key: '2', class: "pc__attachments" }, this.pendingImages.map((f, i) => (h("span", { class: "pc__chip" },
                "\uD83D\uDDBC\uFE0F ",
                f.name.length > 18 ? f.name.slice(0, 16) + '…' : f.name,
                h("button", { type: "button", class: "pc__chip-x", "aria-label": "Remove", onClick: () => this.removeImage(i) }, "\u00D7")))))),
            h("div", { key: '3', class: { 'pc__bar': true, 'pc__bar--disabled': this.disabled } },
                this.showAttach && (h("button", { key: '4', type: "button", class: "pc__icon", "aria-label": "Attach image", disabled: this.disabled, onClick: this.onAttachClick },
                    h("pop-icon", { key: '5', class: "pc__glyph", name: "attach-outline" }))),
                h("div", { key: '6', class: "pc__editor", contentEditable: !this.disabled, role: "textbox", "aria-multiline": "true", "data-placeholder": this.placeholder, ref: (el) => (this.editor = el), onInput: this.onInput, onKeyDown: this.onKeyDown, onPaste: this.onPaste, onBlur: () => setTimeout(() => this.closePopover(), 120) }),
                this.showMic && this.renderMic(),
                this.hasActions ? this.renderHoldSend() : this.renderSend()),
            h("input", { key: '7', type: "file", accept: "image/*", multiple: true, class: "pc__file", ref: (el) => (this.fileInput = el), onChange: this.onFiles })));
    }
    static get watchers() { return {
        "value": [{
                "onValueProp": 0
            }]
    }; }
    static get style() { return PopComposerStyle0(); }
    static get cmpMeta() { return {
        "$flags$": 514,
        "$tagName$": "pop-composer",
        "$members$": {
            "placeholder": [1],
            "value": [1],
            "disabled": [4],
            "commands": [16],
            "people": [16],
            "showMic": [4, "show-mic"],
            "showAttach": [4, "show-attach"],
            "submitIcon": [1, "submit-icon"],
            "sendActions": [16],
            "open": [32],
            "mode": [32],
            "items": [32],
            "activeIndex": [32],
            "hasContent": [32],
            "pendingImages": [32],
            "actionsOpen": [32],
            "actionIndex": [32],
            "micMenuOpen": [32],
            "micDevices": [32],
            "micDeviceId": [32],
            "talkBack": [32],
            "micNote": [32],
            "clear": [64],
            "setFocus": [64],
            "setValue": [64],
            "getMicDeviceId": [64]
        },
        "$listeners$": undefined,
        "$lazyBundleId$": "-",
        "$attrsToReflect$": []
    }; }
}
//# sourceMappingURL=composer.js.map