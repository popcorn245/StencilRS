import { Component, h, Prop, State, Event, EventEmitter, Watch } from '@stencil/core';
import type { NoteCardData } from '../../molecules/note-card/note-card';

/**
 * pop-note-list — renders a collection of pop-note-card.
 *
 * Two view modes (both ship in v1): a single-column **list** and a gallery
 * **grid**. The default Home layout splits notes into a **Pinned** section and a
 * **Recent** section (`sectioned`); other surfaces (Trash, a filtered facet)
 * render one flat section by setting `sectioned={false}`.
 *
 * `notes` is set as a DOM **property**. Snippets are supplied via a `snippets`
 * map (noteId → excerpt) because note bodies live in separate `/blocks` docs.
 *
 * States: `loading` (skeleton), empty (slotted `empty` content or a default
 * pop-empty-state), and populated.
 *
 * See planned/notes-app-digital-brain/components.mdx §pop-note-list.
 */
@Component({
  tag: 'pop-note-list',
  encapsulation: { type: 'scoped' },
  styleUrl: 'note-list.css',
})
export class PopNoteList {
  /** The notes to render (set as a property). */
  @Prop() notes: NoteCardData[] = [];

  /** noteId → snippet/excerpt text (set as a property). */
  @Prop() snippets: Record<string, string> = {};

  /** List (rows) or grid (gallery tiles). */
  @Prop({ reflect: true }) view: 'list' | 'grid' = 'list';

  /** Split into Pinned + Recent sections (Home default) vs one flat list. */
  @Prop() sectioned = true;

  /** Show the loading skeleton instead of content. */
  @Prop() loading = false;

  /** id of the currently-selected note (highlights its card). */
  @Prop() selectedId = '';

  /** Re-emitted from the cards so the page can open / pin a note. */
  @Event({ composed: true, bubbles: true }) noteSelect!: EventEmitter<{ id: string }>;
  @Event({ composed: true, bubbles: true }) notePin!: EventEmitter<{ id: string; pinned: boolean }>;

  @State() private _notes: NoteCardData[] = [];

  @Watch('notes')
  notesChanged(v: NoteCardData[]) {
    this._notes = Array.isArray(v) ? v : [];
  }

  componentWillLoad() {
    this.notesChanged(this.notes);
  }

  private renderCard = (n: NoteCardData) => (
    <pop-note-card
      key={n.id}
      note={n}
      snippet={this.snippets?.[n.id] ?? ''}
      layout={this.view === 'grid' ? 'grid' : 'list'}
      selected={n.id === this.selectedId}
    />
  );

  private renderSection(title: string, items: NoteCardData[]) {
    if (!items.length) return null;
    return (
      <section class="nl__section">
        <h2 class="nl__section-head">
          <span class="nl__section-title">{title}</span>
          <span class="nl__section-count">{items.length}</span>
        </h2>
        <div class={{ 'nl__items': true, [`nl__items--${this.view}`]: true }}>
          {items.map(this.renderCard)}
        </div>
      </section>
    );
  }

  render() {
    if (this.loading) {
      // Card-shaped skeletons (title + snippet + meta) mirror the note-card
      // silhouette so loading has the same shape as the content it becomes.
      return (
        <div class="nl">
          <pop-loading-state
            variant="card-skeleton"
            grid={this.view === 'grid'}
            count={this.view === 'grid' ? 6 : 5}
            label="Loading notes"
          />
        </div>
      );
    }

    const notes = this._notes;
    if (!notes.length) {
      return (
        <div class="nl nl--empty">
          <slot name="empty">
            <pop-empty-state
              iconName="home"
              heading="Nothing here yet"
              message="Capture a thought to fill your brain."
              size="full"
            />
          </slot>
        </div>
      );
    }

    if (!this.sectioned) {
      return (
        <div class="nl">
          <div class={{ 'nl__items': true, [`nl__items--${this.view}`]: true }} role="list">
            {notes.map(this.renderCard)}
          </div>
        </div>
      );
    }

    const pinned = notes.filter((n) => n.pinned);
    const recent = notes.filter((n) => !n.pinned);
    return (
      <div class="nl">
        {this.renderSection('Pinned', pinned)}
        {this.renderSection('Recent', recent)}
      </div>
    );
  }
}
