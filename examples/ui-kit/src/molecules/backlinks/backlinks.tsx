import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

/**
 * pop-backlinks — "Linked references" / what-links-here list (notes-app Phase 3).
 *
 * Rendered INSIDE the properties rail (pop-note-properties' backlinks slot), not
 * at the bottom of the note (locked layout decision, linking-and-graph.mdx).
 *
 * Presentational only: the host (page-editor) computes backlinks via the
 * NotesAdapter — Dexie `where('links').equals(noteId)` offline-primary, mirrored
 * by Firestore `array-contains` — and passes them in. Each item shows the source
 * note's title + an optional snippet/context; clicking emits `open(id)` so the
 * host can route to `/note/:id`.
 *
 *   <pop-backlinks
 *     items={[{ id:'a', title:'Roadmap', snippet:'…see [[Q3]]…' }]}
 *     loading={false}
 *     onOpen={e => Router.push(`/note/${e.detail}`)}
 *   />
 */

export interface BacklinkItem {
  id: string;
  title: string;
  /** Short context snippet showing the linking sentence (optional). */
  snippet?: string;
}

@Component({
  tag: 'pop-backlinks',
  encapsulation: { type: 'scoped' },
  styleUrl: 'backlinks.css',
})
export class PopBacklinks {
  /**
   * Backlink source notes. Accepts a BacklinkItem[] (set as a DOM property) or a
   * JSON string (so it can be used declaratively / in Storybook attributes).
   */
  @Prop() items: BacklinkItem[] | string = [];
  /** Loading state — show skeleton rows while the query resolves. */
  @Prop() loading: boolean = false;

  /** Emitted with the source note id when a backlink is activated. */
  @Event({ composed: true, bubbles: true }) open!: EventEmitter<string>;

  private parsed(): BacklinkItem[] {
    if (Array.isArray(this.items)) return this.items;
    try {
      const v = JSON.parse(this.items || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  render() {
    if (this.loading) {
      return (
        <ul class="bl bl--loading" aria-busy="true" aria-label="Loading backlinks">
          {[0, 1, 2].map((i) => (
            <li class="bl__skeleton" key={i}>
              <span class="bl__skeleton-title" />
              <span class="bl__skeleton-snippet" />
            </li>
          ))}
        </ul>
      );
    }

    const items = this.parsed();
    if (!items.length) {
      return (
        <p class="bl__empty" role="status">
          No backlinks yet.
        </p>
      );
    }

    return (
      <ul class="bl" aria-label="Linked references">
        {items.map((it) => (
          <li class="bl__item" key={it.id}>
            <button
              type="button"
              class="bl__link"
              title={`Open “${it.title || 'Untitled'}”`}
              onClick={() => this.open.emit(it.id)}
            >
              <span class="bl__icon" aria-hidden="true">
                <pop-brand-icon name="link" />
              </span>
              <span class="bl__body">
                <span class="bl__title">{it.title || 'Untitled'}</span>
                {it.snippet && <span class="bl__snippet">{it.snippet}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }
}
