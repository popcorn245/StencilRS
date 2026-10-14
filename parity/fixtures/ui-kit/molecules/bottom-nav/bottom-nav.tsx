import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';

export interface BottomNavItem {
  /** Stable id emitted on `tabselect` (the parent routes). */
  id: string;
  label: string;
  /** Ionicon name (rendered via pop-icon, always centered). */
  icon: string;
  /** Optional href hint for the parent router (not navigated by the bar). */
  href?: string;
  /** Optional count bubble (e.g. the review count on Collection). Omit to hide. */
  badge?: number;
}

/**
 * `pop-bottom-nav` — a DETACHED, rounded bottom navigation bar with a large
 * center action button in `--grad-brand` (docs planned/yugioh-app/
 * ui-and-pop-bottom-nav). Two tab destinations flank each side of the center
 * button (the 2+2 layout); the bar floats above the bottom safe-area
 * (`env(safe-area-inset-bottom)` lift, borrowed from pop-nav-bar's bottom
 * variant) with `--radius-lg` + `--shadow-pop`.
 *
 * The component is PRESENTATION ONLY — it decides nothing:
 *  - `tabselect {id}` fires on a tab press; the parent routes.
 *  - `centerpress {action}` fires on the center button; the parent opens the
 *    scanner or the add sheet. `centerAction` is parent-driven (an allowlisted
 *    non-scan user gets `"add"`; a scan-capable user gets `"scan"`) — the
 *    center button ALWAYS renders.
 *  - The `center` slot fully overrides the center button's content when the
 *    default icon+label pair isn't enough.
 *
 * `compact` mirrors pop-tab-bar's CONTAINER-query pattern: under 400px of bar
 * width, tab labels visually collapse (kept in the DOM for a11y).
 *
 * NOTE: "fab" in this repo means the Fabulous theme — this component is
 * deliberately NOT named pop-fab, and there are no `--fab-*` tokens.
 */
@Component({
  tag: 'pop-bottom-nav',
  encapsulation: { type: 'scoped' },
  styleUrl: 'bottom-nav.css',
})
export class BottomNav {
  /** JSON array of the tab destinations ({id,label,icon,href?,badge?}).
   *  The first half renders left of the center button, the rest right (2+2
   *  with four tabs). */
  @Prop() items = '[]';

  /** Which tab is current (drives the active style). */
  @Prop() activeId?: string;

  /** What the center button does — the PARENT decides ('scan' or 'add'). */
  @Prop() centerAction: 'scan' | 'add' = 'scan';

  /** Ionicon for the center button; defaults per `centerAction`
   *  (scan → camera, add → add). */
  @Prop() centerIcon?: string;

  /** Tiny label under the center button; defaults per `centerAction`.
   *  Pass '' to hide. */
  @Prop() centerLabel?: string;

  /** Disable the whole bar (e.g. offline). */
  @Prop() disabled = false;

  /** Collapse tab labels when the BAR (container, not viewport) is under
   *  400px — the pop-tab-bar compact pattern. */
  @Prop() compact = false;

  /** Detached-fixed (default) floats above the viewport bottom + safe area;
   *  `static` renders in place (Storybook frames / in-page use). */
  @Prop() position: 'fixed' | 'static' = 'fixed';

  /** Center button pressed — parent opens the scanner / add sheet. */
  @Event() centerpress!: EventEmitter<{ action: 'scan' | 'add' }>;

  /** Tab pressed — parent routes. */
  @Event() tabselect!: EventEmitter<{ id: string }>;

  private get parsedItems(): BottomNavItem[] {
    try {
      const raw = JSON.parse(this.items);
      return Array.isArray(raw) ? raw.filter((i) => i && i.id) : [];
    } catch {
      return [];
    }
  }

  private handleTab(id: string) {
    if (this.disabled) return;
    this.tabselect.emit({ id });
  }

  private handleCenter = () => {
    if (this.disabled) return;
    this.centerpress.emit({ action: this.centerAction });
  };

  private renderTab(item: BottomNavItem) {
    const active = item.id === this.activeId;
    return (
      <button
        type="button"
        class={{ 'bn-tab': true, 'bn-tab--active': active }}
        disabled={this.disabled}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        onClick={() => this.handleTab(item.id)}
      >
        <span class="bn-tab-ic">
          <pop-icon name={item.icon} />
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span class="bn-tab-badge">{item.badge > 99 ? '99+' : item.badge}</span>
          )}
        </span>
        <span class="bn-tab-label">{item.label}</span>
      </button>
    );
  }

  render() {
    const items = this.parsedItems;
    const half = Math.ceil(items.length / 2);
    const left = items.slice(0, half);
    const right = items.slice(half);
    const centerIcon = this.centerIcon || (this.centerAction === 'add' ? 'add' : 'camera');
    const centerLabel = this.centerLabel ?? (this.centerAction === 'add' ? 'Add' : 'Scan');
    return (
      <div
        class={{
          'bn-wrap': true,
          'bn-wrap--fixed': this.position === 'fixed',
          'bn-wrap--compact': this.compact,
          'bn-wrap--disabled': this.disabled,
        }}
      >
        <nav class="bn-bar" aria-label="Primary">
          <div class="bn-side bn-side--left">{left.map((i) => this.renderTab(i))}</div>
          <div class="bn-notch" aria-hidden="true"></div>
          <div class="bn-side bn-side--right">{right.map((i) => this.renderTab(i))}</div>
          <div class="bn-centerwrap">
            <button
              type="button"
              class="bn-center"
              disabled={this.disabled}
              aria-label={centerLabel || this.centerAction}
              onClick={this.handleCenter}
            >
              <slot name="center">
                <pop-icon class="bn-center-ic" name={centerIcon} />
              </slot>
            </button>
            {centerLabel && <span class="bn-center-label">{centerLabel}</span>}
          </div>
        </nav>
      </div>
    );
  }
}
