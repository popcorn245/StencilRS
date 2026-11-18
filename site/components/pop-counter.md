---
title: "pop-counter"
description: "A shadow-DOM counter from the starter project: props, an event and a method."
---

# pop-counter

A counter button, from `examples/starter`. It is a shadow component with two props, a piece of
state, an event and a method, so it exercises most of what the compiler generates.

<Demo caption="Compiled by stencilrs in this site's build.">
  <pop-counter label="Clicks" step="1"></pop-counter>
  <pop-counter label="Fives" step="5"></pop-counter>
</Demo>

## Usage

```html
<pop-counter label="Clicks" step="5"></pop-counter>
```

```ts
import './components/pop-counter/pop-counter'; // importing registers the element

const counter = document.querySelector('pop-counter')!;
counter.addEventListener('countChanged', (e) => console.log((e as CustomEvent<number>).detail));
await counter.reset();
```

## Properties

| Property | Attribute | Type | Default | Description |
|---|---|---|---|---|
| `label` | `label` | `string` | `'Count'` | Text shown before the count. |
| `step` | `step` | `number` | `1` | How much each click adds. |

## Events

| Event | Detail | Description |
|---|---|---|
| `countChanged` | `number` | Fired with the new count after every change. |

## Methods

| Method | Signature | Description |
|---|---|---|
| `reset` | `reset() => Promise<void>` | Set the count back to zero. |

## Source

```tsx
import { Component, Event, EventEmitter, Host, Method, Prop, State } from '@stencil/core';

@Component({
  tag: 'pop-counter',
  styleUrl: 'pop-counter.css',
  encapsulation: { type: 'shadow' },
})
export class PopCounter {
  /** Text shown before the count. */
  @Prop() label: string = 'Count';

  /** How much each click adds. */
  @Prop() step: number = 1;

  @State() count = 0;

  /** Fired with the new count after every change. */
  @Event() countChanged: EventEmitter<number>;

  /** Set the count back to zero. */
  @Method()
  async reset(): Promise<void> {
    this.set(0);
  }

  private set(value: number) {
    this.count = value;
    this.countChanged.emit(value);
  }

  render() {
    return (
      <Host>
        <span class="label">{this.label}</span>
        <output>{this.count}</output>
        <button onClick={() => this.set(this.count + this.step)}>+{this.step}</button>
      </Host>
    );
  }
}
```
