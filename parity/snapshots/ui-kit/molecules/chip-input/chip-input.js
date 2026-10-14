import { createEvent as __stencil_createEvent, transformTag as __stencil_transformTag, defineCustomElement as __stencil_defineCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopChipInputStyle0 from "./ui-kit/molecules/chip-input/chip-input.css?tag=pop-chip-input&encapsulation=scoped";
const PopChipInput = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
        this.createChip = __stencil_createEvent(this, "createChip", 7);
    }
    get el() { return this; }
    /** Current value array. */
    value = [];
    /** Optional suggestions for autocomplete + chip label resolution. */
    suggestions = [];
    /** Placeholder for the trailing text input. */
    placeholder = 'Add…';
    /** Reject values that don't match a suggestion id. */
    strict = false;
    /** Hide the trailing add-input (read-only mode). */
    readonly = false;
    valueChanged;
    /** Emitted when the user picks the inline "Create «text»" row (the typed text
     *  matches no existing suggestion). The host persists a new chip/tag and adds
     *  its id to `value`. Only fires when `allowCreate` is true. */
    createChip;
    /** Show the inline "＋ Create «text»" row when the draft matches no suggestion.
     *  Off by default so existing {id,label} / free-text callers are unchanged. */
    allowCreate = false;
    draft = '';
    openSuggestions = false;
    inputRef = null;
    /** Imperatively focus the input. */
    async focusInput() {
        this.inputRef?.focus();
    }
    currentValue() {
        return Array.isArray(this.value) ? this.value : [];
    }
    suggestionFor(id) {
        return this.suggestions.find((s) => s.id === id);
    }
    labelFor(id) {
        const hit = this.suggestionFor(id);
        return hit ? hit.label : id;
    }
    /** Inline styles that tint a selected chip from its suggestion's `color`.
     *  No color → empty object, so the neutral (brand-blue) CSS default applies. */
    chipStyle(id) {
        const color = this.suggestionFor(id)?.color;
        if (!color)
            return {};
        return {
            background: `color-mix(in oklab, ${color} 16%, transparent)`,
            borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        };
    }
    /** Whether to offer the inline "Create «draft»" row: create is enabled, the
     *  draft is non-empty, and it matches no existing suggestion by id or label. */
    canCreateDraft() {
        if (!this.allowCreate)
            return false;
        const q = this.draft.trim();
        if (!q)
            return false;
        const lower = q.toLowerCase();
        return !this.suggestions.some((s) => s.id.toLowerCase() === lower || s.label.toLowerCase() === lower);
    }
    commit(next) {
        this.value = next;
        this.valueChanged.emit([...next]);
    }
    addRaw(raw) {
        const trimmed = raw.trim();
        if (!trimmed)
            return;
        const current = this.currentValue();
        if (current.includes(trimmed))
            return;
        if (this.strict) {
            const hit = this.suggestions.find((s) => s.id === trimmed || s.label.toLowerCase() === trimmed.toLowerCase());
            if (!hit)
                return;
            this.commit([...current, hit.id]);
        }
        else {
            this.commit([...current, trimmed]);
        }
        this.draft = '';
        this.openSuggestions = false;
    }
    /** Emit createChip for the current draft (the host persists + adds the id). */
    emitCreate() {
        const label = this.draft.trim();
        if (!label)
            return;
        this.createChip.emit({ label });
        this.draft = '';
        this.openSuggestions = false;
    }
    removeAt(index) {
        const current = this.currentValue();
        const next = current.slice(0, index).concat(current.slice(index + 1));
        this.commit(next);
    }
    handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            // When the draft names no existing suggestion and create is on, Enter/comma
            // creates a new chip (host persists it) instead of a raw/strict-rejected add.
            if (this.canCreateDraft()) {
                this.emitCreate();
                return;
            }
            this.addRaw(this.draft);
            return;
        }
        if (e.key === 'Backspace' && !this.draft) {
            const current = this.currentValue();
            if (current.length)
                this.removeAt(current.length - 1);
        }
    };
    filteredSuggestions() {
        const current = new Set(this.currentValue());
        const q = this.draft.trim().toLowerCase();
        return this.suggestions
            .filter((s) => !current.has(s.id))
            .filter((s) => !q || s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
            .slice(0, 8);
    }
    render() {
        const chips = this.currentValue();
        const suggestions = this.filteredSuggestions();
        const showCreate = this.canCreateDraft();
        return (h("div", { key: '0', class: `pci ${this.readonly ? 'pci--readonly' : ''}` },
            h("div", { key: '1', class: "pci__chips" },
                chips.map((id, i) => {
                    const sug = this.suggestionFor(id);
                    return (h("span", { class: "pci__chip", key: id, style: this.chipStyle(id) },
                        sug?.emoji && h("span", { class: "pci__chip-emoji", "aria-hidden": "true" }, sug.emoji),
                        h("span", { class: "pci__chip-label" }, this.labelFor(id)),
                        !this.readonly && (h("button", { type: "button", class: "pci__chip-remove", "aria-label": `Remove ${this.labelFor(id)}`, onClick: (e) => {
                                e.preventDefault();
                                this.removeAt(i);
                            } }, "\u00D7"))));
                }),
                !this.readonly && (h("input", { key: '2', ref: (el) => (this.inputRef = el || null), class: "pci__input", type: "text", placeholder: chips.length === 0 ? this.placeholder : '', value: this.draft, onInput: (e) => {
                        this.draft = e.target.value;
                        this.openSuggestions = true;
                    }, onFocus: () => (this.openSuggestions = true), onBlur: () => setTimeout(() => (this.openSuggestions = false), 120), onKeyDown: this.handleKeyDown }))),
            !this.readonly && this.openSuggestions && (suggestions.length > 0 || showCreate) && (h("ul", { key: '3', class: "pci__suggestions", role: "listbox" },
                suggestions.map((s) => (h("li", { role: "option", class: "pci__suggestion", onMouseDown: (e) => {
                        e.preventDefault();
                        this.addRaw(s.id);
                    } },
                    s.emoji ? (h("span", { class: "pci__suggestion-emoji", "aria-hidden": "true" }, s.emoji)) : (h("span", { class: "pci__suggestion-dot", "aria-hidden": "true", style: { background: s.color || 'var(--brand-blue, #4299e1)' } })),
                    h("span", { class: "pci__suggestion-label" }, s.label)))),
                showCreate && (h("li", { key: '4', role: "option", class: "pci__suggestion pci__suggestion--create", onMouseDown: (e) => {
                        e.preventDefault();
                        this.emitCreate();
                    } },
                    h("span", { key: '5', class: "pci__suggestion-plus", "aria-hidden": "true" }, "\uFF0B"),
                    h("span", { key: '6', class: "pci__suggestion-label" },
                        "Create \u201C",
                        this.draft.trim(),
                        "\u201D")))))));
    }
    static get style() { return PopChipInputStyle0(); }
};
__stencil_defineCustomElement(PopChipInput, [514, "pop-chip-input", {
        "value": [1040],
        "suggestions": [16],
        "placeholder": [1],
        "strict": [4],
        "readonly": [4],
        "allowCreate": [4, "allow-create"],
        "draft": [32],
        "openSuggestions": [32],
        "focusInput": [64]
    }]);
//# sourceMappingURL=chip-input.js.map