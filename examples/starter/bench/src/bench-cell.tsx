import { Component, Host, Prop } from '@stencil/core';

/** Many small components: creation cost and a prop change across all of them. */
@Component({ tag: 'bench-cell', encapsulation: { type: 'shadow' } })
export class BenchCell {
  @Prop() value = 0;
  @Prop() label = '';

  render() {
    return (
      <Host class={{ odd: this.value % 2 === 1 }}>
        <span class="label">{this.label}</span>
        <b>{this.value}</b>
      </Host>
    );
  }
}
