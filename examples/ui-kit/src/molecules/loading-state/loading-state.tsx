import { Component, Prop, h } from '@stencil/core';

/**
 * pop-loading-state — the shared loading primitive for the notes-app.
 *
 * Two variants:
 *  - `variant="spinner"` (default): a centered spinner + optional label, for
 *    one-shot async surfaces (editor load, ask streaming, graph build).
 *  - `variant="card-skeleton"`: a stack of **card-shaped** skeletons that mirror
 *    the note-card layout (title bar + snippet lines + meta row) so the loading
 *    state has the same silhouette as the content that replaces it — not a
 *    generic grey rectangle. `count` sets how many; `grid` tiles them.
 *
 * Always announces itself: `role="status"` + `aria-busy` so assistive tech
 * knows the region is loading.
 */
@Component({
  tag: 'pop-loading-state',
  encapsulation: { type: 'scoped' },
  styleUrl: 'loading-state.css',
})
export class LoadingState {
  /** `spinner` (default) or `card-skeleton`. */
  @Prop() variant: 'spinner' | 'card-skeleton' = 'spinner';

  /** Number of skeleton cards (card-skeleton variant). */
  @Prop() count = 5;

  /** Tile the skeletons in a gallery grid instead of a single column. */
  @Prop() grid = false;

  /** Visible / announced label. */
  @Prop() label = 'Loading…';

  /** Show the label text next to the spinner (spinner variant). */
  @Prop() showLabel = false;

  private renderSkeletonCard = () => (
    <div class="ls-card" aria-hidden="true">
      <div class="ls-card__head">
        <span class="ls-bar ls-bar--title" />
        <span class="ls-bar ls-bar--pin" />
      </div>
      <span class="ls-bar ls-bar--snippet" />
      <span class="ls-bar ls-bar--snippet ls-bar--snippet-short" />
      <div class="ls-card__meta">
        <span class="ls-bar ls-bar--tag" />
        <span class="ls-bar ls-bar--tag" />
        <span class="ls-bar ls-bar--time" />
      </div>
    </div>
  );

  render() {
    if (this.variant === 'card-skeleton') {
      return (
        <div
          class={{ 'ls': true, 'ls--skeleton': true, 'ls--grid': this.grid }}
          role="status"
          aria-busy="true"
          aria-label={this.label}
        >
          {Array.from({ length: Math.max(1, this.count) }).map(this.renderSkeletonCard)}
        </div>
      );
    }

    return (
      <div class="ls ls--spinner" role="status" aria-busy="true" aria-label={this.label}>
        <span class="ls-spinner" aria-hidden="true" />
        {this.showLabel && <span class="ls-label">{this.label}</span>}
      </div>
    );
  }
}
