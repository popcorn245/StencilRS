import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopNoteListStyle0 from "./ui-kit/organisms/note-list/note-list.css?tag=pop-note-list&encapsulation=scoped";
export const PopNoteList = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.noteSelect = __stencil_createEvent(this, "noteSelect", 7);
        this.notePin = __stencil_createEvent(this, "notePin", 7);
    }
    /** The notes to render (set as a property). */
    notes = [];
    /** noteId → snippet/excerpt text (set as a property). */
    snippets = {};
    /** List (rows) or grid (gallery tiles). */
    view = 'list';
    /** Split into Pinned + Recent sections (Home default) vs one flat list. */
    sectioned = true;
    /** Show the loading skeleton instead of content. */
    loading = false;
    /** id of the currently-selected note (highlights its card). */
    selectedId = '';
    /** Re-emitted from the cards so the page can open / pin a note. */
    noteSelect;
    notePin;
    _notes = [];
    notesChanged(v) {
        this._notes = Array.isArray(v) ? v : [];
    }
    componentWillLoad() {
        this.notesChanged(this.notes);
    }
    renderCard = (n) => (h("pop-note-card", { key: n.id, note: n, snippet: this.snippets?.[n.id] ?? '', layout: this.view === 'grid' ? 'grid' : 'list', selected: n.id === this.selectedId }));
    renderSection(title, items) {
        if (!items.length)
            return null;
        return (h("section", { class: "nl__section" },
            h("h2", { class: "nl__section-head" },
                h("span", { class: "nl__section-title" }, title),
                h("span", { class: "nl__section-count" }, items.length)),
            h("div", { class: { 'nl__items': true, [`nl__items--${this.view}`]: true } }, items.map(this.renderCard))));
    }
    render() {
        if (this.loading) {
            // Card-shaped skeletons (title + snippet + meta) mirror the note-card
            // silhouette so loading has the same shape as the content it becomes.
            return (h("div", { class: "nl" },
                h("pop-loading-state", { variant: "card-skeleton", grid: this.view === 'grid', count: this.view === 'grid' ? 6 : 5, label: "Loading notes" })));
        }
        const notes = this._notes;
        if (!notes.length) {
            return (h("div", { class: "nl nl--empty" },
                h("slot", { name: "empty" },
                    h("pop-empty-state", { iconName: "home", heading: "Nothing here yet", message: "Capture a thought to fill your brain.", size: "full" }))));
        }
        if (!this.sectioned) {
            return (h("div", { class: "nl" },
                h("div", { class: { 'nl__items': true, [`nl__items--${this.view}`]: true }, role: "list" }, notes.map(this.renderCard))));
        }
        const pinned = notes.filter((n) => n.pinned);
        const recent = notes.filter((n) => !n.pinned);
        return (h("div", { class: "nl" },
            this.renderSection('Pinned', pinned),
            this.renderSection('Recent', recent)));
    }
    static get watchers() { return {
        "notes": [{
                "notesChanged": 0
            }]
    }; }
};
PopNoteList.style = PopNoteListStyle0();
//# sourceMappingURL=note-list.js.map