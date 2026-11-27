import { Component, Prop, State } from '@stencil/core';

const ITEMS = Array.from({ length: 10 }, (_, id) => ({ id, text: `Item ${id}` }));

@Component({ tag: 'size-app', styleUrl: 'size-app.css', encapsulation: { type: 'shadow' } })
export class SizeApp {
  @Prop() label: string = 'Count';
  @State() count = 0;

  render() {
    return (
      <div>
        <button onClick={() => this.count++}>
          {this.label}: {this.count}
        </button>
        <ul>
          {ITEMS.map((item) => (
            <li key={item.id} class={{ on: item.id === this.count % 10 }}>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
