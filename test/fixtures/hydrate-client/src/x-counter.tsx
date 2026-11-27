import { Component, h, State } from '@stencil/core';

@Component({ tag: 'x-counter', encapsulation: { type: 'shadow' } })
export class XCounter {
  @State() count = 0;
  render() {
    return (
      <div class="counter">
        <button type="button" onClick={() => this.count++}>
          count: {this.count}
        </button>
        <x-note text="clicked"></x-note>
        <slot></slot>
      </div>
    );
  }
}
