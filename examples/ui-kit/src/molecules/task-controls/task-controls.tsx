import { Component, h, Prop, State, Event, EventEmitter, Element } from '@stencil/core';

interface Option {
  id: string;
  label: string;
}

/** The three logical dropdowns this control owns. */
type ControlKey = 'group' | 'sort' | 'status';

/**
 * `pop-task-controls` — a fully CONTROLLED group-by / sort / status control set.
 *
 * Lifted (and generalised) from tasks-app's `renderFilterControls` so both the
 * tasks-app and the hub's tasks tile can share ONE toolbar: a row of pill
 * dropdowns (Group · Sort · Status), each a button + popover listbox with a ✓
 * on the current selection.
 *
 * The component holds NO filter values of its own — the host passes the current
 * `groupBy` / `sortBy` / `statusFilter` and the option lists, and the component
 * emits a `*Change` event when the user picks something. The only internal
 * state is view-local: which popover is open.
 *
 * @example
 * <pop-task-controls
 *   group-by="date"
 *   sort-by="dueDate"
 *   status-filter=""
 *   group-options='[{"id":"none","label":"No grouping"},{"id":"date","label":"Date"}]'
 *   sort-options='[{"id":"dueDate","label":"Due date"},{"id":"priority","label":"Priority"}]'
 *   status-options='[{"id":"","label":"All"},{"id":"open","label":"Open"}]'
 *   variant="bar"
 *   show-clear>
 * </pop-task-controls>
 */
@Component({
  tag: 'pop-task-controls',
  encapsulation: { type: 'scoped' },
  styleUrl: 'task-controls.css',
})
export class PopTaskControls {
  @Element() el: HTMLElement;

  /** Current group-by value (controlled). */
  @Prop() groupBy: string = '';
  /** Current sort value (controlled). */
  @Prop() sortBy: string = '';
  /** Current status-filter value (controlled). `''` = all. */
  @Prop() statusFilter: string = '';

  /** JSON array `[{id,label}]` of the group modes to show. Empty → no Group dropdown. */
  @Prop() groupOptions: string = '[]';
  /** JSON array `[{id,label}]` of the sort modes to show. Empty → no Sort dropdown. */
  @Prop() sortOptions: string = '[]';
  /** JSON array `[{id,label}]` of the status filters to show. Empty → no Status dropdown. */
  @Prop() statusOptions: string = '[]';

  /** Layout hint for class hooks. */
  @Prop() variant: 'bar' | 'sheet' | 'sidenav' = 'bar';
  /** Tighter layout for narrow docks (e.g. the hub's 400px tile). */
  @Prop() compact: boolean = false;
  /** Render a "Clear" affordance. */
  @Prop() showClear: boolean = false;
  /** Clear-affordance presentation: `text` = the "Clear"/"Clear all" link
   *  (default, tasks/calendar unchanged); `icon` = a quiet icon-only button
   *  (funnel-with-slash) for hosts where a text link sticks out too much. */
  @Prop() clearVariant: 'text' | 'icon' = 'text';
  /**
   * Presentation:
   *  - `inline` (default) — the three dropdown pills sit in a row (bar/compact).
   *  - `menu` — a single filter icon-button that opens ONE popover holding the
   *    Group / Sort / Status selectors. Collapses the toolbar to a single
   *    trigger (for tight headers next to a search input). An active-state dot
   *    shows on the trigger when a non-default filter is set.
   */
  @Prop() layout: 'inline' | 'menu' = 'inline';
  /** Default group id — used only to decide the `menu` trigger's active dot
   *  (dot shows when `groupBy` differs from this). Empty → not considered. */
  @Prop() defaultGroup: string = '';
  /** Default sort id — used only for the `menu` trigger's active dot. */
  @Prop() defaultSort: string = '';

  /** Heading for the group dropdown (pill label + menu-row label). Hosts reusing
   *  the control outside tasks can rename it (e.g. "Tool" for the hub's history). */
  @Prop() groupLabel: string = 'Group';
  /** Heading for the sort dropdown. */
  @Prop() sortLabel: string = 'Sort';
  /** Heading for the status dropdown. */
  @Prop() statusLabel: string = 'Status';

  /** The group mode changed. */
  @Event({ composed: true, bubbles: true }) groupChange: EventEmitter<{ value: string }>;
  /** The sort mode changed. */
  @Event({ composed: true, bubbles: true }) sortChange: EventEmitter<{ value: string }>;
  /** The status filter changed. */
  @Event({ composed: true, bubbles: true }) taskStatusChange: EventEmitter<{ value: string }>;
  /** The clear affordance was pressed. */
  @Event({ composed: true, bubbles: true }) clearAll: EventEmitter<void>;

  /** Which dropdown listbox is open (view-local). */
  @State() openKey: ControlKey | null = null;
  /** Whether the collapsed `menu` popover is open (layout='menu' only). */
  @State() menuOpen: boolean = false;

  connectedCallback() {
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  /** Close any open popover on an outside click. */
  private onDocClick = (e: MouseEvent) => {
    if ((this.openKey || this.menuOpen) && !this.el.contains(e.target as Node)) {
      this.openKey = null;
      this.menuOpen = false;
    }
  };

  /** Escape closes the innermost popover first (a sub-dropdown), then the menu. */
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (this.openKey) this.openKey = null;
    else if (this.menuOpen) this.menuOpen = false;
  };

  /** True when a non-default filter is set — drives the `menu` trigger dot. */
  private get filterActive(): boolean {
    return (
      !!this.statusFilter ||
      (!!this.defaultGroup && this.groupBy !== this.defaultGroup) ||
      (!!this.defaultSort && this.sortBy !== this.defaultSort)
    );
  }

  private parse(json: string): Option[] {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((o) => o && typeof o === 'object')
        .map((o) => ({ id: String(o.id ?? ''), label: String(o.label ?? o.id ?? '') }));
    } catch {
      return [];
    }
  }

  private toggle(key: ControlKey) {
    this.openKey = this.openKey === key ? null : key;
  }

  private select(key: ControlKey, value: string) {
    this.openKey = null;
    if (key === 'group') this.groupChange.emit({ value });
    else if (key === 'sort') this.sortChange.emit({ value });
    else this.taskStatusChange.emit({ value });
  }

  /** The `clearVariant="icon"` glyph: the trigger's funnel with a slash through
   *  it — same stroke idiom as the trigger SVG so the pair reads as a set. */
  /** A small leading glyph per control so Group/Sort/Status read as one pill
   *  family (icon · muted key · ink value), matching the redesign mockup. */
  private renderKeyIcon(key: ControlKey) {
    const common = {
      width: '15',
      height: '15',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round' as const,
      'stroke-linejoin': 'round' as const,
      'aria-hidden': 'true',
    };
    if (key === 'group') {
      return (<svg {...common}><path d="M3 6h18M3 12h12M3 18h6" /></svg>);
    }
    if (key === 'sort') {
      return (<svg {...common}><path d="M7 4v16M7 4l3 3M7 4 4 7M17 20V4M17 20l3-3M17 20l-3-3" /></svg>);
    }
    // status → funnel
    return (<svg {...common}><path d="M4 5h16l-6 8v5l-4 2v-7z" /></svg>);
  }

  private renderClearIcon() {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="10" y1="18" x2="14" y2="18" />
        <line x1="5" y1="3" x2="19" y2="21" />
      </svg>
    );
  }

  /** A single pill dropdown: button + popover listbox. Mirrors the
   *  renderFilterControls `renderDropdown` pattern (label · current · caret,
   *  then a listbox with a ✓ on the selected option). */
  private renderDropdown(key: ControlKey, label: string, value: string, options: Option[]) {
    if (options.length === 0) return null;
    const open = this.openKey === key;
    const current = options.find((o) => o.id === value) ?? options[0];
    const active = !!value;
    return (
      <div class="ptc__dd">
        <button
          type="button"
          class={{ 'ptc__dd-btn': true, 'ptc__dd-btn--active': active, 'ptc__dd-btn--open': open }}
          aria-haspopup="listbox"
          aria-expanded={open ? 'true' : 'false'}
          aria-label={label}
          title={label}
          onClick={(e) => {
            e.stopPropagation();
            this.toggle(key);
          }}
        >
          <span class="ptc__dd-icon" aria-hidden="true">{this.renderKeyIcon(key)}</span>
          {!this.compact && <span class="ptc__dd-label">{label}</span>}
          <span class="ptc__dd-current">{current?.label}</span>
          <svg
            class="ptc__dd-caret"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div class="ptc__dd-menu" role="listbox" aria-label={label}>
            {options.map((o) => (
              <button
                type="button"
                role="option"
                aria-selected={o.id === value ? 'true' : 'false'}
                class={{ 'ptc__dd-opt': true, 'ptc__dd-opt--sel': o.id === value }}
                onClick={(e) => {
                  e.stopPropagation();
                  this.select(key, o.id);
                }}
              >
                <span class="ptc__dd-check" aria-hidden="true">
                  {o.id === value ? '✓' : ''}
                </span>
                <span class="ptc__dd-opt-label">{o.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /** A labelled row inside the `menu` popover wrapping one dropdown. */
  private renderMenuRow(key: ControlKey, label: string, value: string, options: Option[]) {
    if (options.length === 0) return null;
    return (
      <div class="ptc__menu-row">
        <span class="ptc__menu-label" id={`ptc-lbl-${key}`}>{label}</span>
        {this.renderDropdown(key, label, value, options)}
      </div>
    );
  }

  /** Collapsed `menu` layout: a single filter icon-button → one popover holding
   *  the Group / Sort / Status dropdowns. */
  private renderMenu(groupOpts: Option[], sortOpts: Option[], statusOpts: Option[]) {
    const anyOptions = groupOpts.length || sortOpts.length || statusOpts.length;
    if (!anyOptions) return <div class="ptc ptc--menu" />;
    return (
      <div class={{ ptc: true, 'ptc--menu': true, [`ptc--${this.variant}`]: true, 'ptc--compact': this.compact }}>
        <button
          type="button"
          class={{ 'ptc__filter-trigger': true, 'ptc__filter-trigger--open': this.menuOpen, 'ptc__filter-trigger--active': this.filterActive }}
          aria-haspopup="dialog"
          aria-expanded={this.menuOpen ? 'true' : 'false'}
          aria-label="Filter, group and sort"
          title="Filter, group and sort"
          onClick={(e) => {
            e.stopPropagation();
            this.menuOpen = !this.menuOpen;
            this.openKey = null;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {this.filterActive && <span class="ptc__filter-dot" aria-hidden="true" />}
        </button>
        {this.menuOpen && (
          <div class="ptc__menu" role="dialog" aria-label="Filter, group and sort">
            {this.renderMenuRow('group', this.groupLabel, this.groupBy, groupOpts)}
            {this.renderMenuRow('sort', this.sortLabel, this.sortBy, sortOpts)}
            {this.renderMenuRow('status', this.statusLabel, this.statusFilter, statusOpts)}
            {this.showClear && (
              <button
                type="button"
                class={{ 'ptc__menu-clear': true, 'ptc__menu-clear--icon': this.clearVariant === 'icon' }}
                aria-label="Clear filters"
                title={this.clearVariant === 'icon' ? 'Clear filters' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  this.openKey = null;
                  this.clearAll.emit();
                }}
              >
                {this.clearVariant === 'icon' ? this.renderClearIcon() : 'Clear all'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  render() {
    const groupOpts = this.parse(this.groupOptions);
    const sortOpts = this.parse(this.sortOptions);
    const statusOpts = this.parse(this.statusOptions);

    if (this.layout === 'menu') return this.renderMenu(groupOpts, sortOpts, statusOpts);

    return (
      <div
        class={{
          ptc: true,
          [`ptc--${this.variant}`]: true,
          'ptc--compact': this.compact,
        }}
      >
        {this.renderDropdown('group', this.groupLabel, this.groupBy, groupOpts)}
        {this.renderDropdown('sort', this.sortLabel, this.sortBy, sortOpts)}
        {this.renderDropdown('status', this.statusLabel, this.statusFilter, statusOpts)}
        {this.showClear && (
          <button
            type="button"
            class={{ 'ptc__clear': true, 'ptc__clear--icon': this.clearVariant === 'icon' }}
            aria-label="Clear filters"
            title={this.clearVariant === 'icon' ? 'Clear filters' : undefined}
            onClick={(e) => {
              e.stopPropagation();
              this.openKey = null;
              this.clearAll.emit();
            }}
          >
            {this.clearVariant === 'icon' ? this.renderClearIcon() : 'Clear'}
          </button>
        )}
      </div>
    );
  }
}
