import { Component, h, Prop, Event, EventEmitter, Element } from '@stencil/core';

/**
 * pop-note-card — a single note preview (Notes-app "digital brain").
 *
 * Renders title, snippet/excerpt, tag chips, updated-at, a pinned indicator,
 * and a visibility badge. Works in both a list-row and a gallery-grid tile via
 * the `layout` prop. Clicking the card emits `noteSelect` with the note id so
 * the page can open it (Home shares a split-pane with the Editor).
 *
 * The note object is passed as a DOM **property** (`.note = …`), not an
 * attribute. Snippet text is supplied by the page (notes store their body in
 * separate `/blocks` docs, so the card can't derive it alone) via `snippet`.
 *
 * See planned/notes-app-digital-brain/components.mdx §pop-note-card.
 */

/** Minimal shape the card reads. Mirrors NotesAdapter NoteDoc (kept structural
 *  so ui-kit has no dependency on notes-app). */
export interface NoteCardData {
  id: string;
  title?: string;
  tags?: string[];
  pinned?: boolean;
  visibility?: 'private' | 'family' | 'couple' | 'public';
  source?: string;
  taskLinks?: string[];
  updatedAt?: unknown;
  createdAt?: unknown;
}

const VIS_META: Record<string, { icon: string; label: string }> = {
  private: { icon: 'lock', label: 'Private' },
  family: { icon: 'users', label: 'Family' },
  couple: { icon: 'heart', label: 'Couple' },
  public: { icon: 'globe', label: 'Public' },
};

/** Provenance badge shown on the Inbox triage variant. */
const SOURCE_META: Record<string, { icon: string; label: string }> = {
  capture: { icon: 'edit', label: 'Captured' },
  clip: { icon: 'scissors', label: 'Clipped' },
  voice: { icon: 'mic', label: 'Voice' },
  bot: { icon: 'bot', label: 'Bot' },
};

@Component({
  tag: 'pop-note-card',
  encapsulation: { type: 'scoped' },
  styleUrl: 'note-card.css',
})
export class PopNoteCard {
  @Element() el!: HTMLElement;

  /** The note to preview (set as a property). */
  @Prop() note!: NoteCardData;

  /** Snippet/excerpt text. The page supplies it from the note's first blocks. */
  @Prop() snippet = '';

  /** Layout: a full-width list row, a gallery grid tile, or compact result chip. */
  @Prop({ reflect: true }) layout: 'list' | 'grid' | 'compact' = 'list';

  /** Highlighted when this is the selected note in the split-pane. */
  @Prop({ reflect: true }) selected = false;

  /**
   * Inline action affordance rendered beneath the card.
   *  - `'none'`  (default): no actions (Home/search/grid).
   *  - `'inbox'`: triage variant → source badge + [🔗 link] [✎ open] [✓ keep] [🗑].
   *  - `'trash'`: Trash variant → [↩ Restore] [✕ Delete forever].
   */
  @Prop({ reflect: true }) actions: 'none' | 'inbox' | 'trash' = 'none';

  /** Fired when the card is activated (click / Enter / Space). */
  @Event({ composed: true, bubbles: true }) noteSelect!: EventEmitter<{ id: string }>;

  /** Fired when the pin toggle is pressed. */
  @Event({ composed: true, bubbles: true }) notePin!: EventEmitter<{ id: string; pinned: boolean }>;

  /** Inbox triage: "keep" → the page sets triagedAt so it leaves the queue. */
  @Event({ composed: true, bubbles: true }) noteTriage!: EventEmitter<{ id: string }>;
  /** Inbox: link this note to another (the page opens its link picker). */
  @Event({ composed: true, bubbles: true }) noteLink!: EventEmitter<{ id: string }>;
  /** Soft-delete → Trash (Inbox 🗑). */
  @Event({ composed: true, bubbles: true }) noteTrash!: EventEmitter<{ id: string }>;
  /** Trash: restore (clears deletedAt). */
  @Event({ composed: true, bubbles: true }) noteRestore!: EventEmitter<{ id: string }>;
  /** Trash: delete forever (permanent purge; the page confirms first). */
  @Event({ composed: true, bubbles: true }) notePurge!: EventEmitter<{ id: string }>;

  private get relativeUpdated(): string {
    return relTime(this.note?.updatedAt ?? this.note?.createdAt);
  }

  private get visibility() {
    return VIS_META[this.note?.visibility ?? 'private'] ?? VIS_META.private;
  }

  private handleSelect = () => {
    if (this.note?.id) this.noteSelect.emit({ id: this.note.id });
  };

  private handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleSelect();
    }
  };

  private handlePin = (e: MouseEvent) => {
    e.stopPropagation();
    if (this.note?.id) this.notePin.emit({ id: this.note.id, pinned: !this.note.pinned });
  };

  /** Action-button helper: stop the click from also opening the note. */
  private act = (emitter: EventEmitter<{ id: string }>) => (e: MouseEvent) => {
    e.stopPropagation();
    if (this.note?.id) emitter.emit({ id: this.note.id });
  };

  private get sourceBadge() {
    return SOURCE_META[this.note?.source ?? ''] ?? null;
  }

  /** Triage / Trash inline action row, rendered as a sibling of the card body
   *  (NOT nested in the role=button article) so the buttons stay accessible. */
  private renderActions() {
    if (this.actions === 'inbox') {
      return (
        <div class="nc__actions" role="group" aria-label="Triage actions">
          <button type="button" class="nc__act" onClick={this.act(this.noteLink)} aria-label="Link to another note">
            <pop-brand-icon name="link" /> <span class="nc__act-label">Link</span>
          </button>
          <button type="button" class="nc__act" onClick={this.act(this.noteSelect)} aria-label="Open in editor">
            <pop-brand-icon name="edit" /> <span class="nc__act-label">Open</span>
          </button>
          <button type="button" class="nc__act nc__act--keep" onClick={this.act(this.noteTriage)} aria-label="Keep — mark triaged and leave the Inbox">
            <pop-brand-icon name="check" /> <span class="nc__act-label">Keep</span>
          </button>
          <button type="button" class="nc__act nc__act--danger" onClick={this.act(this.noteTrash)} aria-label="Move to Trash">
            <pop-brand-icon name="trash" /> <span class="nc__act-label">Trash</span>
          </button>
        </div>
      );
    }
    if (this.actions === 'trash') {
      return (
        <div class="nc__actions" role="group" aria-label="Trash actions">
          <button type="button" class="nc__act nc__act--keep" onClick={this.act(this.noteRestore)} aria-label="Restore note">
            <pop-brand-icon name="restore" /> <span class="nc__act-label">Restore</span>
          </button>
          <button type="button" class="nc__act nc__act--danger" onClick={this.act(this.notePurge)} aria-label="Delete forever">
            <pop-brand-icon name="close" /> <span class="nc__act-label">Delete forever</span>
          </button>
        </div>
      );
    }
    return null;
  }

  render() {
    const note = this.note;
    if (!note) return null;
    const tags = note.tags ?? [];
    const pinned = !!note.pinned;
    const clipped = note.source === 'clip';
    const hasTasks = !!(note.taskLinks && note.taskLinks.length);
    const vis = this.visibility;
    const src = this.actions === 'inbox' ? this.sourceBadge : null;

    const card = (
      <article
        class={{ 'nc': true, [`nc--${this.layout}`]: true, 'nc--selected': this.selected }}
        role="button"
        tabindex={0}
        aria-pressed={this.selected ? 'true' : 'false'}
        aria-label={`Open note: ${note.title || 'Untitled'}`}
        onClick={this.handleSelect}
        onKeyDown={this.handleKey}
      >
        <div class="nc__head">
          <h3 class="nc__title">{note.title || 'Untitled'}</h3>
          <button
            type="button"
            class={{ 'nc__pin': true, 'is-pinned': pinned }}
            aria-label={pinned ? 'Unpin note' : 'Pin note'}
            aria-pressed={pinned ? 'true' : 'false'}
            title={pinned ? 'Unpin' : 'Pin'}
            onClick={this.handlePin}
          >
            <pop-brand-icon name={pinned ? 'star' : 'star-outline'} />
          </button>
        </div>

        {this.layout !== 'compact' && this.snippet && (
          <p class="nc__snippet">{this.snippet}</p>
        )}

        <div class="nc__meta">
          {tags.length > 0 && (
            <span class="nc__tags" aria-label="Tags">
              {tags.slice(0, this.layout === 'grid' ? 4 : 3).map((t) => (
                <span class="nc__tag">#{t}</span>
              ))}
              {tags.length > (this.layout === 'grid' ? 4 : 3) && (
                <span class="nc__tag nc__tag--more">+{tags.length - (this.layout === 'grid' ? 4 : 3)}</span>
              )}
            </span>
          )}

          <span class="nc__icons">
            {src && (
              <span class="nc__source" title={src.label} aria-label={src.label}>
                <pop-brand-icon name={src.icon} /> {src.label}
              </span>
            )}
            <span class="nc__time">{this.relativeUpdated}</span>
            <span class="nc__badge" title={vis.label} aria-label={vis.label}><pop-brand-icon name={vis.icon} /></span>
            {clipped && this.actions !== 'inbox' && <span class="nc__badge" title="Clipped" aria-label="Clipped"><pop-brand-icon name="scissors" /></span>}
            {hasTasks && <span class="nc__badge nc__badge--task" title="Has linked tasks" aria-label="Has linked tasks"><pop-brand-icon name="check" /></span>}
          </span>
        </div>
      </article>
    );

    if (this.actions === 'none') return card;
    return (
      <div class={{ 'nc-wrap': true, [`nc-wrap--${this.actions}`]: true }}>
        {card}
        {this.renderActions()}
      </div>
    );
  }
}

/** Compact relative time (e.g. "5m", "2h", "3d", "Jun 2"). */
function relTime(value: unknown): string {
  const ms = toMillis(value);
  if (!ms) return '';
  const diff = Date.now() - ms;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const v = value as { toMillis?: () => number; seconds?: number };
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}
