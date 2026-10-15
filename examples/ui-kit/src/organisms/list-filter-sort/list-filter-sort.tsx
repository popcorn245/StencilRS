import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

/**
 * `pop-list-filter-sort` — the drop-in header row for list dialogs: ONE row
 * composing `pop-search-filter` (flex:1) + `pop-view-switcher` (flex:0) + a
 * named `actions` slot for dialog-specific extras (e.g. an Add button).
 *
 * Many hub dialogs (photos/images, tasks, inventory, calendar) each hand-roll
 * this same search + filter + view toolbar; this organism is the shared piece.
 * Expected adopters: hub-inventory (done), hub-images/photos, hub-tasks.
 *
 * Pass-through props: `value`, `placeholder`, `filters`, `debounce`,
 * `showClear` → pop-search-filter; `views`, `view` → pop-view-switcher.
 * `views` parsing to an EMPTY array (`views="[]"`) omits the switcher element
 * entirely (no stray flex-gap ghost). The `input` slot is passed through to
 * pop-search-filter: slot a host-owned search widget with `slot="input"` and
 * it replaces the built-in input (the host owns its value/events —
 * `searchChange` only fires from the built-in input). The pass-through slot is
 * always rendered (scoped-slot rule), so late-upgrading hosts still project.
 *
 * The child events are re-emitted from THIS host (the originals are stopped),
 * so hosts listen in one place: `searchChange`, `filterChange`,
 * `clearFilters`, `viewChange`.
 *
 * @example
 * <pop-list-filter-sort
 *   placeholder="Search name, tag, UPC…"
 *   filters='[{"key":"show","label":"Show","kind":"tabs","value":"","options":[{"value":"","label":"All"}]}]'
 *   views='["list","card"]'
 *   view="list">
 *   <button slot="actions" class="pop-iconbtn" aria-label="Add">…</button>
 * </pop-list-filter-sort>
 */
@Component({
  tag: 'pop-list-filter-sort',
  encapsulation: { type: 'scoped' },
  styleUrl: 'list-filter-sort.css',
})
export class PopListFilterSort {
  /** Current search text (→ pop-search-filter `value`). */
  @Prop() value: string = '';
  /** Search placeholder (→ pop-search-filter). */
  @Prop() placeholder: string = 'Search…';
  /** JSON filter group descriptors (→ pop-search-filter `filters`). */
  @Prop() filters: string = '[]';
  /** Debounce (ms) for searchChange (→ pop-search-filter). */
  @Prop() debounce: number = 150;
  /** Show "Clear all" in the filter popover (→ pop-search-filter). */
  @Prop() showClear: boolean = true;
  /** JSON view list (→ pop-view-switcher `views`). `[]` hides the switcher. */
  @Prop() views: string = '["list","card"]';
  /** Current view (→ pop-view-switcher `value`). */
  @Prop() view: string = '';

  /** Re-emitted from pop-search-filter: debounced search text. */
  @Event({ composed: true, bubbles: true }) searchChange: EventEmitter<string>;
  /** Re-emitted from pop-search-filter: a filter group changed. */
  @Event({ composed: true, bubbles: true }) filterChange: EventEmitter<{ key: string; value: string }>;
  /** Re-emitted from pop-search-filter: "Clear all" pressed. */
  @Event({ composed: true, bubbles: true }) clearFilters: EventEmitter<void>;
  /** Re-emitted from pop-view-switcher: the view changed. */
  @Event({ composed: true, bubbles: true }) viewChange: EventEmitter<string>;

  /** Stop the child's bubbling event and re-emit it from this host, so the
   *  parent sees exactly ONE event, sourced here. */
  private relay = <T,>(emitter: EventEmitter<T>) => (ev: CustomEvent<T>) => {
    ev.stopPropagation();
    emitter.emit(ev.detail);
  };

  /** True when `views` parses to a non-empty array. pop-view-switcher would
   *  render null for `[]` anyway, but its HOST element would still sit in the
   *  flex row and cost a phantom gap — so we omit the element entirely. */
  private hasViews(): boolean {
    try {
      const arr = JSON.parse(this.views);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  }

  render() {
    return (
      <div class="plfs">
        <pop-search-filter
          class="plfs__search"
          value={this.value}
          placeholder={this.placeholder}
          filters={this.filters}
          debounce={this.debounce}
          showClear={this.showClear}
          onSearchChange={this.relay(this.searchChange)}
          onFilterChange={this.relay(this.filterChange)}
          onClearFilters={this.relay(this.clearFilters)}
        >
          {/* input pass-through: content slotted here as [slot=input] keeps its
              slot attr through relocation, so pop-search-filter re-slots it. */}
          <slot name="input" />
        </pop-search-filter>
        {this.hasViews() && (
          <pop-view-switcher
            class="plfs__views"
            views={this.views}
            value={this.view}
            onViewChange={this.relay(this.viewChange)}
          />
        )}
        <slot name="actions" />
      </div>
    );
  }
}
