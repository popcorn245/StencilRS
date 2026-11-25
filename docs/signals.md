# `@Signal()`: TC39 Signals in components (experimental spike)

Not part of Stencil. [TC39 Signals](https://github.com/tc39/proposal-signals) are at Stage 1. This
uses [`signal-polyfill`](https://www.npmjs.com/package/signal-polyfill) (an optional peer
dependency) and may change or go away.

```tsx
import { Component, Prop } from '@stencil/core';
import { Computed, Signal, signal } from '@popcorn245/stencilrs/signals';

export const total = signal(0); // a plain TC39 Signal.State, shareable with anything

@Component({ tag: 'my-counter', encapsulation: { type: 'shadow' } })
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

## A signal passed to the template

On the stencilrs runtime (`runtime: 'stencilrs'`), a signal written into JSX as it is follows
that spot. `{count}` instead of `{count.get()}`:

```tsx
import { signal, computed } from '@popcorn245/stencilrs/signals';

export const count = signal(0);
const tone = computed(() => (count.get() % 2 ? 'odd' : 'even'));

// in a component's render():
<button class={tone} onClick={() => count.set(count.get() + 1)}>{count}</button>
```

The text node and the `class` are set when the signal changes. `render()` does not run, so
`componentWillRender`/`componentDidRender` don't fire for it. The component needs no `@Signal()`
field for this: it reads nothing in `render()`.

| | Behaviour |
|---|---|
| Where | A child (`{count}`) and any attribute, property, `class` or `style` value, in a component's JSX and in the templates of functional components and helpers. Not in the props of `h()` called directly. |
| Which signals | TC39 signals from this module, and Stencil 5's own (`@stencil/core/signals`): anything with `peek()` and `subscribe()`. |
| Batching | TC39 signals apply on a microtask, so several writes make one DOM update. Stencil's apply at once, or at the end of their `batch()`. |
| Lifetime | A binding ends when the part gets another value or its nodes are removed. It pauses while the component is disconnected, and catches up on reconnect. |
| SSR | The server writes the current value and watches nothing. On the client the component hydrates on load (`s-rh`), keeping the server's nodes, so the binding exists from the start. |
| Stencil's runtime | Stencil 5 binds its own signals in JSX the same way (`vdomSignals`), so `{count}` with `@stencil/core/signals` is the same source on both runtimes. A TC39 signal in JSX is not bound there. |

Numbers (`examples/starter/bench`, stencilrs, script time): 1,000 components show a new number in
3.3 ms when a prop is set on each (each renders), and in 0.8 ms when one signal in their templates
changes (none renders). The binding code adds about 0.4 KB gzip to the runtime.

## How it compiles

`@Signal()` is an ordinary decorator that is not Stencil's own, so it is lowered like any other
(see [decorators.md](decorators.md) for the rules and the order): `@Signal() count = 0` becomes
`this["count"] = 0` in the constructor (whatever `useDefineForClassFields` says, because a class
field would shadow the accessor) and `__rs_decorate([Signal()], Cmp.prototype, "count", void 0)`
after the class, which is what TypeScript's legacy decorators emit. `@Computed()` goes through the
same path as a getter decorator. Nothing about the import path is special. Components with no
decorator of their own compile exactly as before (parity is unchanged).

## Limits found in the spike

- Only a component with a `@Signal()` or `@Computed()` member has its `render()` tracked. A component with neither that reads a store (`total.get()`) in `render()` does not re-render when the store changes. Pass the signal itself (`{total}`, above) or give the component a decorated member.
- Don't write a signal inside `render()`. The polyfill (0.2.3) allows it, but the write happens inside the tracked render, so it is a render loop waiting to happen. Stencil warns about the same thing for `@State`.
- A `@Signal()` field is not a Stencil member: it has no attribute, no `@Watch`, no `componentShouldUpdate` entry, and it isn't in `components.d.ts`.
- A `@Signal()` write that `render()` never read does not re-render. That's finer-grained than `@State`, and it's intended.
- `@Computed()` read outside a render can be stale with respect to a `@Prop` changed since the last render.
- One polyfill copy per page is needed. The Vite plugin resolves this module's `@stencil/core` and `signal-polyfill` from the project root to keep that true for linked installs.
