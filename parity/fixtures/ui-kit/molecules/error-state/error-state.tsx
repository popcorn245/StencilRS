import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';

/**
 * pop-error-state — the shared error primitive for the notes-app.
 *
 * A centered warning illustration (themeable `pop-brand-icon`) + heading +
 * message, with an optional **Retry** button that emits `popRetry`. Pages that
 * hand-rolled ad-hoc error markup route through this so every failure looks the
 * same. Announced with `role="alert"`.
 */
@Component({
  tag: 'pop-error-state',
  encapsulation: { type: 'scoped' },
  styleUrl: 'error-state.css',
})
export class ErrorState {
  /** `pop-brand-icon` name for the illustration. */
  @Prop() iconName = 'warning';
  @Prop() heading = 'Something went wrong';
  @Prop() message = '';
  /** `inline` (compact) or `full` (centered, min-height). */
  @Prop() size: 'inline' | 'full' = 'inline';
  /** Show a Retry button (emits `popRetry`). */
  @Prop() retryable = false;
  /** Retry button label. */
  @Prop() retryLabel = 'Try again';

  @Event({ composed: true, bubbles: true }) popRetry!: EventEmitter<void>;

  render() {
    return (
      <div class={{ 'err': true, [`err--${this.size}`]: true }} role="alert">
        <div class="err-icon" aria-hidden="true">
          <pop-brand-icon name={this.iconName} />
        </div>
        {this.heading && <h3 class="err-heading">{this.heading}</h3>}
        {this.message && <p class="err-message">{this.message}</p>}
        {this.retryable && (
          <button type="button" class="err-retry" onClick={() => this.popRetry.emit()}>
            {this.retryLabel}
          </button>
        )}
      </div>
    );
  }
}
