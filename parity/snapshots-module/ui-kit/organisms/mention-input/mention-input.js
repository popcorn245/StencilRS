import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopMentionInputStyle0 from "./ui-kit/organisms/mention-input/mention-input.css?tag=pop-mention-input&encapsulation=scoped";
export const PopMentionInput = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
        this.submitted = __stencil_createEvent(this, "submitted", 7);
        this.mentionAdded = __stencil_createEvent(this, "mentionAdded", 7);
    }
    get el() { return this; }
    placeholder = '';
    /** Mention sources. Passed as a property; do not stringify. */
    sources = [];
    /** If true, the [➕] submit button is disabled regardless of internal state. */
    submitDisabled = false;
    /** Label for the submit button. Default is the ➕ emoji. */
    submitButtonLabel = '➕';
    /** Optional controlled initial value. */
    initialValue;
    /** Emitted whenever text or mentions change. */
    valueChanged;
    /** Emitted when user submits (Enter or click on ➕). */
    submitted;
    /** Emitted when a mention is accepted from the popover. */
    mentionAdded;
    dropdownItems = [];
    activeIndex = 0;
    dropdownOpen = false;
    hasText = false;
    editor;
    dropdownEl;
    // Tracked for future dropdown filtering; not yet read.
    activeTrigger = null;
    activeQuery = '';
    componentWillLoad() {
        if (this.initialValue) {
            // We'll hydrate after first render via componentDidLoad.
        }
    }
    componentDidLoad() {
        if (this.initialValue && this.editor) {
            this.hydrateFromValue(this.initialValue);
        }
        this.refreshHasText();
    }
    /** Imperatively clear the input (used after submit). */
    async clear() {
        if (this.editor) {
            this.editor.innerHTML = '';
            this.closeDropdown();
            this.refreshHasText();
            this.emitValue();
        }
    }
    /** Imperatively read current value. */
    async getValue() {
        return this.readValue();
    }
    /** Imperatively focus the input. */
    async focusInput() {
        this.editor?.focus();
    }
    onInitialValueChange(next) {
        if (next && this.editor) {
            this.hydrateFromValue(next);
            this.refreshHasText();
            this.emitValue();
        }
    }
    // ─────────────────── value <-> DOM ───────────────────
    readValue() {
        if (!this.editor)
            return { text: '', mentions: [] };
        const mentions = [];
        let text = '';
        this.editor.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent || '';
            }
            else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node;
                if (el.dataset && el.dataset.mentionId) {
                    mentions.push({
                        source: el.dataset.mentionSource || '',
                        trigger: el.dataset.mentionTrigger || '',
                        id: el.dataset.mentionId,
                        label: el.dataset.mentionLabel || el.textContent || '',
                        data: el.dataset.mentionData ? safeJsonParse(el.dataset.mentionData) : undefined,
                    });
                }
                else {
                    // Stray element — treat textContent as text
                    text += el.textContent || '';
                }
            }
        });
        return { text: text.replace(/ /g, ' ').trim(), mentions };
    }
    emitValue() {
        this.valueChanged.emit(this.readValue());
    }
    hydrateFromValue(value) {
        if (!this.editor)
            return;
        this.editor.innerHTML = '';
        // Simple hydration: append all pills then the text (consumer can override
        // initial order by composing manually if needed)
        value.mentions.forEach(p => {
            this.editor.appendChild(this.buildPill(p.trigger, p.source, p.id, p.label, p.data));
            this.editor.appendChild(document.createTextNode(' '));
        });
        if (value.text)
            this.editor.appendChild(document.createTextNode(value.text));
    }
    buildPill(trigger, sourceLabel, id, label, data) {
        const span = document.createElement('span');
        span.className = 'pmi__pill';
        span.dataset.mentionTrigger = trigger;
        span.dataset.mentionSource = sourceLabel;
        span.dataset.mentionId = id;
        span.dataset.mentionLabel = label;
        if (data !== undefined) {
            try {
                span.dataset.mentionData = JSON.stringify(data);
            }
            catch { /* ignore */ }
        }
        span.contentEditable = 'false';
        span.textContent = `${trigger}${label}`;
        return span;
    }
    refreshHasText() {
        const v = this.readValue();
        this.hasText = v.text.length > 0;
    }
    // ─────────────────── trigger detection ───────────────────
    getCursorContext() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount)
            return null;
        const range = sel.getRangeAt(0);
        if (!this.editor?.contains(range.startContainer))
            return null;
        if (range.startContainer.nodeType !== Node.TEXT_NODE)
            return null;
        const textNode = range.startContainer;
        const cursorPos = range.startOffset;
        return { textNode, before: (textNode.textContent || '').slice(0, cursorPos), cursorPos };
    }
    findTriggerMatch(before) {
        // Find the right-most trigger char preceded by start-or-whitespace
        let bestIdx = -1;
        let bestTrigger = '';
        for (const src of this.sources) {
            const idx = before.lastIndexOf(src.trigger);
            if (idx === -1)
                continue;
            if (idx > 0 && !/\s/.test(before[idx - 1]))
                continue;
            // Disallow whitespace in the query portion (mention input is single-token)
            const candidate = before.slice(idx + 1);
            if (/\s/.test(candidate))
                continue;
            if (idx > bestIdx) {
                bestIdx = idx;
                bestTrigger = src.trigger;
            }
        }
        if (bestIdx === -1)
            return null;
        return { trigger: bestTrigger, query: before.slice(bestIdx + 1) };
    }
    async refreshDropdown() {
        const ctx = this.getCursorContext();
        if (!ctx) {
            this.closeDropdown();
            return;
        }
        const match = this.findTriggerMatch(ctx.before);
        if (!match) {
            this.closeDropdown();
            return;
        }
        const eligible = this.sources.filter(s => s.trigger === match.trigger);
        if (eligible.length === 0) {
            this.closeDropdown();
            return;
        }
        const lowered = match.query.toLowerCase();
        const all = [];
        for (const src of eligible) {
            try {
                const items = await src.resolve(lowered);
                for (const it of items)
                    all.push({ source: src, item: it });
            }
            catch { /* skip source */ }
        }
        if (all.length === 0) {
            this.closeDropdown();
            return;
        }
        this.dropdownItems = all;
        this.activeIndex = 0;
        this.activeTrigger = match.trigger;
        this.activeQuery = match.query;
        this.dropdownOpen = true;
        // Position next render tick
        requestAnimationFrame(() => this.positionDropdown());
    }
    positionDropdown() {
        if (!this.dropdownEl)
            return;
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount)
            return;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        this.dropdownEl.style.left = `${rect.left}px`;
        this.dropdownEl.style.top = `${rect.bottom + 4}px`;
    }
    closeDropdown() {
        this.dropdownOpen = false;
        this.dropdownItems = [];
        this.activeTrigger = null;
        this.activeQuery = '';
    }
    // ─────────────────── pick + insert ───────────────────
    acceptItem(entry) {
        const ctx = this.getCursorContext();
        if (!ctx) {
            this.closeDropdown();
            return;
        }
        const triggerIdx = ctx.before.lastIndexOf(entry.source.trigger);
        if (triggerIdx === -1) {
            this.closeDropdown();
            return;
        }
        const text = ctx.textNode.textContent || '';
        const prefix = text.slice(0, triggerIdx);
        const suffix = text.slice(ctx.cursorPos);
        const pill = this.buildPill(entry.source.trigger, entry.source.label, entry.item.id, entry.item.label, entry.item.data);
        const parent = ctx.textNode.parentNode;
        if (!parent) {
            this.closeDropdown();
            return;
        }
        const prefixNode = document.createTextNode(prefix);
        const spaceNode = document.createTextNode(' ');
        const suffixNode = document.createTextNode(suffix);
        parent.insertBefore(prefixNode, ctx.textNode);
        parent.insertBefore(pill, ctx.textNode);
        parent.insertBefore(spaceNode, ctx.textNode);
        parent.insertBefore(suffixNode, ctx.textNode);
        parent.removeChild(ctx.textNode);
        // Move cursor after the space
        const sel = window.getSelection();
        if (sel) {
            const newRange = document.createRange();
            newRange.setStartAfter(spaceNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
        this.mentionAdded.emit({ source: entry.source.label, item: entry.item });
        this.closeDropdown();
        this.refreshHasText();
        this.emitValue();
    }
    // ─────────────────── handlers ───────────────────
    onInput = () => {
        this.refreshHasText();
        this.emitValue();
        this.refreshDropdown();
    };
    onKeyDown = (e) => {
        if (this.dropdownOpen && this.dropdownItems.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.activeIndex = (this.activeIndex + 1) % this.dropdownItems.length;
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.activeIndex = (this.activeIndex - 1 + this.dropdownItems.length) % this.dropdownItems.length;
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                this.acceptItem(this.dropdownItems[this.activeIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.closeDropdown();
                return;
            }
        }
        if (e.key === 'Enter') {
            // Submit on Enter when dropdown is closed
            e.preventDefault();
            this.trySubmit();
            return;
        }
        if (e.key === 'Backspace') {
            // Delete pill when cursor sits immediately after one
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount)
                return;
            const range = sel.getRangeAt(0);
            if (range.collapsed && range.startOffset === 0 && range.startContainer.nodeType === Node.TEXT_NODE) {
                const prev = range.startContainer.previousSibling;
                if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.dataset?.mentionId) {
                    e.preventDefault();
                    prev.remove();
                    this.refreshHasText();
                    this.emitValue();
                }
            }
        }
    };
    onPaste = (e) => {
        // Only paste plain text into the input
        e.preventDefault();
        const txt = e.clipboardData?.getData('text/plain') || '';
        if (!txt)
            return;
        document.execCommand('insertText', false, txt);
    };
    trySubmit = () => {
        if (this.submitDisabled)
            return;
        const value = this.readValue();
        if (!value.text)
            return;
        this.submitted.emit(value);
    };
    render() {
        const submitDisabled = this.submitDisabled || !this.hasText;
        return (h("div", { key: '0', class: "pmi" },
            h("div", { key: '1', class: "pmi__field" },
                h("div", { key: '2', class: "pmi__editor", contentEditable: true, role: "textbox", "aria-multiline": "false", "data-placeholder": this.placeholder, ref: el => { this.editor = el; }, onInput: this.onInput, onKeyDown: this.onKeyDown, onPaste: this.onPaste, onBlur: () => setTimeout(() => this.closeDropdown(), 120) }),
                h("button", { key: '3', type: "button", class: "pmi__submit", disabled: submitDisabled, "aria-label": "Submit", onClick: this.trySubmit }, this.submitButtonLabel && this.submitButtonLabel !== '➕' ? (this.submitButtonLabel) : (h("svg", { width: "17", height: "17", viewBox: "0 0 24 24", fill: "none", stroke: "#fff", "stroke-width": "2.6", "stroke-linecap": "round", "aria-hidden": "true" },
                    h("path", { d: "M12 5v14M5 12h14" }))))),
            this.dropdownOpen && this.dropdownItems.length > 0 && (h("div", { key: '4', class: "pmi__dropdown", ref: el => { this.dropdownEl = el; }, role: "listbox" }, this.renderGroupedItems()))));
    }
    renderGroupedItems() {
        // Group by source.label preserving discovery order
        const groups = new Map();
        this.dropdownItems.forEach(entry => {
            const key = entry.source.label;
            if (!groups.has(key))
                groups.set(key, []);
            groups.get(key).push(entry);
        });
        let flatIdx = 0;
        const out = [];
        groups.forEach((items, label) => {
            if (groups.size > 1) {
                out.push(h("div", { class: "pmi__group-header" }, label));
            }
            items.forEach(entry => {
                const isActive = flatIdx === this.activeIndex;
                const currentIdx = flatIdx;
                out.push(h("button", { type: "button", role: "option", "aria-selected": isActive ? 'true' : 'false', class: { 'pmi__opt': true, 'pmi__opt--active': isActive }, onMouseDown: (ev) => { ev.preventDefault(); this.acceptItem(entry); }, onMouseEnter: () => { this.activeIndex = currentIdx; } },
                    entry.item.avatar
                        ? h("span", { class: "pmi__opt-avatar" },
                            h("img", { src: entry.item.avatar, alt: "" }))
                        : entry.item.icon
                            ? h("span", { class: "pmi__opt-icon" }, entry.item.icon)
                            : h("span", { class: "pmi__opt-icon" }, entry.source.trigger),
                    h("span", { class: "pmi__opt-label" }, entry.item.label)));
                flatIdx++;
            });
        });
        return out;
    }
    static get watchers() { return {
        "initialValue": [{
                "onInitialValueChange": 0
            }]
    }; }
    static get style() { return PopMentionInputStyle0(); }
};
function safeJsonParse(s) {
    try {
        return JSON.parse(s);
    }
    catch {
        return undefined;
    }
}
__stencil_proxyCustomElement(PopMentionInput, [514, "pop-mention-input", {
        "placeholder": [1],
        "sources": [16],
        "submitDisabled": [4, "submit-disabled"],
        "submitButtonLabel": [1, "submit-button-label"],
        "initialValue": [16],
        "dropdownItems": [32],
        "activeIndex": [32],
        "dropdownOpen": [32],
        "hasText": [32],
        "clear": [64],
        "getValue": [64],
        "focusInput": [64]
    }, undefined, {
        "initialValue": [{
                "onInitialValueChange": 0
            }]
    }]);
//# sourceMappingURL=mention-input.js.map