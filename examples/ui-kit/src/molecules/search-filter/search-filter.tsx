import { Component, h, Prop, State, Event, EventEmitter, Watch, Element } from '@stencil/core';

/** One option inside a filter group. `value: ''` = the group's default (All). */
export interface SearchFilterOption {
  value: string;
  label: string;
}

/** One filter group rendered inside the funnel popover. */
export interface SearchFilterGroup {
  key: string;
  label: string;
  /** `tabs` → a pill tab row; `select` → a styled select with caret. */
  kind: 'select' | 'tabs';
  options: SearchFilterOption[];
  /** Current value; `''` = default/All. */
  value: string;
  /** The group's at-rest value (`''` when omitted). A group counts as ACTIVE
   *  (funnel dot + Clear all) only while `value !== default`, and Clear all
   *  resets the group to it. Lets Group/Sort-style controls whose resting
   *  value isn't `''` (e.g. tasks' Group=date / Sort=dueDate) ride the popover
   *  without reading as always-filtered. */
  default?: string;
}

/**
 * `pop-search-filter` — a search input with the funnel FILTER BUTTON baked into
 * the field's right edge (and a leading search glyph on the left), popover
 * included.
 *
 * The hub's dialogs (photos/images, tasks, inventory, calendar) each hand-roll
 * this exact search + funnel-filter idiom; this molecule is the shared piece.
 * Expected adopters: hub-images (photos), hub-tasks, hub-inventory, and any
 * future list dialog — usually via the `pop-list-filter-sort` organism.
 *
 * CONTROLLED for filters: the host passes `filters` (a JSON array of
 * {key,label,kind,options,value} group descriptors) and reacts to
 * `filterChange` / `clearFilters`. The search text is a mutable `value` prop;
 * `searchChange` is debounced (`debounce` ms).
 *
 * The funnel trigger shows an active-filter DOT when any group's value !==
 * its `default` (`''` when omitted — the calendar/tasks idiom). Popover
 * dismisses on backdrop click + Escape. `filters` parsing to an EMPTY array →
 * the funnel is not rendered at all (search-only mode).
 *
 * CUSTOM INPUT (`input` slot): slot a host-owned search widget (e.g. hub-tasks'
 * pop-mention-input) with `slot="input"` and it takes the built-in input's
 * place while the funnel + popover + active dot + Clear all chrome is kept
 * (the lead search glyph is dropped — the widget brings its own affordances,
 * and the funnel rides the row as a static field-height sibling since it can't
 * safely inset into an arbitrary widget). In slot mode the HOST owns the
 * widget's value/events; `searchChange` fires only from the built-in input.
 * The slot element is ALWAYS rendered (scoped-slot rule: a conditionally added
 * slot never picks up late-mounted content); detection is a light-DOM
 * `[slot="input"]` query re-checked after every render.
 *
 * @example
 * <pop-search-filter
 *   placeholder="Search name, tag, UPC…"
 *   filters='[{"key":"show","label":"Show","kind":"tabs","value":"","options":[{"value":"","label":"All"},{"value":"low","label":"Low stock"}]}]'
 *   show-clear>
 * </pop-search-filter>
 */
@Component({
  tag: 'pop-search-filter',
  encapsulation: { type: 'scoped' },
  styleUrl: 'search-filter.css',
})
export class PopSearchFilter {
  @Element() el: HTMLElement;

  /** Current search text (mutable — reflects what's in the field). */
  @Prop({ mutable: true }) value: string = '';
  /** Placeholder for the search input. */
  @Prop() placeholder: string = 'Search…';
  /** Debounce (ms) for `searchChange`. 0 → emit synchronously. */
  @Prop() debounce: number = 150;
  /** JSON array of filter group descriptors (see SearchFilterGroup). */
  @Prop() filters: string = '[]';
  /** Show a "Clear all" affordance in the popover when any filter is non-default. */
  @Prop() showClear: boolean = true;

  /** Debounced search text. */
  @Event({ composed: true, bubbles: true }) searchChange: EventEmitter<string>;
  /** A filter group's value changed. */
  @Event({ composed: true, bubbles: true }) filterChange: EventEmitter<{ key: string; value: string }>;
  /** The "Clear all" affordance was pressed. */
  @Event({ composed: true, bubbles: true }) clearFilters: EventEmitter<void>;

  /** Whether the funnel popover is open (view-local). */
  @State() open: boolean = false;
  /** Parsed filter groups (re-parsed when `filters` changes). */
  @State() groups: SearchFilterGroup[] = [];
  /** Bumped when input-slot detection changes after a render (late-mounted
   *  slotted content, e.g. projected through pop-list-filter-sort). */
  @State() slotTick: number = 0;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** What `hasSlottedInput()` returned during the LAST render — compared in
   *  componentDidRender/-Load to catch content that lands after we render. */
  private renderedSlotted?: boolean;

  @Watch('filters')
  parseFilters(json?: string) {
    try {
      const arr = JSON.parse(json ?? this.filters);
      if (!Array.isArray(arr)) {
        this.groups = [];
        return;
      }
      this.groups = arr
        .filter((g) => g && typeof g === 'object' && Array.isArray(g.options))
        .map((g) => ({
          key: String(g.key ?? ''),
          label: String(g.label ?? g.key ?? ''),
          kind: g.kind === 'tabs' ? 'tabs' as const : 'select' as const,
          value: String(g.value ?? ''),
          default: String(g.default ?? ''),
          options: (g.options as unknown[])
            .filter((o) => o && typeof o === 'object')
            .map((o) => ({
              value: String((o as { value?: unknown }).value ?? ''),
              label: String((o as { label?: unknown; value?: unknown }).label ?? (o as { value?: unknown }).value ?? ''),
            })),
        }));
    } catch {
      this.groups = [];
    }
  }

  componentWillLoad() {
    this.parseFilters();
  }

  connectedCallback() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.onKeyDown);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.open = false;
  };

  /** Light-DOM check for a slotted custom input (the presenter/hasActions
   *  idiom) — re-evaluated on every render, never cached across props. */
  private hasSlottedInput(): boolean {
    return !!this.el?.querySelector('[slot="input"]');
  }

  /** Late-slot safety net: if slotted content appeared/vanished since the last
   *  render (nested projection can land after our first pass), re-render once. */
  private recheckSlot() {
    const now = this.hasSlottedInput();
    if (this.renderedSlotted !== undefined && now !== this.renderedSlotted) {
      this.renderedSlotted = now;
      this.slotTick++;
    }
  }

  componentDidLoad() {
    this.recheckSlot();
  }

  componentDidRender() {
    this.recheckSlot();
  }

  /** True when any group's value differs from its default — drives the
   *  funnel's active dot. */
  private get filtersActive(): boolean {
    return this.groups.some((g) => g.value !== (g.default ?? ''));
  }

  private onInput = (e: globalThis.Event) => {
    const next = (e.target as HTMLInputElement).value;
    this.value = next;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.debounce > 0) {
      this.debounceTimer = setTimeout(() => this.searchChange.emit(next), this.debounce);
    } else {
      this.searchChange.emit(next);
    }
  };

  private pick(group: SearchFilterGroup, value: string) {
    // Optimistic local echo so the popover reflects the pick even before the
    // host re-renders us with an updated `filters` JSON (controlled flow).
    this.groups = this.groups.map((g) => (g.key === group.key ? { ...g, value } : g));
    this.filterChange.emit({ key: group.key, value });
  }

  private clearAll = (e: MouseEvent) => {
    e.stopPropagation();
    this.groups = this.groups.map((g) => ({ ...g, value: g.default ?? '' }));
    this.clearFilters.emit();
  };

  private renderGroup(g: SearchFilterGroup) {
    if (g.kind === 'tabs') {
      return (
        <div class="psf__group" key={g.key}>
          <span class="psf__group-label">{g.label}</span>
          <div class="psf__tabs" aria-label={g.label}>
            {g.options.map((o) => (
              <button
                type="button"
                class={{ psf__tab: true, 'psf__tab--on': g.value === o.value }}
                aria-pressed={g.value === o.value ? 'true' : 'false'}
                onClick={(e) => {
                  e.stopPropagation();
                  this.pick(g, o.value);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <label class="psf__group" key={g.key}>
        <span class="psf__group-label">{g.label}</span>
        <select
          class="psf__select"
          aria-label={g.label}
          onChange={(e) => this.pick(g, (e.target as HTMLSelectElement).value)}
        >
          {g.options.map((o) => (
            <option value={o.value} selected={g.value === o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  render() {
    const hasFilters = this.groups.length > 0;
    // Slot detection is LIVE each render; renderedSlotted records what this
    // pass saw so the didRender/didLoad recheck can catch late projection.
    const slotted = (this.renderedSlotted = this.hasSlottedInput());
    return (
      <div class={{ psf: true, 'psf--slotted': slotted }}>
        <div class="psf__field">
          {!slotted && <pop-icon class="psf__lead" name="search-outline" />}
          {/* The input slot is ALWAYS rendered (scoped-slot rule: a slot added
              after the first render leaves late content Stencil-hidden); when
              nothing is slotted the wrapper is display:none via CSS. */}
          <span class="psf__slot">
            <slot name="input" />
          </span>
          {!slotted && (
            <input
              class={{ psf__input: true, 'psf__input--nofunnel': !hasFilters }}
              type="search"
              placeholder={this.placeholder}
              value={this.value}
              aria-label={this.placeholder}
              onInput={this.onInput}
            />
          )}
          {hasFilters && (
            <button
              type="button"
              class={{ psf__funnel: true, 'psf__funnel--open': this.open, 'psf__funnel--active': this.filtersActive }}
              aria-haspopup="dialog"
              aria-expanded={this.open ? 'true' : 'false'}
              aria-label="Filter"
              title="Filter"
              onClick={(e) => {
                e.stopPropagation();
                this.open = !this.open;
              }}
            >
              <pop-icon name="funnel-outline" />
              {this.filtersActive && <span class="psf__dot" aria-hidden="true" />}
            </button>
          )}
        </div>
        {this.open && [
          <div class="psf__backdrop" onClick={() => (this.open = false)} />,
          <div class="psf__menu" role="dialog" aria-label="Filters">
            {this.groups.map((g) => this.renderGroup(g))}
            {this.showClear && this.filtersActive && (
              <button type="button" class="psf__clear" onClick={this.clearAll}>
                Clear all
              </button>
            )}
          </div>,
        ]}
      </div>
    );
  }
}
