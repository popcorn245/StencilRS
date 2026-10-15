import { Component, Prop, Event, EventEmitter, Host, h } from '@stencil/core';

/**
 * pop-async-view — declarative loading / empty / error / content states for any
 * data-backed region (molecule).
 *
 * Pairs with `pop-sync-status`: sync-status shows FRESHNESS (last synced /
 * revalidating / stale), this shows LIFECYCLE (is there anything to render at
 * all). Composes the existing state primitives (`pop-loading-state`,
 * `pop-empty-state`, `pop-error-state`) for its defaults; each state slot can
 * be overridden.
 *
 *   <pop-async-view state={view} onPopRetry={() => data.refresh()}>
 *     …content…
 *     <div slot="loading">custom skeleton</div>   <!-- optional -->
 *   </pop-async-view>
 *
 * Consumer rule (the hub cache philosophy): content stays MOUNTED during
 * revalidation — `state="loading"` is for the COLD hydrate only. All four
 * regions stay in the DOM (visibility toggled by CSS) so slotted content is
 * never torn down by a state flip.
 *
 * AsyncData mapping: status 'loading' with no data → "loading"; error with no
 * data → "error" (retry → refresh()); data present → "content"; empty result →
 * "empty" (the consumer decides emptiness).
 */
@Component({
  tag: 'pop-async-view',
  encapsulation: { type: 'scoped' },
  styleUrl: 'async-view.css',
})
export class PopAsyncView {
  /** Which region shows. */
  @Prop() state: 'loading' | 'empty' | 'error' | 'content' = 'loading';
  /** Default empty-state message (default empty slot). */
  @Prop() emptyLabel = 'Nothing here yet';
  /** Default error-state message (default error slot). */
  @Prop() errorLabel = 'Something went wrong';
  /** Default retry button label (default error slot). */
  @Prop() retryLabel = 'Retry';

  /** The default error state's retry button was tapped. */
  @Event() popRetry!: EventEmitter<void>;

  /** Re-emit the inner pop-error-state's popRetry as our own (single source). */
  private onInnerRetry = (e: Event) => {
    e.stopPropagation();
    this.popRetry.emit();
  };

  render() {
    const s = this.state;
    const region = (name: string) => ({
      av__region: true,
      [`av__region--${name}`]: true,
      'av__region--active': s === name,
    });
    return (
      <Host class={{ [`pop-async-view--${s}`]: true }}>
        <div class={region('loading')} role="status" aria-hidden={s !== 'loading' ? 'true' : 'false'}>
          <slot name="loading">
            <pop-loading-state variant="spinner" label="Loading…" />
          </slot>
        </div>
        <div class={region('empty')} aria-hidden={s !== 'empty' ? 'true' : 'false'}>
          <slot name="empty">
            <pop-empty-state message={this.emptyLabel} size="inline" />
          </slot>
        </div>
        <div class={region('error')} aria-hidden={s !== 'error' ? 'true' : 'false'}>
          <slot name="error">
            <pop-error-state
              heading={this.errorLabel}
              retryable
              retryLabel={this.retryLabel}
              size="inline"
              onPopRetry={this.onInnerRetry}
            />
          </slot>
        </div>
        <div class={region('content')} aria-hidden={s !== 'content' ? 'true' : 'false'}>
          <slot></slot>
        </div>
      </Host>
    );
  }
}
