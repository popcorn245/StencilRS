import { Component, Prop, Event, EventEmitter, Host, h } from '@stencil/core';

/**
 * pop-actions-footer — the Cancel/Send pair (molecule), extracted from its two
 * duplicated homes (bottom-sheet `slot="actions"` markup and the
 * pop-form-dialog footer).
 *
 * Tier-aware spacing/order:
 *   sheet  — full-width, stacked-friendly buttons (thumb-reachable)
 *   dialog — right-aligned pair
 *   dock   — compact inline pair
 *
 * IMPORTANT: both buttons are `type="button"` (the Pico `[type=button]` /
 * pop-form-dialog implicit-submit gotcha) — submission is driven ONLY by the
 * `popSubmit` event, never by a form submit.
 */
@Component({
  tag: 'pop-actions-footer',
  encapsulation: { type: 'scoped' },
  styleUrl: 'actions-footer.css',
})
export class PopActionsFooter {
  @Prop() submitLabel = 'Send';
  @Prop() cancelLabel = 'Cancel';
  @Prop() submitDisabled = false;
  /** Busy: spinner-in-button, both buttons disabled. */
  @Prop() busy = false;
  /** Presentation tier the footer sits in (spacing/order). */
  @Prop() tier: 'sheet' | 'dialog' | 'dock' = 'dialog';

  @Event() popSubmit!: EventEmitter<void>;
  @Event() popCancel!: EventEmitter<void>;

  render() {
    return (
      <Host class={{ [`pop-actions-footer--${this.tier}`]: true }}>
        <div class={{ af: true, [`af--${this.tier}`]: true }}>
          <button
            type="button"
            class="af__cancel"
            disabled={this.busy}
            onClick={() => this.popCancel.emit()}
          >
            {this.cancelLabel}
          </button>
          <button
            type="button"
            class="af__submit"
            disabled={this.submitDisabled || this.busy}
            aria-busy={this.busy ? 'true' : null}
            onClick={() => this.popSubmit.emit()}
          >
            {this.busy && <span class="af__spin" aria-hidden="true"></span>}
            {this.submitLabel}
          </button>
        </div>
      </Host>
    );
  }
}
