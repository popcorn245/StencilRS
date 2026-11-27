import { Component, h, Prop, State } from '@stencil/core';

@Component({ tag: 'rf-counter', styles: '.c{border:1px solid}', encapsulation: { type: 'shadow' } })
export class RfCounter {
  @Prop() label = 'n';
  @State() count = 0;
  render() {
    return (
      <div class="c">
        <button onClick={() => this.count++}>
          {this.label}: {this.count}
        </button>
        <ul>
          {[1, 2, 3].map((i) => (
            <li key={i} class={i === (this.count % 3) + 1 ? 'on' : ''}>
              {i}
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
