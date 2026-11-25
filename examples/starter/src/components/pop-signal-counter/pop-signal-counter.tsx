import { Component, Host, Prop } from '@stencil/core';
import { Computed, Signal } from '@popcorn245/stencilrs/signals';

import { total } from '../../shared/signal-store';

/** Experimental: a counter whose state is TC39 Signals (`@Signal`, `@Computed`, a shared store). */
@Component({
  tag: 'pop-signal-counter',
  encapsulation: { type: 'shadow' },
})
export class PopSignalCounter {
  /** How much each click adds. */
  @Prop() step: number = 1;

  /** This counter's own count, a `Signal.State`. */
  @Signal() count = 0;

  /** Cached until `count` changes. */
  @Computed() get doubled() {
    return this.count * 2;
  }

  private add = () => {
    this.count += this.step;
    total.set(total.get() + this.step);
  };

  render() {
    return (
      <Host>
        <output class="count">{this.count}</output>
        <output class="doubled">{this.doubled}</output>
        <output class="total">{total.get()}</output>
        <button onClick={this.add}>+{this.step}</button>
      </Host>
    );
  }
}
