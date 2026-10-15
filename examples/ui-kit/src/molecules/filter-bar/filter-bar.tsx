import { Component, h, Element, Prop, State, Event, EventEmitter, Watch } from '@stencil/core';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDef {
  id: string;
  label: string;
  value: string;
  defaultValue?: string;
  options: FilterOption[];
}

/**
 * A compact filter bar with a popover and dismissible chips for active filters.
 * Pass filter definitions as JSON via the `filters` prop.
 * Optionally provide an icon URL via `iconSrc` (defaults to a built-in funnel SVG path).
 *
 * @example
 * <pop-filter-bar filters='[{"id":"mode","label":"Browse","value":"all","options":[...]}]'></pop-filter-bar>
 */
@Component({
  tag: 'pop-filter-bar',
  styleUrl: 'filter-bar.css',
})
export class PopFilterBar {
  @Element() el: HTMLElement;

  /** JSON array of FilterDef objects */
  @Prop() filters: string = '[]';

  /** URL to the filter icon SVG. Defaults to the app's funnel-outline icon. */
  @Prop() iconSrc: string = '/images/icon/funnel-outline.svg';

  /** Raw SVG string for the filter icon. If provided, overrides iconSrc. */
  @Prop() iconSvg: string = '';

  /** Emitted when a filter value changes. Detail: `{ id: string, value: string }` */
  @Event() popFilterChange: EventEmitter<{ id: string; value: string }>;

  @State() isOpen: boolean = false;
  @State() _filters: FilterDef[] = [];

  @Watch('filters')
  filtersChanged(newVal: string) {
    try {
      this._filters = JSON.parse(newVal);
    } catch {
      this._filters = [];
    }
  }

  componentWillLoad() {
    this.filtersChanged(this.filters);
  }

  componentDidLoad() {
    document.addEventListener('click', this.onDocClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onDocClick);
  }

  private onDocClick = (e: MouseEvent) => {
    if (this.isOpen && !this.el.contains(e.target as Node)) {
      this.isOpen = false;
    }
  };

  private toggle = (e: Event) => {
    e.stopPropagation();
    this.isOpen = !this.isOpen;
  };

  private change(id: string, value: string) {
    this._filters = this._filters.map(f => f.id === id ? { ...f, value } : f);
    this.popFilterChange.emit({ id, value });
  }

  private dismiss(id: string) {
    const filter = this._filters.find(f => f.id === id);
    if (!filter) return;
    this.change(id, filter.defaultValue ?? '');
  }

  private get activeChips(): FilterDef[] {
    return this._filters.filter(f => {
      const def = f.defaultValue ?? '';
      return f.value !== '' && f.value !== def;
    });
  }

  private get activeCount(): number {
    return this.activeChips.length;
  }

  render() {
    const chips = this.activeChips;

    return (
      <div class="pfb-root">
        {/* Trigger + popover wrapper (needs position:relative for popover) */}
        <div class="pfb-trigger-wrap">
          <button
            class={`pfb-trigger${this.activeCount > 0 ? ' has-active' : ''}${this.isOpen ? ' is-open' : ''}`}
            type="button"
            aria-expanded={this.isOpen ? 'true' : 'false'}
            aria-haspopup="dialog"
            onClick={this.toggle}
          >
            {this.iconSvg ? (
              <div class="pfb-icon-svg" innerHTML={this.iconSvg}></div>
            ) : this.iconSrc ? (
              <img class="pfb-icon" src={this.iconSrc} width="14" height="14" aria-hidden="true" alt="" />
            ) : (
              <svg class="pfb-icon" width="14" height="14" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" aria-hidden="true">
                <path d="M32 144h448M112 256h288M208 368h96" />
              </svg>
            )}
            Filters
            {this.activeCount > 0 && <span class="pfb-badge">{this.activeCount}</span>}
          </button>

          {/* Popover */}
          {this.isOpen && (
            <div class="pfb-popover" role="dialog" aria-label="Filter options">
              {this._filters.map(filter => (
                <div key={filter.id} class="pfb-group">
                  <label class="pfb-group-label">{filter.label}</label>
                  <div class="pfb-options">
                    {filter.options.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        class={`pfb-option${opt.value === filter.value ? ' selected' : ''}`}
                        onClick={() => this.change(filter.id, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button class="pfb-done" type="button" onClick={() => { this.isOpen = false; }}>
                Done
              </button>
            </div>
          )}
        </div>

        {/* Active filter chips — separate from trigger for flex layout */}
        {chips.length > 0 && (
          <div class="pfb-chips">
            {chips.map(chip => (
              <span key={chip.id} class="pfb-chip">
                <span class="pfb-chip-label">
                  {chip.options.find(o => o.value === chip.value)?.label ?? chip.value}
                </span>
                <button
                  class="pfb-chip-dismiss"
                  type="button"
                  aria-label={`Remove ${chip.label} filter`}
                  onClick={() => this.dismiss(chip.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
}
