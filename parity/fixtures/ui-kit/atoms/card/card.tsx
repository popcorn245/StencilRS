import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'pop-card',
  encapsulation: { type: 'scoped' },
  styleUrl: 'card.css',
})
export class Card {
  @Prop() variant: 'default' | 'interactive' | 'glass' = 'default';
  @Prop() href: string;
  @Prop() padding: 'sm' | 'md' | 'lg' = 'md';

  render() {
    const Tag = this.href ? 'a' : 'div';
    const attrs = this.href ? { href: this.href } : {};

    return (
      <Tag
        class={{
          'card': true,
          [`card--${this.variant}`]: true,
          [`card--${this.padding}`]: true,
        }}
        {...attrs}
      >
        <div class="card-header">
          <slot name="header"></slot>
        </div>
        <div class="card-body">
          <slot></slot>
        </div>
        <div class="card-footer">
          <slot name="footer"></slot>
        </div>
      </Tag>
    );
  }
}
