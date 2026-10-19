import { registerInstance as __stencil_registerInstance, createEvent as __stencil_createEvent } from "@stencil/core/runtime/client/standalone";
import { h } from "@stencil/core/runtime/client/standalone";
import PopNotePropertiesStyle0 from "./ui-kit/organisms/note-properties/note-properties.css?tag=pop-note-properties&encapsulation=scoped";
export const PopNoteProperties = class {
    constructor(hostRef) {
        __stencil_registerInstance(this, hostRef);
        this.titleChange = __stencil_createEvent(this, "titleChange", 7);
        this.tagsChange = __stencil_createEvent(this, "tagsChange", 7);
        this.noteVisibilityChange = __stencil_createEvent(this, "noteVisibilityChange", 7);
        this.pinnedChange = __stencil_createEvent(this, "pinnedChange", 7);
        this.openTask = __stencil_createEvent(this, "openTask", 7);
    }
    /** Editable title — mirrors the note's derived/first-line title. */
    noteTitle = '';
    /** Tags-as-properties. */
    tags = [];
    /** Autocomplete seed for the tag input (all tags across the brain). */
    suggestions = [];
    /** Visibility — reuses the task enum. */
    visibility = 'private';
    /** Pinned to the top of Home's Pinned split. */
    pinned = false;
    /** Pre-formatted created timestamp (host formats; rail just displays). */
    created = '';
    /** Pre-formatted updated timestamp. */
    updated = '';
    /** Tasks this note backs — deep-link out to tasks.popcorn245.com. */
    linkedTasks = [];
    /** Count of `[[ ]]` link-outs (Phase 3 populates note.links). */
    linksOut = 0;
    /** Sync chip state. */
    syncState = 'synced';
    /** Backlinks count for the collapsible section header (body is a slot). */
    backlinksCount = 0;
    /** AI-backfill hint surfaced subtly (e.g. "Indexing…" / "Indexed"). */
    aiHint = '';
    /** Emitted on title commit (blur / Enter). */
    titleChange;
    /** Emitted whenever the tag set changes. */
    tagsChange;
    /** Emitted on visibility select. */
    noteVisibilityChange;
    /** Emitted on pin toggle. */
    pinnedChange;
    /** Emitted when a linked task is opened (deep-link to tasks app). */
    openTask;
    /** Backlinks section collapsed state (local UI; defaults open). */
    backlinksCollapsed = false;
    VIS_OPTIONS = [
        { id: 'private', label: 'Private' },
        { id: 'family', label: 'Family' },
        { id: 'couple', label: 'Couple' },
        { id: 'public', label: 'Public' },
    ];
    syncMeta() {
        switch (this.syncState) {
            case 'saving':
                return { icon: 'refresh', label: 'Saving…', cls: 'np__sync--saving' };
            case 'pending':
                return { icon: 'clock', label: 'Pending sync', cls: 'np__sync--pending' };
            case 'error':
                return { icon: 'warning', label: 'Sync error', cls: 'np__sync--error' };
            case 'synced':
            default:
                return { icon: 'check', label: 'Synced', cls: 'np__sync--synced' };
        }
    }
    commitTitle = (e) => {
        const next = e.target.value;
        this.titleChange.emit(next);
    };
    render() {
        const sync = this.syncMeta();
        return (h("aside", { key: '0', class: "np", "aria-label": "Note properties" },
            h("div", { key: '1', class: "np__field" },
                h("label", { key: '2', class: "np__label", htmlFor: "np-title" }, "Title"),
                h("input", { key: '3', id: "np-title", class: "np__title-input", type: "text", value: this.noteTitle, placeholder: "Untitled", onChange: this.commitTitle, onKeyDown: (e) => {
                        if (e.key === 'Enter')
                            e.target.blur();
                    } })),
            h("div", { key: '4', class: "np__field" },
                h("label", { key: '5', class: "np__label" }, "Tags"),
                h("pop-chip-input", { key: '6', value: this.tags, suggestions: this.suggestions, placeholder: "Add a tag\u2026", onValueChanged: (e) => this.tagsChange.emit(e.detail) })),
            h("div", { key: '7', class: "np__field" },
                h("label", { key: '8', class: "np__label" }, "Visibility"),
                h("pop-radio-group", { key: '9', value: this.visibility, options: this.VIS_OPTIONS, ariaLabel: "Note visibility", onValueChanged: (e) => this.noteVisibilityChange.emit(e.detail) })),
            h("div", { key: 'a', class: "np__field np__field--row" },
                h("span", { key: 'b', class: "np__label", id: "np-pin-label" }, "Pinned"),
                h("button", { key: 'c', type: "button", class: { np__toggle: true, 'np__toggle--on': this.pinned }, role: "switch", "aria-checked": this.pinned ? 'true' : 'false', "aria-labelledby": "np-pin-label", onClick: () => this.pinnedChange.emit(!this.pinned) },
                    h("span", { key: 'd', class: "np__toggle-track" },
                        h("span", { key: 'e', class: "np__toggle-thumb" })),
                    h("span", { key: 'f', class: "np__toggle-text" },
                        this.pinned ? 'Pinned' : 'Pin to top',
                        this.pinned && h("pop-brand-icon", { key: 'g', name: "star" })))),
            h("dl", { key: 'h', class: "np__meta" },
                h("div", { key: 'i', class: "np__meta-row" },
                    h("dt", { key: 'j', class: "np__label" }, "Created"),
                    h("dd", { key: 'k', class: "np__meta-val" }, this.created || '—')),
                h("div", { key: 'l', class: "np__meta-row" },
                    h("dt", { key: 'm', class: "np__label" }, "Updated"),
                    h("dd", { key: 'n', class: "np__meta-val" }, this.updated || '—')),
                h("div", { key: 'o', class: "np__meta-row" },
                    h("dt", { key: 'p', class: "np__label" }, "Links out"),
                    h("dd", { key: 'q', class: "np__meta-val" }, this.linksOut))),
            this.linkedTasks.length > 0 && (h("div", { key: 'r', class: "np__field" },
                h("span", { key: 's', class: "np__label" },
                    "Linked tasks (",
                    this.linkedTasks.length,
                    ")"),
                h("ul", { key: 't', class: "np__tasks" }, this.linkedTasks.map((t) => (h("li", { key: t.id },
                    h("button", { type: "button", class: "np__task", title: "Open in Tasks", onClick: () => this.openTask.emit(t.id) },
                        h("span", { class: "np__task-title" }, t.title),
                        h("span", { class: "np__task-out", "aria-hidden": "true" },
                            h("pop-brand-icon", { name: "external" }))))))))),
            h("section", { key: 'u', class: "np__backlinks" },
                h("button", { key: 'v', type: "button", class: "np__section-toggle", "aria-expanded": this.backlinksCollapsed ? 'false' : 'true', onClick: () => (this.backlinksCollapsed = !this.backlinksCollapsed) },
                    h("span", { key: 'w', class: { np__caret: true, 'np__caret--open': !this.backlinksCollapsed }, "aria-hidden": "true" },
                        h("pop-brand-icon", { key: 'x', name: "chevron-right" })),
                    h("span", { key: 'y', class: "np__section-label" }, "Backlinks"),
                    h("span", { key: 'z', class: "np__section-count" }, this.backlinksCount)),
                !this.backlinksCollapsed && (h("div", { key: '10', class: "np__backlinks-body" },
                    h("slot", { key: '11', name: "backlinks" },
                        h("p", { key: '12', class: "np__backlinks-empty" }, "No linked references yet."))))),
            h("div", { key: '13', class: "np__footer" },
                h("span", { key: '14', class: `np__sync ${sync.cls}` },
                    h("span", { key: '15', class: "np__sync-icon", "aria-hidden": "true" },
                        h("pop-brand-icon", { key: '16', name: sync.icon })),
                    h("span", { key: '17' }, sync.label)),
                this.aiHint && h("span", { key: '18', class: "np__ai-hint", "aria-live": "polite" }, this.aiHint))));
    }
};
PopNoteProperties.style = PopNotePropertiesStyle0();
//# sourceMappingURL=note-properties.js.map