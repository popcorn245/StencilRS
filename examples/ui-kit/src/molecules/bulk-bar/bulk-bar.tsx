import { Component, Prop, Event, EventEmitter, Host, h } from '@stencil/core';

/**
 * pop-bulk-bar — the MULTI-SELECT action bar (molecule) that appears while a
 * list/grid is in selection mode: "N selected", the host's action buttons
 * (slotted — validity is the host's call), and a Done exit.
 *
 * Reusable shape (panel-storybook pattern): the bar owns only the chrome —
 * count pill, slot, Done. Which actions render (and what they do) stays in the
 * host panel; buttons dropped in the slot inherit the bar's pill styling via
 * `.bulk__act` (or bring their own classes).
 *
 * Sticky-bottom by default (`position: sticky; bottom: 0`) so it stays
 * thumb-reachable over long lists; hosts can override positioning freely.
 */
@Component({
  tag: 'pop-bulk-bar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'bulk-bar.css',
})
export class PopBulkBar {
  /** How many items are selected (the count pill). */
  @Prop() count = 0;
  /** Noun after the count (e.g. "selected", "cards"). */
  @Prop() label = 'selected';
  /** Busy: a bulk request is running — every control disables. */
  @Prop() busy = false;
  /** Done/exit button label. */
  @Prop() doneLabel = 'Done';

  /** Exit selection mode (Done tapped). */
  @Event() popBulkDone!: EventEmitter<void>;

  render() {
    return (
      <Host role="toolbar" aria-label="Bulk actions">
        <div class={{ bulk: true, 'bulk--busy': this.busy }}>
          <span class="bulk__count" aria-live="polite">
            <strong>{this.count}</strong> {this.label}
          </span>
          <div class="bulk__actions">
            <slot></slot>
          </div>
          <button type="button" class="bulk__done" disabled={this.busy} onClick={() => this.popBulkDone.emit()}>
            {this.doneLabel}
          </button>
        </div>
      </Host>
    );
  }
}
