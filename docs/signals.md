# `@Signal()`: TC39 Signals in components (experimental spike)

Not part of Stencil. [TC39 Signals](https://github.com/tc39/proposal-signals) are at Stage 1. This
uses [`signal-polyfill`](https://www.npmjs.com/package/signal-polyfill) (an optional peer
dependency) and may change or go away.

```tsx
import { Component, Prop } from '@stencil/core';
import { Computed, Signal, signal } from '@popcorn245/stencilrs/signals';

export const total = signal(0); // a plain TC39 Signal.State, shareable with anything

@Component({ tag: 'my-counter', shadow: true })
export class MyCounter {
  @Prop() step = 1;
  @Signal() count = 0;                                   // Signal.State per instance
  @Computed() get doubled() { return this.count * 2; }   // Signal.Computed per instance

  render() {
    return <button onClick={() => { this.count += this.step; total.set(total.get() + 1); }}>
      {this.count} / {this.doubled} / {total.get()}
    </button>;
  }
}
```

## What it does

| Piece | Behaviour |
|---|---|
| `@Signal(options?)` | The field reads and writes a `Signal.State` (`options` are its `equals`). |
| `@Computed(options?)` | The getter is cached in a `Signal.Computed`. It recomputes when a signal it read changes, and after each render, so a getter that reads a `@Prop` or `@State` stays current. |
| Rendering | `render()` runs inside a `Signal.Computed`, watched by a `Signal.subtle.Watcher` while the element is connected. Writing any signal that render read (its own fields, or a shared store) schedules `forceUpdate` on a microtask, so several writes make one render. `@Prop`/`@State` re-render as before. |
| `signalOf(el, 'count')` | The `Signal.State` (or `Signal.Computed`) behind a field. Other frameworks can read and write it directly. |
| `signal()`, `computed()`, `Signals` | Factories and the `Signal` namespace from the same polyfill copy. Use these so stores and components share one signal graph. |
| Disconnect | The watcher stops watching, so a long-lived store doesn't keep a removed element alive. On reconnect it watches again and re-renders once. |
| SSR | `render()` runs plainly on the server (`Build.isBrowser` is false), with no watcher. A store defined at module level is shared across requests, so keep per-request data out of it. |

## How it compiles

`@Signal()` is recognised only when imported from `@popcorn245/stencilrs/signals`. stencilrs writes
`@Signal() count = 0` as `this["count"] = 0` in the constructor (whatever `useDefineForClassFields`
says, because a class field would shadow the accessor) and `Signal()(Cmp.prototype, "count")` after
the class. That is what TypeScript's legacy decorators emit, so Stencil's own compiler (the fallback)
should produce equivalent code (not yet tested). `@Computed()` is an ordinary method decorator and needs nothing from
the compiler. Components that don't import the module compile exactly as before (parity is
unchanged).

## Limits found in the spike

- Don't write a signal inside `render()`. The polyfill (0.2.3) allows it, but the write happens inside the tracked render, so it is a render loop waiting to happen. Stencil warns about the same thing for `@State`.
- A `@Signal()` field is not a Stencil member: it has no attribute, no `@Watch`, no `componentShouldUpdate` entry, and it isn't in `components.d.ts`.
- A `@Signal()` write that `render()` never read does not re-render. That's finer-grained than `@State`, and it's intended.
- `@Computed()` read outside a render can be stale with respect to a `@Prop` changed since the last render.
- One polyfill copy per page is needed. The Vite plugin resolves this module's `@stencil/core` and `signal-polyfill` from the project root to keep that true for linked installs.
