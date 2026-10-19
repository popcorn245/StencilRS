import { createEvent as __stencil_createEvent, proxyCustomElement as __stencil_proxyCustomElement, HTMLElement } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopNoteCardStyle0 from "./ui-kit/molecules/note-card/note-card.css?tag=pop-note-card&encapsulation=scoped";
const VIS_META = {
    private: { icon: 'lock', label: 'Private' },
    family: { icon: 'users', label: 'Family' },
    couple: { icon: 'heart', label: 'Couple' },
    public: { icon: 'globe', label: 'Public' },
};
/** Provenance badge shown on the Inbox triage variant. */
const SOURCE_META = {
    capture: { icon: 'edit', label: 'Captured' },
    clip: { icon: 'scissors', label: 'Clipped' },
    voice: { icon: 'mic', label: 'Voice' },
    bot: { icon: 'bot', label: 'Bot' },
};
export const PopNoteCard = class extends HTMLElement {
    constructor(registerHost) {
        super();
        if (registerHost !== false) {
            this.__registerHost();
        }
        this.noteSelect = __stencil_createEvent(this, "noteSelect", 7);
        this.notePin = __stencil_createEvent(this, "notePin", 7);
        this.noteTriage = __stencil_createEvent(this, "noteTriage", 7);
        this.noteLink = __stencil_createEvent(this, "noteLink", 7);
        this.noteTrash = __stencil_createEvent(this, "noteTrash", 7);
        this.noteRestore = __stencil_createEvent(this, "noteRestore", 7);
        this.notePurge = __stencil_createEvent(this, "notePurge", 7);
    }
    get el() { return this; }
    /** The note to preview (set as a property). */
    note;
    /** Snippet/excerpt text. The page supplies it from the note's first blocks. */
    snippet = '';
    /** Layout: a full-width list row, a gallery grid tile, or compact result chip. */
    layout = 'list';
    /** Highlighted when this is the selected note in the split-pane. */
    selected = false;
    /**
     * Inline action affordance rendered beneath the card.
     *  - `'none'`  (default): no actions (Home/search/grid).
     *  - `'inbox'`: triage variant → source badge + [🔗 link] [✎ open] [✓ keep] [🗑].
     *  - `'trash'`: Trash variant → [↩ Restore] [✕ Delete forever].
     */
    actions = 'none';
    /** Fired when the card is activated (click / Enter / Space). */
    noteSelect;
    /** Fired when the pin toggle is pressed. */
    notePin;
    /** Inbox triage: "keep" → the page sets triagedAt so it leaves the queue. */
    noteTriage;
    /** Inbox: link this note to another (the page opens its link picker). */
    noteLink;
    /** Soft-delete → Trash (Inbox 🗑). */
    noteTrash;
    /** Trash: restore (clears deletedAt). */
    noteRestore;
    /** Trash: delete forever (permanent purge; the page confirms first). */
    notePurge;
    get relativeUpdated() {
        return relTime(this.note?.updatedAt ?? this.note?.createdAt);
    }
    get visibility() {
        return VIS_META[this.note?.visibility ?? 'private'] ?? VIS_META.private;
    }
    handleSelect = () => {
        if (this.note?.id)
            this.noteSelect.emit({ id: this.note.id });
    };
    handleKey = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleSelect();
        }
    };
    handlePin = (e) => {
        e.stopPropagation();
        if (this.note?.id)
            this.notePin.emit({ id: this.note.id, pinned: !this.note.pinned });
    };
    /** Action-button helper: stop the click from also opening the note. */
    act = (emitter) => (e) => {
        e.stopPropagation();
        if (this.note?.id)
            emitter.emit({ id: this.note.id });
    };
    get sourceBadge() {
        return SOURCE_META[this.note?.source ?? ''] ?? null;
    }
    /** Triage / Trash inline action row, rendered as a sibling of the card body
     *  (NOT nested in the role=button article) so the buttons stay accessible. */
    renderActions() {
        if (this.actions === 'inbox') {
            return (h("div", { class: "nc__actions", role: "group", "aria-label": "Triage actions" },
                h("button", { type: "button", class: "nc__act", onClick: this.act(this.noteLink), "aria-label": "Link to another note" },
                    h("pop-brand-icon", { name: "link" }),
                    " ",
                    h("span", { class: "nc__act-label" }, "Link")),
                h("button", { type: "button", class: "nc__act", onClick: this.act(this.noteSelect), "aria-label": "Open in editor" },
                    h("pop-brand-icon", { name: "edit" }),
                    " ",
                    h("span", { class: "nc__act-label" }, "Open")),
                h("button", { type: "button", class: "nc__act nc__act--keep", onClick: this.act(this.noteTriage), "aria-label": "Keep \u2014 mark triaged and leave the Inbox" },
                    h("pop-brand-icon", { name: "check" }),
                    " ",
                    h("span", { class: "nc__act-label" }, "Keep")),
                h("button", { type: "button", class: "nc__act nc__act--danger", onClick: this.act(this.noteTrash), "aria-label": "Move to Trash" },
                    h("pop-brand-icon", { name: "trash" }),
                    " ",
                    h("span", { class: "nc__act-label" }, "Trash"))));
        }
        if (this.actions === 'trash') {
            return (h("div", { class: "nc__actions", role: "group", "aria-label": "Trash actions" },
                h("button", { type: "button", class: "nc__act nc__act--keep", onClick: this.act(this.noteRestore), "aria-label": "Restore note" },
                    h("pop-brand-icon", { name: "restore" }),
                    " ",
                    h("span", { class: "nc__act-label" }, "Restore")),
                h("button", { type: "button", class: "nc__act nc__act--danger", onClick: this.act(this.notePurge), "aria-label": "Delete forever" },
                    h("pop-brand-icon", { name: "close" }),
                    " ",
                    h("span", { class: "nc__act-label" }, "Delete forever"))));
        }
        return null;
    }
    render() {
        const note = this.note;
        if (!note)
            return null;
        const tags = note.tags ?? [];
        const pinned = !!note.pinned;
        const clipped = note.source === 'clip';
        const hasTasks = !!(note.taskLinks && note.taskLinks.length);
        const vis = this.visibility;
        const src = this.actions === 'inbox' ? this.sourceBadge : null;
        const card = (h("article", { class: { 'nc': true, [`nc--${this.layout}`]: true, 'nc--selected': this.selected }, role: "button", tabindex: 0, "aria-pressed": this.selected ? 'true' : 'false', "aria-label": `Open note: ${note.title || 'Untitled'}`, onClick: this.handleSelect, onKeyDown: this.handleKey },
            h("div", { class: "nc__head" },
                h("h3", { class: "nc__title" }, note.title || 'Untitled'),
                h("button", { type: "button", class: { 'nc__pin': true, 'is-pinned': pinned }, "aria-label": pinned ? 'Unpin note' : 'Pin note', "aria-pressed": pinned ? 'true' : 'false', title: pinned ? 'Unpin' : 'Pin', onClick: this.handlePin },
                    h("pop-brand-icon", { name: pinned ? 'star' : 'star-outline' }))),
            this.layout !== 'compact' && this.snippet && (h("p", { class: "nc__snippet" }, this.snippet)),
            h("div", { class: "nc__meta" },
                tags.length > 0 && (h("span", { class: "nc__tags", "aria-label": "Tags" },
                    tags.slice(0, this.layout === 'grid' ? 4 : 3).map((t) => (h("span", { class: "nc__tag" },
                        "#",
                        t))),
                    tags.length > (this.layout === 'grid' ? 4 : 3) && (h("span", { class: "nc__tag nc__tag--more" },
                        "+",
                        tags.length - (this.layout === 'grid' ? 4 : 3))))),
                h("span", { class: "nc__icons" },
                    src && (h("span", { class: "nc__source", title: src.label, "aria-label": src.label },
                        h("pop-brand-icon", { name: src.icon }),
                        " ",
                        src.label)),
                    h("span", { class: "nc__time" }, this.relativeUpdated),
                    h("span", { class: "nc__badge", title: vis.label, "aria-label": vis.label },
                        h("pop-brand-icon", { name: vis.icon })),
                    clipped && this.actions !== 'inbox' && h("span", { class: "nc__badge", title: "Clipped", "aria-label": "Clipped" },
                        h("pop-brand-icon", { name: "scissors" })),
                    hasTasks && h("span", { class: "nc__badge nc__badge--task", title: "Has linked tasks", "aria-label": "Has linked tasks" },
                        h("pop-brand-icon", { name: "check" }))))));
        if (this.actions === 'none')
            return card;
        return (h("div", { class: { 'nc-wrap': true, [`nc-wrap--${this.actions}`]: true } },
            card,
            this.renderActions()));
    }
    static get style() { return PopNoteCardStyle0(); }
};
/** Compact relative time (e.g. "5m", "2h", "3d", "Jun 2"). */
function relTime(value) {
    const ms = toMillis(value);
    if (!ms)
        return '';
    const diff = Date.now() - ms;
    const m = Math.round(diff / 60000);
    if (m < 1)
        return 'now';
    if (m < 60)
        return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 24)
        return `${h}h`;
    const d = Math.round(h / 24);
    if (d < 7)
        return `${d}d`;
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function toMillis(value) {
    if (!value)
        return 0;
    if (value instanceof Date)
        return value.getTime();
    const v = value;
    if (typeof v.toMillis === 'function')
        return v.toMillis();
    if (typeof v.seconds === 'number')
        return v.seconds * 1000;
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string') {
        const t = Date.parse(value);
        return Number.isNaN(t) ? 0 : t;
    }
    return 0;
}
__stencil_proxyCustomElement(PopNoteCard, [514, "pop-note-card", {
        "note": [16],
        "snippet": [1],
        "layout": [513],
        "selected": [516],
        "actions": [513]
    }]);
//# sourceMappingURL=note-card.js.map