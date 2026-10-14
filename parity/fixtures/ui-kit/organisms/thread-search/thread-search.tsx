import { Component, h, Prop, State, Watch, Event, EventEmitter } from '@stencil/core';
import type { ThreadItem } from '../thread-timeline/thread-timeline-types';

/** One hit: the item, the thread it lives in, and a highlighted text snippet. */
export interface SearchResult {
  item: ThreadItem;
  thread: { id: string; title: string; localDate?: string };
  snippet: string;
}

/** Counts per facet value, keyed by facet id. */
export interface SearchFacets {
  cardType: Record<string, number>;
  sourcePanel: Record<string, number>;
}

/** Which facet values are currently applied. */
export interface ActiveFacets {
  cardType: string[];
  sourcePanel: string[];
}

/** Facet values the host knows about, so a zero-count facet can still show. */
export interface AvailableFacets {
  cardType: { type: string; label: string }[];
  sourcePanel: string[];
}

/** Detail of `popSearch`. */
export interface SearchDetail {
  q: string;
  facets: ActiveFacets;
}

/** Detail of `popResultOpen` — deep-links straight at one item. */
export interface ResultOpenDetail {
  threadId: string;
  itemId: string;
}

const EMPTY_ACTIVE: ActiveFacets = { cardType: [], sourcePanel: [] };

/**
 * pop-thread-search — search across threads with card-type / source-panel facets.
 *
 * Props in, events out: the component never queries anything. It owns exactly
 * one piece of state — the text currently in the input — and everything else
 * (results, counts, which facets are on) is fed down by the host. Toggling a
 * facet emits `popSearch` immediately with the NEW facet set; the host decides
 * what that means.
 */
@Component({
  tag: 'pop-thread-search',
  encapsulation: { type: 'scoped' },
  styleUrl: 'thread-search.css',
})
export class PopThreadSearch {
  /** Hits, in the order the host wants them shown. Never re-sorted here. */
  @Prop() results: SearchResult[] = [];
  /** Counts per facet value. */
  @Prop() facets: SearchFacets = { cardType: {}, sourcePanel: {} };
  /** Facet values currently applied. */
  @Prop() activeFacets: ActiveFacets = { cardType: [], sourcePanel: [] };
  /** Optional full facet vocabulary + labels, so zero-count values still render. */
  @Prop() available?: AvailableFacets;
  /** The query the host last ran. */
  @Prop() query = '';
  @Prop() loading = false;

  /** Emitted on submit and on every facet toggle. */
  @Event({ composed: true, bubbles: true }) popSearch!: EventEmitter<SearchDetail>;
  /** Emitted when a hit is opened — deep-link to `itemId` inside `threadId`. */
  @Event({ composed: true, bubbles: true }) popResultOpen!: EventEmitter<ResultOpenDetail>;

  /** The text in the box. The only state this component owns. */
  @State() draft = '';

  componentWillLoad() {
    this.draft = this.query || '';
  }

  @Watch('query')
  onQueryChange(next: string) {
    this.draft = next || '';
  }

  private active(): ActiveFacets {
    const a = this.activeFacets || EMPTY_ACTIVE;
    return {
      cardType: Array.isArray(a.cardType) ? a.cardType : [],
      sourcePanel: Array.isArray(a.sourcePanel) ? a.sourcePanel : [],
    };
  }

  private submit = (ev?: Event) => {
    ev?.preventDefault();
    this.popSearch.emit({ q: this.draft.trim(), facets: this.active() });
  };

  private toggleFacet(kind: keyof ActiveFacets, value: string) {
    const current = this.active();
    const on = current[kind].includes(value);
    const next: ActiveFacets = {
      ...current,
      [kind]: on ? current[kind].filter((v) => v !== value) : [...current[kind], value],
    };
    this.popSearch.emit({ q: this.draft.trim(), facets: next });
  }

  /** Facet values to render: the host's vocabulary if given, else the counts. */
  private cardTypeValues(): { value: string; label: string }[] {
    if (this.available?.cardType?.length) {
      return this.available.cardType.map((c) => ({ value: c.type, label: c.label || c.type }));
    }
    return Object.keys(this.facets?.cardType || {}).map((t) => ({ value: t, label: t }));
  }

  private sourcePanelValues(): { value: string; label: string }[] {
    const list = this.available?.sourcePanel?.length
      ? this.available.sourcePanel
      : Object.keys(this.facets?.sourcePanel || {});
    return list.map((p) => ({ value: p, label: p }));
  }

  private renderChipRow(
    kind: keyof ActiveFacets,
    heading: string,
    values: { value: string; label: string }[],
  ) {
    if (!values.length) return null;
    const counts = (this.facets?.[kind] || {}) as Record<string, number>;
    const active = this.active()[kind];
    return (
      <div class="tsr__facet">
        <span class="tsr__facet-label">{heading}</span>
        <div class="tsr__chips">
          {values.map((v) => {
            const on = active.includes(v.value);
            return (
              <button
                key={`${kind}:${v.value}`}
                type="button"
                class={{ tsr__chip: true, 'tsr__chip--on': on }}
                aria-pressed={on ? 'true' : 'false'}
                onClick={() => this.toggleFacet(kind, v.value)}
              >
                {v.label}
                <span class="tsr__count">{counts[v.value] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /** Group hits by thread, preserving the host's result order. */
  private groups(): { thread: SearchResult['thread']; hits: SearchResult[] }[] {
    const out: { thread: SearchResult['thread']; hits: SearchResult[] }[] = [];
    for (const r of Array.isArray(this.results) ? this.results : []) {
      if (!r || !r.thread || !r.item) continue;
      const last = out[out.length - 1];
      if (last && last.thread.id === r.thread.id) last.hits.push(r);
      else out.push({ thread: r.thread, hits: [r] });
    }
    return out;
  }

  render() {
    const groups = this.groups();
    return (
      <div class="tsr">
        <form class="tsr__form" onSubmit={this.submit}>
          <input
            class="tsr__input"
            type="search"
            placeholder="Search threads…"
            aria-label="Search threads"
            value={this.draft}
            onInput={(ev) => (this.draft = (ev.target as HTMLInputElement).value)}
          />
          <button
            type="button"
            class="pop-iconbtn tsr__go"
            title="Search"
            aria-label="Search"
            onClick={() => this.submit()}
          >
            <ion-icon name="search-outline" aria-hidden="true" />
          </button>
        </form>

        <div class="tsr__facets">
          {this.renderChipRow('cardType', 'Card type', this.cardTypeValues())}
          {this.renderChipRow('sourcePanel', 'Panel', this.sourcePanelValues())}
        </div>

        {this.loading ? (
          <p class="tsr__state" role="status" aria-live="polite">
            <ion-icon name="hourglass-outline" aria-hidden="true" />
            Searching…
          </p>
        ) : groups.length === 0 ? (
          <p class="tsr__state tsr__state--empty">No matches.</p>
        ) : (
          <div class="tsr__results">
            {groups.map((g) => (
              <section key={g.thread.id} class="tsr__group">
                <h3 class="tsr__group-head">
                  <span class="tsr__group-title">{g.thread.title}</span>
                  {g.thread.localDate && <span class="tsr__group-date">{g.thread.localDate}</span>}
                </h3>
                {g.hits.map((hit) => (
                  <button
                    key={hit.item.id}
                    type="button"
                    class="tsr__hit"
                    onClick={() =>
                      this.popResultOpen.emit({ threadId: g.thread.id, itemId: hit.item.id })
                    }
                  >
                    <span class="tsr__snippet">{hit.snippet}</span>
                    {hit.item.cardType && <span class="tsr__tag">{hit.item.cardType}</span>}
                    {hit.item.sourcePanel && <span class="tsr__tag">{hit.item.sourcePanel}</span>}
                  </button>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }
}
