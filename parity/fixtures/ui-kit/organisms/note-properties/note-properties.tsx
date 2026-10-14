import { Component, h, Prop, Event, EventEmitter, State } from '@stencil/core';

/**
 * pop-note-properties — the Note Editor's right-hand metadata rail.
 *
 * Surfaces a note's properties beside the prose instead of burying them in a
 * menu (see notes-app screens.mdx §Editor):
 *   - Title (editable single line — mirrors the note's derived title)
 *   - Tags-as-properties (add/remove chips via pop-chip-input)
 *   - Visibility selector (private | family | couple | public)
 *   - Pinned toggle
 *   - Created / Updated timestamps
 *   - Linked tasks (deep-link out to tasks.popcorn245.com) + links-out count
 *   - Sync status chip
 *   - A collapsible Backlinks SECTION whose body is an EMPTY <slot name="backlinks">.
 *     Phase 3 drops <pop-backlinks slot="backlinks"> in without restructuring.
 *
 * This organism is presentational: it emits change events; the host page
 * (page-editor) owns persistence through the NotesAdapter.
 *
 *   <pop-note-properties
 *     title="Project brief"
 *     tags={['work','q3']}
 *     suggestions={[{id:'work',label:'work'}]}
 *     visibility="family"
 *     pinned={false}
 *     created="Jun 2"
 *     updated="2h ago"
 *     linkedTasks={[{id:'t1',title:'Ship MVP'}]}
 *     linksOut={3}
 *     syncState="synced"
 *     backlinksCount={4}
 *     onTitleChange={e => …}
 *     onTagsChange={e => …}
 *     onVisibilityChange={e => …}
 *     onPinnedChange={e => …}
 *     onOpenTask={e => …}
 *   &gt;
 *     pop-backlinks (slot="backlinks") goes here in Phase 3
 *   &lt;/pop-note-properties&gt;
 */

export interface LinkedTaskRef {
  id: string;
  title: string;
}

export interface TagSuggestion {
  id: string;
  label: string;
}

export type SyncState = 'synced' | 'saving' | 'pending' | 'error';

@Component({
  tag: 'pop-note-properties',
  encapsulation: { type: 'scoped' },
  styleUrl: 'note-properties.css',
})
export class PopNoteProperties {
  /** Editable title — mirrors the note's derived/first-line title. */
  @Prop() noteTitle: string = '';
  /** Tags-as-properties. */
  @Prop() tags: string[] = [];
  /** Autocomplete seed for the tag input (all tags across the brain). */
  @Prop() suggestions: TagSuggestion[] = [];
  /** Visibility — reuses the task enum. */
  @Prop() visibility: string = 'private';
  /** Pinned to the top of Home's Pinned split. */
  @Prop() pinned: boolean = false;
  /** Pre-formatted created timestamp (host formats; rail just displays). */
  @Prop() created: string = '';
  /** Pre-formatted updated timestamp. */
  @Prop() updated: string = '';
  /** Tasks this note backs — deep-link out to tasks.popcorn245.com. */
  @Prop() linkedTasks: LinkedTaskRef[] = [];
  /** Count of `[[ ]]` link-outs (Phase 3 populates note.links). */
  @Prop() linksOut: number = 0;
  /** Sync chip state. */
  @Prop() syncState: SyncState = 'synced';
  /** Backlinks count for the collapsible section header (body is a slot). */
  @Prop() backlinksCount: number = 0;
  /** AI-backfill hint surfaced subtly (e.g. "Indexing…" / "Indexed"). */
  @Prop() aiHint: string = '';

  /** Emitted on title commit (blur / Enter). */
  @Event({ composed: true, bubbles: true }) titleChange!: EventEmitter<string>;
  /** Emitted whenever the tag set changes. */
  @Event({ composed: true, bubbles: true }) tagsChange!: EventEmitter<string[]>;
  /** Emitted on visibility select. */
  @Event({ composed: true, bubbles: true }) noteVisibilityChange!: EventEmitter<string>;
  /** Emitted on pin toggle. */
  @Event({ composed: true, bubbles: true }) pinnedChange!: EventEmitter<boolean>;
  /** Emitted when a linked task is opened (deep-link to tasks app). */
  @Event({ composed: true, bubbles: true }) openTask!: EventEmitter<string>;

  /** Backlinks section collapsed state (local UI; defaults open). */
  @State() backlinksCollapsed = false;

  private readonly VIS_OPTIONS = [
    { id: 'private', label: 'Private' },
    { id: 'family', label: 'Family' },
    { id: 'couple', label: 'Couple' },
    { id: 'public', label: 'Public' },
  ];

  private syncMeta(): { icon: string; label: string; cls: string } {
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

  private commitTitle = (e: Event) => {
    const next = (e.target as HTMLInputElement).value;
    this.titleChange.emit(next);
  };

  render() {
    const sync = this.syncMeta();
    return (
      <aside class="np" aria-label="Note properties">
        {/* ── Title ── */}
        <div class="np__field">
          <label class="np__label" htmlFor="np-title">Title</label>
          <input
            id="np-title"
            class="np__title-input"
            type="text"
            value={this.noteTitle}
            placeholder="Untitled"
            onChange={this.commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>

        {/* ── Tags ── */}
        <div class="np__field">
          <label class="np__label">Tags</label>
          <pop-chip-input
            value={this.tags}
            suggestions={this.suggestions}
            placeholder="Add a tag…"
            onValueChanged={(e: CustomEvent<string[]>) => this.tagsChange.emit(e.detail)}
          />
        </div>

        {/* ── Visibility ── */}
        <div class="np__field">
          <label class="np__label">Visibility</label>
          <pop-radio-group
            value={this.visibility}
            options={this.VIS_OPTIONS}
            ariaLabel="Note visibility"
            onValueChanged={(e: CustomEvent<string>) => this.noteVisibilityChange.emit(e.detail)}
          />
        </div>

        {/* ── Pinned ── */}
        <div class="np__field np__field--row">
          <span class="np__label" id="np-pin-label">Pinned</span>
          <button
            type="button"
            class={{ np__toggle: true, 'np__toggle--on': this.pinned }}
            role="switch"
            aria-checked={this.pinned ? 'true' : 'false'}
            aria-labelledby="np-pin-label"
            onClick={() => this.pinnedChange.emit(!this.pinned)}
          >
            <span class="np__toggle-track"><span class="np__toggle-thumb" /></span>
            <span class="np__toggle-text">
              {this.pinned ? 'Pinned' : 'Pin to top'}
              {this.pinned && <pop-brand-icon name="star" />}
            </span>
          </button>
        </div>

        {/* ── Timestamps ── */}
        <dl class="np__meta">
          <div class="np__meta-row">
            <dt class="np__label">Created</dt>
            <dd class="np__meta-val">{this.created || '—'}</dd>
          </div>
          <div class="np__meta-row">
            <dt class="np__label">Updated</dt>
            <dd class="np__meta-val">{this.updated || '—'}</dd>
          </div>
          <div class="np__meta-row">
            <dt class="np__label">Links out</dt>
            <dd class="np__meta-val">{this.linksOut}</dd>
          </div>
        </dl>

        {/* ── Linked tasks ── */}
        {this.linkedTasks.length > 0 && (
          <div class="np__field">
            <span class="np__label">Linked tasks ({this.linkedTasks.length})</span>
            <ul class="np__tasks">
              {this.linkedTasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    class="np__task"
                    title="Open in Tasks"
                    onClick={() => this.openTask.emit(t.id)}
                  >
                    <span class="np__task-title">{t.title}</span>
                    <span class="np__task-out" aria-hidden="true"><pop-brand-icon name="external" /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Backlinks (collapsible). Body is an EMPTY slot Phase 3 fills. ── */}
        <section class="np__backlinks">
          <button
            type="button"
            class="np__section-toggle"
            aria-expanded={this.backlinksCollapsed ? 'false' : 'true'}
            onClick={() => (this.backlinksCollapsed = !this.backlinksCollapsed)}
          >
            <span class={{ np__caret: true, 'np__caret--open': !this.backlinksCollapsed }} aria-hidden="true"><pop-brand-icon name="chevron-right" /></span>
            <span class="np__section-label">Backlinks</span>
            <span class="np__section-count">{this.backlinksCount}</span>
          </button>
          {!this.backlinksCollapsed && (
            <div class="np__backlinks-body">
              {/* Phase 3 drops <pop-backlinks slot="backlinks"> here. */}
              <slot name="backlinks">
                <p class="np__backlinks-empty">No linked references yet.</p>
              </slot>
            </div>
          )}
        </section>

        {/* ── Sync + AI hint ── */}
        <div class="np__footer">
          <span class={`np__sync ${sync.cls}`}>
            <span class="np__sync-icon" aria-hidden="true"><pop-brand-icon name={sync.icon} /></span>
            <span>{sync.label}</span>
          </span>
          {this.aiHint && <span class="np__ai-hint" aria-live="polite">{this.aiHint}</span>}
        </div>
      </aside>
    );
  }
}
