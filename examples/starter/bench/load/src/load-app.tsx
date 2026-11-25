import { Component, State } from '@stencil/core';
import { ITEMS } from './items';

/** The same page as ../qwik/load/src/app.tsx. */
@Component({ tag: 'load-app', encapsulation: { type: 'scoped' } })
export class LoadApp {
  @State() count = 0;

  render() {
    return (
      <main>
        <header>
          <h1>Shop</h1>
          <button id="count" onClick={() => this.count++}>Clicked {this.count}</button>
        </header>
        <section>
          {ITEMS.map((i) => <load-card key={i.id} name={i.name} price={i.price} />)}
        </section>
      </main>
    );
  }
}
