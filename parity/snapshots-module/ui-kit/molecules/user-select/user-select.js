import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopUserSelectStyle0 from "./ui-kit/molecules/user-select/user-select.css?tag=pop-user-select&encapsulation=scoped";
export const PopUserSelect = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.valueChanged = __stencil_createEvent(this, "valueChanged", 7);
    }
    get el() { return this; }
    /** Async source returning matches for a query. REQUIRED for search to work. */
    resolve;
    /** Selected people (controlled). */
    value = [];
    /** Accept a typed email that matches no suggestion as a manual chip. */
    allowFreeText = false;
    /** Placeholder shown when nothing is selected. */
    placeholder = 'Search people…';
    /** Accessible label for the field + popover. */
    label = 'People';
    /** Max selections (0 = unlimited). */
    max = 0;
    /** Debounce (ms) before each resolve() call. */
    debounce = 250;
    /** Minimum characters before searching. */
    minChars = 1;
    /** Emitted whenever the selection changes (add / remove). */
    valueChanged;
    draft = '';
    results = [];
    open = false;
    busy = false;
    active = -1;
    timer;
    inputRef;
    connectedCallback() {
        document.addEventListener('click', this.onDocClick);
    }
    disconnectedCallback() {
        document.removeEventListener('click', this.onDocClick);
        clearTimeout(this.timer);
    }
    onDocClick = (e) => {
        if (this.open && !this.el.contains(e.target))
            this.close();
    };
    selected() {
        return Array.isArray(this.value) ? this.value : [];
    }
    key(o) {
        return (o.email || o.id || o.name || '').toLowerCase();
    }
    has(o) {
        const k = this.key(o);
        return this.selected().some((v) => this.key(v) === k);
    }
    commit(next) {
        this.value = next;
        this.valueChanged.emit([...next]);
    }
    add(o) {
        if (!o || !this.key(o) || this.has(o))
            return this.reset();
        if (this.max && this.selected().length >= this.max)
            return;
        this.commit([...this.selected(), o]);
        this.reset();
    }
    remove(i) {
        const next = this.selected().slice();
        next.splice(i, 1);
        this.commit(next);
    }
    reset() {
        this.draft = '';
        this.results = [];
        this.close();
        this.inputRef?.focus();
    }
    close() {
        this.open = false;
        this.active = -1;
    }
    isEmail(s) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    }
    onInput = (e) => {
        const q = e.target.value;
        this.draft = q;
        this.active = -1;
        clearTimeout(this.timer);
        const trimmed = q.trim();
        if (trimmed.length < this.minChars || !this.resolve) {
            this.results = [];
            this.open = this.allowFreeText && this.isEmail(trimmed);
            return;
        }
        this.busy = true;
        this.open = true;
        this.timer = setTimeout(() => void this.search(trimmed), this.debounce);
    };
    async search(q) {
        try {
            const raw = (await this.resolve?.(q)) ?? [];
            this.results = raw.filter((o) => !this.has(o)).slice(0, 8);
        }
        catch {
            this.results = [];
        }
        finally {
            this.busy = false;
        }
    }
    onKeyDown = (e) => {
        const draftEmail = this.allowFreeText && this.isEmail(this.draft.trim());
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.open = true;
            this.active = Math.min(this.active + 1, this.results.length - 1);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.active = Math.max(this.active - 1, 0);
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.active >= 0 && this.results[this.active])
                this.add(this.results[this.active]);
            else if (draftEmail)
                this.add({ email: this.draft.trim() });
        }
        else if (e.key === 'Escape') {
            if (this.open) {
                e.stopPropagation();
                this.close();
            }
        }
        else if (e.key === 'Backspace' && !this.draft && this.selected().length) {
            this.remove(this.selected().length - 1);
        }
    };
    avatarFor(o, cls) {
        if (o.avatar)
            return h("img", { class: cls, src: o.avatar, alt: "", loading: "lazy" });
        const ch = (o.name || o.email || '?').charAt(0).toUpperCase();
        return (h("span", { class: `${cls} ${cls}--ph`, "aria-hidden": "true" }, ch));
    }
    render() {
        const draft = this.draft.trim();
        const draftEmail = this.allowFreeText && this.isEmail(draft);
        const dupDraft = this.results.some((r) => this.key(r) === draft.toLowerCase());
        const showPop = this.open && (this.busy || this.results.length > 0 || draftEmail || draft.length > 0);
        return (h("div", { key: '0', class: { pus: true, 'pus--open': this.open } },
            h("div", { key: '1', class: "pus__field", onClick: () => this.inputRef?.focus() },
                this.selected().map((o, i) => (h("span", { class: "pus__chip", key: this.key(o) || i },
                    this.avatarFor(o, 'pus__chip-av'),
                    h("span", { class: "pus__chip-label" }, o.name || o.email),
                    h("button", { type: "button", class: "pus__chip-x", "aria-label": `Remove ${o.name || o.email}`, onClick: (ev) => {
                            ev.stopPropagation();
                            this.remove(i);
                        } }, "\u00D7")))),
                h("input", { key: '2', class: "pus__input", ref: (el) => (this.inputRef = el), type: "text", role: "combobox", "aria-expanded": String(this.open), "aria-autocomplete": "list", "aria-label": this.label, placeholder: this.selected().length ? '' : this.placeholder, value: this.draft, onInput: this.onInput, onKeyDown: this.onKeyDown, onFocus: () => {
                        if (this.draft.trim().length >= this.minChars || draftEmail)
                            this.open = true;
                    } })),
            showPop && (h("div", { key: '3', class: "pus__pop", role: "listbox", "aria-label": this.label },
                this.busy && this.results.length === 0 && h("div", { key: '4', class: "pus__hint" }, "Searching\u2026"),
                this.results.map((o, i) => (h("button", { type: "button", key: this.key(o) || i, class: { pus__opt: true, 'pus__opt--active': i === this.active }, role: "option", "aria-selected": String(i === this.active), onMouseEnter: () => (this.active = i), onClick: () => this.add(o) },
                    this.avatarFor(o, 'pus__opt-av'),
                    h("span", { class: "pus__opt-text" },
                        h("span", { class: "pus__opt-name" }, o.name || o.email),
                        o.name && o.email && h("span", { class: "pus__opt-email" }, o.email))))),
                draftEmail && !dupDraft && (h("button", { key: '5', type: "button", class: "pus__opt pus__opt--add", role: "option", onClick: () => this.add({ email: draft }) },
                    h("span", { key: '6', class: "pus__opt-av pus__opt-av--ph", "aria-hidden": "true" }, "+"),
                    h("span", { key: '7', class: "pus__opt-text" },
                        h("span", { key: '8', class: "pus__opt-name" },
                            "Add \u201C",
                            draft,
                            "\u201D")))),
                !this.busy && this.results.length === 0 && !draftEmail && (h("div", { key: '9', class: "pus__hint" }, "No matches"))))));
    }
    static get style() { return PopUserSelectStyle0(); }
};
__stencil_proxyCustomElement(PopUserSelect, [514, "pop-user-select", {
        "resolve": [16],
        "value": [1040],
        "allowFreeText": [4, "allow-free-text"],
        "placeholder": [1],
        "label": [1],
        "max": [2],
        "debounce": [2],
        "minChars": [2, "min-chars"],
        "draft": [32],
        "results": [32],
        "open": [32],
        "busy": [32],
        "active": [32]
    }]);
//# sourceMappingURL=user-select.js.map