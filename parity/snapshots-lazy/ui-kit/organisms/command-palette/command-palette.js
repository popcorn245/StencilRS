import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent, getElement as __stencil_getElement } from "@stencil/core/runtime/client/standalone";
import { Host, h } from "@stencil/core/runtime/client/standalone";
import PopCommandPaletteStyle0 from "./ui-kit/organisms/command-palette/command-palette.css?tag=pop-command-palette&encapsulation=scoped";
export const PopCommandPalette = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.popQueryChange = __stencil_createEvent(this, "popQueryChange", 7);
        this.popSelect = __stencil_createEvent(this, "popSelect", 7);
        this.popAsk = __stencil_createEvent(this, "popAsk", 7);
        this.popClose = __stencil_createEvent(this, "popClose", 7);
    }
    get el() { return __stencil_getElement(this); }
    /** Overlay visibility. */
    open = false;
    /** Sections to render. Accepts an array (property) or JSON string (attr). */
    sections = [];
    /** Current query value (controlled by the host). */
    query = '';
    /** Placeholder for the input. */
    placeholder = 'Search or ask your brain…';
    /** Loading spinner in the input affordance. */
    loading = false;
    /** Empty-state copy shown when there's a query but no results. */
    emptyLabel = 'No matches';
    /** Index of the currently highlighted flat row. */
    active = 0;
    /** Fires on every input keystroke (host debounces + runs notesSearch). */
    popQueryChange;
    /** Fires when a row is activated (Enter / click). */
    popSelect;
    /** Fires on Tab from the input → host expands the Ask flow (Phase 6). */
    popAsk;
    /** Fires when the palette closes (Esc / backdrop / select). */
    popClose;
    /** Element focused before the palette opened — restored on close. */
    lastFocused = null;
    inputEl;
    parseSections() {
        if (typeof this.sections === 'string') {
            try {
                return JSON.parse(this.sections);
            }
            catch {
                return [];
            }
        }
        return this.sections ?? [];
    }
    /** Flattened, globally-indexed rows for roving selection. */
    get rows() {
        const out = [];
        let i = 0;
        for (const s of this.parseSections()) {
            for (const item of s.items ?? [])
                out.push({ item, index: i++ });
        }
        return out;
    }
    onOpenChange(next, prev) {
        if (next && !prev) {
            this.lastFocused = document.activeElement ?? null;
            this.active = 0;
            // Focus the input after the overlay mounts.
            requestAnimationFrame(() => this.inputEl?.focus());
        }
        else if (!next && prev) {
            // Restore focus to whatever opened us (the topbar pill, usually).
            this.lastFocused?.focus?.();
            this.lastFocused = null;
        }
    }
    onSectionsChange() {
        // Keep the active row in range as results change under the cursor.
        const max = Math.max(0, this.rows.length - 1);
        if (this.active > max)
            this.active = max;
    }
    close = () => {
        if (!this.open)
            return;
        this.open = false;
        this.popClose.emit();
    };
    activate(item) {
        this.popSelect.emit(item);
    }
    move(delta) {
        const n = this.rows.length;
        if (!n)
            return;
        this.active = (this.active + delta + n) % n;
        // Scroll the active row into view.
        requestAnimationFrame(() => {
            const node = this.el.querySelector(`[data-row="${this.active}"]`);
            node?.scrollIntoView({ block: 'nearest' });
        });
    }
    /** Global key handling while open (focus is trapped on the input). */
    onKeydown(ev) {
        if (!this.open)
            return;
        switch (ev.key) {
            case 'Escape':
                ev.preventDefault();
                this.close();
                break;
            case 'ArrowDown':
                ev.preventDefault();
                this.move(1);
                break;
            case 'ArrowUp':
                ev.preventDefault();
                this.move(-1);
                break;
            case 'Enter': {
                ev.preventDefault();
                const row = this.rows[this.active];
                if (row)
                    this.activate(row.item);
                break;
            }
            case 'Tab': {
                // Trap focus on the input; Tab triggers the Phase-6 Ask affordance.
                ev.preventDefault();
                if (this.query.trim())
                    this.popAsk.emit(this.query.trim());
                break;
            }
            default:
                break;
        }
    }
    onInput = (e) => {
        const v = e.target.value;
        this.query = v;
        this.active = 0;
        this.popQueryChange.emit(v);
    };
    renderInput() {
        return (h("div", { class: "cp-inputrow" },
            h("svg", { class: "cp-search-icon", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round", "aria-hidden": "true" },
                h("circle", { cx: "11", cy: "11", r: "7" }),
                h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })),
            h("input", { ref: (el) => (this.inputEl = el), class: "cp-input", type: "text", role: "combobox", "aria-expanded": "true", "aria-controls": "cp-listbox", "aria-activedescendant": `cp-row-${this.active}`, "aria-autocomplete": "list", "aria-label": "Search or ask your brain", placeholder: this.placeholder, value: this.query, autocomplete: "off", spellcheck: false, onInput: this.onInput }),
            this.loading && h("span", { class: "cp-spinner", "aria-hidden": "true" })));
    }
    renderRows() {
        const sections = this.parseSections();
        const hasAny = sections.some((s) => (s.items ?? []).length > 0);
        if (!hasAny) {
            return (h("div", { class: "cp-empty", role: "status" },
                h("span", { class: "cp-empty-icon", "aria-hidden": "true" },
                    h("pop-brand-icon", { name: "search" })),
                h("span", { class: "cp-empty-text" }, this.query.trim() ? this.emptyLabel : 'Type to search your brain')));
        }
        // Single global counter so each row's index matches `this.rows`.
        let idx = 0;
        return (h("ul", { class: "cp-list", id: "cp-listbox", role: "listbox", "aria-label": "Results" }, sections.map((section) => (section.items ?? []).length === 0
            ? null
            : [
                h("li", { class: "cp-heading", role: "presentation" },
                    h("span", null, section.heading),
                    section.askHint && h("span", { class: "cp-heading-hint" }, "Tab to ask")),
                ...section.items.map((item) => {
                    const i = idx++;
                    const isActive = i === this.active;
                    return (h("li", { id: `cp-row-${i}`, "data-row": i, class: { 'cp-row': true, 'is-active': isActive }, role: "option", "aria-selected": isActive ? 'true' : 'false', onMouseEnter: () => (this.active = i), onClick: () => this.activate(item) },
                        h("span", { class: "cp-row-icon", "aria-hidden": "true" },
                            h("pop-brand-icon", { name: item.icon || 'dot-outline' })),
                        h("span", { class: "cp-row-body" },
                            h("span", { class: "cp-row-label" }, item.label || 'Untitled'),
                            item.detail && h("span", { class: "cp-row-detail" }, item.detail)),
                        isActive && h("kbd", { class: "cp-row-enter", "aria-hidden": "true" }, "\u21B5")));
                }),
            ])));
    }
    render() {
        if (!this.open)
            return h(Host, { "aria-hidden": "true" });
        return (h(Host, null,
            h("div", { class: "cp-backdrop", onClick: this.close }),
            h("div", { class: "cp-panel", role: "dialog", "aria-modal": "true", "aria-label": "Command palette", onClick: (e) => e.stopPropagation() },
                this.renderInput(),
                h("div", { class: "cp-results" }, this.renderRows()),
                h("div", { class: "cp-footer", "aria-hidden": "true" },
                    h("span", null,
                        h("kbd", null, "\u2191"),
                        h("kbd", null, "\u2193"),
                        " navigate"),
                    h("span", null,
                        h("kbd", null, "\u21B5"),
                        " open"),
                    h("span", null,
                        h("kbd", null, "tab"),
                        " ask"),
                    h("span", null,
                        h("kbd", null, "esc"),
                        " close")))));
    }
    static get watchers() { return {
        "open": [{
                "onOpenChange": 0
            }],
        "sections": [{
                "onSectionsChange": 0
            }]
    }; }
};
PopCommandPalette.style = PopCommandPaletteStyle0();
//# sourceMappingURL=command-palette.js.map