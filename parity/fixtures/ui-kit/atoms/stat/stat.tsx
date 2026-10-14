import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'pop-stat',
  encapsulation: { type: 'scoped' },
  styleUrl: 'stat.css',
})
export class Stat {
  @Prop() value: string;
  @Prop() label: string;
  @Prop() color: string;
  @Prop() size: 'sm' | 'md' | 'lg' = 'md';

  render() {
    return (
      <div class="stat">
        <span
          class={{ 'stat-value': true, [`stat-value--${this.size}`]: true }}
          style={{ '--stat-color': this.color }}
        >
          {this.value}
        </span>
        {this.label && <span class="stat-label">{this.label}</span>}
      </div>
    );
  }
}
