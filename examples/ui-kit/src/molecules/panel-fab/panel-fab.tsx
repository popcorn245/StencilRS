import { Component, Element, h, Prop, State, Event, EventEmitter } from '@stencil/core';

/**
 * `pop-panel-fab` — the bottom-right floating action button for a data panel,
 * with an expanding tray for that panel's LIST CONTROLS.
 *
 * Two jobs in one control, because they compete for the same corner:
 *
 *  • **Primary action** — the panel's one create verb ("Add recipe", "New tag").
 *    Set `action` to render it as the FAB's own tap target.
 *  • **List controls** — view switcher / search / filter-sort, slotted into
 *    `controls`. They live in a tray that expands above the button.
 *
 * With both, the FAB shows the primary action and a small chevron that opens
 * the tray. With only one, the FAB *is* that one thing and there is no chevron
 * — a disclosure control that reveals nothing is worse than no control.
 *
 * ## Placement is the consumer's job, on purpose
 *
 * The host is `position: absolute` against the nearest positioned ancestor, NOT
 * `fixed`. The bucket-hub panels this is built for render inside three
 * different presentation tiers (bottom sheet, dialog, dock) and two of them
 * keep persistent CSS transforms, which re-base fixed positioning onto the
 * transformed box rather than the viewport. Absolute + a positioned ancestor
 * behaves identically in all three.
 *
 * Safe-area inset is handled here (`env(safe-area-inset-bottom)`) so a sheet
 * pinned to the bottom of a phone screen doesn't put the FAB under the home
 * indicator.
 *
 * @example
 * <pop-panel-fab action="Add recipe" icon="add">
 *   <pop-list-filter-sort slot="controls" />
 * </pop-panel-fab>
 */
@Component({
  tag: 'pop-panel-fab',
  encapsulation: { type: 'scoped' },
  styleUrl: 'panel-fab.css',
})
export class PopPanelFab {
  /** Primary action label. Empty → the FAB is a controls-tray toggle only. */
  @Prop() action = '';
  /** Ionicon name for the primary action. */
  @Prop() icon = 'add';
  /** Hide the label and render the primary action as an icon-only circle. */
  @Prop() compact = false;
  /** Set when the panel has no list controls — suppresses the tray + chevron. */
  @Prop() noControls = false;
  /** Disable the primary action (a busy panel, an incomplete precondition). */
  @Prop() disabled = false;
  /** Accessible name for the tray toggle. */
  @Prop() controlsLabel = 'List controls';

  /** The primary action was tapped. */
  @Event({ composed: true, bubbles: true }) popAction!: EventEmitter<void>;

  @Element() el!: HTMLElement;

  @State() open = false;

  connectedCallback() {
    document.addEventListener('click', this.onDocClick);
    document.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onDocClick);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private onDocClick = (e: MouseEvent) => {
    if (this.open && !this.el.contains(e.target as Node)) this.open = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) this.open = false;
  };

  render() {
    const hasAction = !!this.action;
    const hasControls = !this.noControls;
    // The chevron only earns its place when there is BOTH an action and a tray;
    // otherwise the single thing present becomes the button itself.
    const showChevron = hasAction && hasControls;
    const trayIsPrimary = !hasAction && hasControls;

    return (
      <div class={{ pfab: true, 'pfab--open': this.open }}>
        {hasControls && (
          <div
            class="pfab__tray"
            role="group"
            aria-label={this.controlsLabel}
            // Kept in the tree but inert while shut, so slotted controls never
            // become invisible tab stops.
            {...(this.open ? {} : { inert: true })}
          >
            <slot name="controls" />
          </div>
        )}

        <div class="pfab__row">
          {hasAction && (
            <button
              type="button"
              class={{ pfab__btn: true, 'pfab__btn--compact': this.compact }}
              disabled={this.disabled}
              aria-label={this.action}
              title={this.action}
              onClick={() => this.popAction.emit()}
            >
              <ion-icon class="pfab__icon" name={this.icon} aria-hidden="true" />
              {!this.compact && <span class="pfab__label">{this.action}</span>}
            </button>
          )}

          {(showChevron || trayIsPrimary) && (
            <button
              type="button"
              class={{
                pfab__toggle: true,
                'pfab__toggle--solo': trayIsPrimary,
              }}
              aria-label={this.controlsLabel}
              title={this.controlsLabel}
              aria-expanded={this.open ? 'true' : 'false'}
              onClick={() => (this.open = !this.open)}
            >
              <ion-icon
                class="pfab__icon"
                name={trayIsPrimary ? 'options-outline' : 'chevron-up'}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>
    );
  }
}
