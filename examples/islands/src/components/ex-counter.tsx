import { Component, h, State } from '@stencil/core';

/** Interactive: it only counts once the client has taken it over (client="load" in the view). */
@Component({ tag: 'ex-counter', encapsulation: { type: 'shadow' }, styles: ':host{display:inline-block} button{font:inherit;padding:.4em .9em;border-radius:6px;border:1px solid #888;background:#fff;cursor:pointer}' })
export class ExCounter {
  @State() count = 0;
  render() {
    return <button onClick={() => this.count++}>Clicked {this.count} times</button>;
  }
}
