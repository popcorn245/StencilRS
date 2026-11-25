import { Component, Prop, State } from '@stencil/core';

/** The same card as ../qwik/load/src/app.tsx. */
@Component({ tag: 'load-card', encapsulation: { type: 'scoped' } })
export class LoadCard {
  @Prop() name = '';
  @Prop() price = 0;
  @State() likes = 0;

  render() {
    return (
      <div class="card">
        <h3>{this.name}</h3>
        <p class="price">${this.price.toFixed(2)}</p>
        <button class="like" onClick={() => this.likes++}>♥ {this.likes}</button>
      </div>
    );
  }
}
