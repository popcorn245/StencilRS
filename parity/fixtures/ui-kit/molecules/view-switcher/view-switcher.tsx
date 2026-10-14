import { Component, h, Prop, State, Event, EventEmitter, Watch } from '@stencil/core';

/** The views pop-view-switcher knows how to render. */
export type SwitcherView = 'list' | 'card' | 'kanban' | 'table';

const VIEW_META: Record<SwitcherView, { icon: string; label: string }> = {
  list: { icon: 'list', label: 'List view' },
  card: { icon: 'grid', label: 'Card view' },
  kanban: { icon: 'albums-outline', label: 'Kanban view' },
  table: { icon: 'reorder-four-outline', label: 'Table view' },
};

/**
 * `pop-view-switcher` — the segmented list/card view toggle, generalized to any
 * subset of list · card · kanban · table.
 *
 * Each option is a square icon-only button with a centered `pop-icon` and
 * `aria-pressed`, inside a compact segmented container. Deliberately NOT
 * `role="group"` — pico.css styles [role=group] as a full-width stretched
 * button group.
 *
 * CONTROLLED: the host passes `value` and reacts to `viewChange`.
 * Expected adopters: the hub photos/tasks/inventory/images dialogs (usually
 * via the `pop-list-filter-sort` organism).
 *
 * @example
 * <pop-view-switcher views='["list","card"]' value="list"></pop-view-switcher>
 */
@Component({
  tag: 'pop-view-switcher',
  encapsulation: { type: 'scoped' },
  styleUrl: 'view-switcher.css',
})
export class PopViewSwitcher {
  /** JSON array of views to offer, from 'list' | 'card' | 'kanban' | 'table'. */
  @Prop() views: string = '["list","card"]';
  /** The current view. */
  @Prop() value: string = '';

  /** The user picked a view. Detail = the new view name. */
  @Event({ composed: true, bubbles: true }) viewChange: EventEmitter<string>;

  /** Parsed + validated view list. */
  @State() parsed: SwitcherView[] = [];

  @Watch('views')
  parseViews(json?: string) {
    try {
      const arr = JSON.parse(json ?? this.views);
      if (!Array.isArray(arr)) {
        this.parsed = [];
        return;
      }
      this.parsed = arr.filter((v): v is SwitcherView => typeof v === 'string' && v in VIEW_META);
    } catch {
      this.parsed = [];
    }
  }

  componentWillLoad() {
    this.parseViews();
  }

  private pick(view: SwitcherView) {
    if (view === this.value) return;
    this.viewChange.emit(view);
  }

  render() {
    if (this.parsed.length === 0) return null;
    return (
      <div class="pvs" aria-label="View mode">
        {this.parsed.map((v) => (
          <button
            type="button"
            key={v}
            class={{ pvs__btn: true, 'pvs__btn--on': this.value === v }}
            aria-pressed={this.value === v ? 'true' : 'false'}
            aria-label={VIEW_META[v].label}
            title={VIEW_META[v].label}
            onClick={() => this.pick(v)}
          >
            <pop-icon name={VIEW_META[v].icon} />
          </button>
        ))}
      </div>
    );
  }
}
