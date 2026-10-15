import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'pop-status-badge',
  encapsulation: { type: 'scoped' },
  styleUrl: 'status-badge.css',
})
export class StatusBadge {
  @Prop() variant: 'chip' | 'dot' | 'pill' = 'chip';
  @Prop() color: string;
  @Prop() size: 'sm' | 'md' = 'md';

  render() {
    return (
      <span
        class={{
          'sb': true,
          [`sb--${this.variant}`]: true,
          [`sb--${this.size}`]: true,
        }}
        style={{ '--sb-color': this.color }}
      >
        {this.variant !== 'dot' && <slot></slot>}
      </span>
    );
  }
}
