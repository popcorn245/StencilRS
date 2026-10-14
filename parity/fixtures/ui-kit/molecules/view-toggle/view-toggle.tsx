import { Component, h, Prop, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'pop-view-toggle',
  styleUrl: 'view-toggle.css',
})
export class PopViewToggle {
  /** Current active view: 'card' or 'list' */
  @Prop({ mutable: true, reflect: true }) value: 'card' | 'list' = 'card';

  /** Emitted when the view changes. `event.detail` is the new value ('card' | 'list'). */
  @Event() popViewChange: EventEmitter<'card' | 'list'>;

  private select(next: 'card' | 'list') {
    if (this.value === next) return;
    this.value = next;
    this.popViewChange.emit(next);
  }

  render() {
    return (
      <div class="pvt-root" role="group" aria-label="View toggle">
        <button
          class={`pvt-btn ${this.value === 'card' ? 'pvt-btn--active' : ''}`}
          aria-pressed={this.value === 'card' ? 'true' : 'false'}
          aria-label="Card view"
          title="Card view"
          type="button"
          onClick={() => this.select('card')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="1.5"/>
            <rect x="13" y="3" width="8" height="8" rx="1.5"/>
            <rect x="3" y="13" width="8" height="8" rx="1.5"/>
            <rect x="13" y="13" width="8" height="8" rx="1.5"/>
          </svg>
        </button>
        <button
          class={`pvt-btn ${this.value === 'list' ? 'pvt-btn--active' : ''}`}
          aria-pressed={this.value === 'list' ? 'true' : 'false'}
          aria-label="List view"
          title="List view"
          type="button"
          onClick={() => this.select('list')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="3" y="5" width="18" height="2.5" rx="1.25"/>
            <rect x="3" y="11" width="18" height="2.5" rx="1.25"/>
            <rect x="3" y="17" width="18" height="2.5" rx="1.25"/>
          </svg>
        </button>
      </div>
    );
  }
}
