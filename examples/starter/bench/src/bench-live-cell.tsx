import { Component, Host, Prop } from '@stencil/core';
import { signal } from '@stencil/core/signals';

const tick = signal(0);
(window as any).benchTick = tick;

/** As bench-cell, but its number is a signal passed to the template: a change renders no component. */
@Component({ tag: 'bench-live-cell', encapsulation: { type: 'shadow' } })
export class BenchLiveCell {
  @Prop() label = '';

  render() {
    return (
      <Host>
        <span class="label">{this.label}</span>
        <b>{tick}</b>
      </Host>
    );
  }
}
