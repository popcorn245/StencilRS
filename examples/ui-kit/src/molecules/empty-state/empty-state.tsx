import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'pop-empty-state',
  encapsulation: { type: 'scoped' },
  styleUrl: 'empty-state.css',
})
export class EmptyState {
  /**
   * A `pop-brand-icon` name (preferred — a themeable SVG). When set it renders
   * the vector icon; falls back to the legacy `icon` glyph string otherwise.
   */
  @Prop() iconName?: string;
  /** Legacy: a literal glyph/emoji. Prefer `iconName`. */
  @Prop() icon?: string;
  @Prop() heading: string;
  @Prop() message: string;
  @Prop() size: 'inline' | 'full' = 'inline';

  render() {
    return (
      <div class={{ 'es': true, [`es--${this.size}`]: true }} role="status">
        {this.iconName ? (
          <div class="es-icon es-icon--vector" aria-hidden="true">
            <pop-brand-icon name={this.iconName} />
          </div>
        ) : (
          this.icon && <div class="es-icon" aria-hidden="true">{this.icon}</div>
        )}
        {this.heading && <h3 class="es-heading">{this.heading}</h3>}
        {this.message && <p class="es-message">{this.message}</p>}
        <div class="es-action">
          <slot name="action"></slot>
        </div>
      </div>
    );
  }
}
