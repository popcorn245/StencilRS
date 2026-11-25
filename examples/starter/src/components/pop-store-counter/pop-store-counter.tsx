import { Component } from '@stencil/core';

import { cart } from '../../shared/cart-store';

/** A counter whose state lives in a `@stencil/store` store, shared by every instance. */
@Component({
  tag: 'pop-store-counter',
  encapsulation: { type: 'shadow' },
})
export class PopStoreCounter {
  /** How many times this instance rendered. */
  renders = 0;

  render() {
    this.renders++;
    return (
      <button onClick={() => cart.state.items++}>
        <span class="items">{cart.state.items}</span>
      </button>
    );
  }
}
