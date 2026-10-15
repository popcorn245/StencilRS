import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'pop-progress-bar',
  encapsulation: { type: 'scoped' },
  styleUrl: 'progress-bar.css',
})
export class ProgressBar {
  @Prop() value = 0;
  @Prop() max = 100;
  @Prop() color: string;
  @Prop() size: 'sm' | 'md' = 'md';
  @Prop() label: string;

  private get percentage(): number {
    return Math.min(100, Math.max(0, (this.value / this.max) * 100));
  }

  render() {
    return (
      <div
        class={{ 'pb-track': true, [`pb-track--${this.size}`]: true }}
        role="progressbar"
        aria-valuenow={this.value}
        aria-valuemin={0}
        aria-valuemax={this.max}
        aria-label={this.label}
      >
        <div
          class="pb-fill"
          style={{ width: `${this.percentage}%`, '--pb-color': this.color }}
        ></div>
      </div>
    );
  }
}
