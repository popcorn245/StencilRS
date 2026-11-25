// Experimental: `@Signal()` and `@Computed()` for Stencil components, on TC39 Signals
// (https://github.com/tc39/proposal-signals, Stage 1) through `signal-polyfill`.
//
//   import { Signal, Computed } from '@popcorn245/stencilrs/signals';
//
//   @Signal() count = 0;                              // a Signal.State per instance
//   @Computed() get doubled() { return this.count * 2; } // a Signal.Computed per instance
//
// A component with a `@Signal()` field re-renders when any signal its `render()` read changes:
// its own fields, and any other TC39 signal (a store shared across components or frameworks).
// Its `render()` runs inside a `Signal.Computed` that a `Signal.subtle.Watcher` watches while the
// element is connected; a change schedules `forceUpdate` on a microtask, so several writes make
// one render. Writes to a signal nothing rendered from don't re-render.
//
// stencilrs compiles `@Signal() x = v` to `this.x = v` in the constructor plus
// `__rs_decorate([Signal()], Cmp.prototype, "x", void 0)` after the class (`Signal()(Cmp.prototype, "x")`),
// as TypeScript's legacy decorators do. See docs/decorators.md.
import { Build, forceUpdate } from '@stencil/core';
import { Signal as TC39 } from 'signal-polyfill';

export { TC39 as Signals };

/** A TC39 `Signal.State`, from the same polyfill copy the decorators use. */
export const signal = (value, options) => new TC39.State(value, options);
/** A TC39 `Signal.Computed`, from the same polyfill copy the decorators use. */
export const computed = (fn, options) => new TC39.Computed(fn, options);

// The stencilrs runtime binds a signal passed as a part's value (`{count}`) to that part: see
// "Signals bound to parts" in runtime.js. One watcher serves every binding; each is a Computed
// that reads the signal and applies its value, re-run on a microtask after the signal changes.
let flushing = false;
const bindings = new TC39.subtle.Watcher(() => {
  if (flushing) return;
  flushing = true;
  queueMicrotask(() => {
    flushing = false;
    for (const c of bindings.getPending()) {
      try {
        c.get();
      } catch (e) {
        console.error(e);
      }
    }
    bindings.watch();
  });
});
const parts = {
  is: (v) => v instanceof TC39.State || v instanceof TC39.Computed,
  /** Applies the signal's value now and after each change; returns how to stop. */
  watch(signal, apply) {
    // On the server a render happens once: nothing to watch, nothing to leak per request.
    if (globalThis.__RS_SERVER__) {
      apply(signal.get());
      return () => {};
    }
    // Only the signal is tracked: what applying it reads (a child component rendering, say) is not.
    const c = new TC39.Computed(() => {
      const v = signal.get();
      TC39.subtle.untrack(() => apply(v));
    });
    c.get();
    bindings.watch(c);
    return () => bindings.unwatch(c);
  },
};
// Whichever of the two modules loads first, the runtime gets it.
if (globalThis.__RS_BIND__) globalThis.__RS_BIND__(parts);
else globalThis.__RS_SIGNALS__ = parts;

/** instance → Map(field → Signal.State) */
const states = new WeakMap();
/** instance → Map(getter → Signal.Computed) */
const computeds = new WeakMap();
/** instance → render tracking (see `track`) */
const trackers = new WeakMap();
/** instance → Signal.State bumped by every render, so props and @State reach `@Computed()` too */
const ticks = new WeakMap();
const PATCHED = Symbol.for('stencilrs.signals.patched');
// The stencilrs runtime's elements schedule themselves; Stencil's go through its forceUpdate.
const rerender = (inst) => (inst.__schedule ? inst.__schedule() : forceUpdate(inst));

const tickOf = (inst) => {
  let t = ticks.get(inst);
  if (!t) ticks.set(inst, (t = new TC39.State(0)));
  return t;
};

const stateOf = (inst, key, options, init) => {
  let map = states.get(inst);
  if (!map) states.set(inst, (map = new Map()));
  let s = map.get(key);
  if (!s) map.set(key, (s = new TC39.State(init, options)));
  return s;
};

/**
 * The TC39 `Signal.State` behind a `@Signal()` field (or the `Signal.Computed` behind a
 * `@Computed()` getter) of a component instance or, in a custom-element build, its element.
 */
export const signalOf = (inst, key) => {
  const own = states.get(inst)?.get(key) ?? computeds.get(inst)?.get(key);
  if (own) return own;
  // Touch the accessor once so a field never assigned still has its signal.
  if (key in inst) {
    void inst[key];
    return states.get(inst)?.get(key) ?? computeds.get(inst)?.get(key) ?? null;
  }
  return null;
};

/** Per instance: `render()` inside a Computed, watched while connected. */
const track = (inst, render) => {
  let t = trackers.get(inst);
  if (t) return t;
  const tick = tickOf(inst);
  t = {
    tick,
    rendering: false,
    queued: false,
    connected: true,
    comp: new TC39.Computed(() => {
      tick.get(); // every render pulls a fresh vnode tree, whatever else changed (props, @State)
      return render.call(inst);
    }),
  };
  t.watcher = new TC39.subtle.Watcher(() => {
    // Called synchronously inside a write; reading or writing signals is not allowed here.
    if (t.rendering || t.queued || !t.connected) return;
    t.queued = true;
    queueMicrotask(() => {
      t.queued = false;
      if (t.connected) rerender(inst);
    });
  });
  trackers.set(inst, t);
  return t;
};

const patch = (proto) => {
  if (Object.prototype.hasOwnProperty.call(proto, PATCHED)) return;
  proto[PATCHED] = true;
  const render = proto.render;
  if (typeof render === 'function') {
    proto.render = function () {
      // On the server a render happens once: nothing to watch, nothing to leak per request.
      if (!Build.isBrowser) return render.call(this);
      const t = track(this, render);
      t.rendering = true;
      try {
        t.tick.set(t.tick.get() + 1);
        return t.comp.get();
      } finally {
        t.rendering = false;
        t.watcher.watch(t.comp); // first render: start; later: re-arm after the notification
      }
    };
  }
  // Own callbacks only: an inherited one is the base class's, which calls the component's.
  const own = (k) => (Object.prototype.hasOwnProperty.call(proto, k) ? proto[k] : undefined);
  const connected = own('connectedCallback');
  proto.connectedCallback = function () {
    const t = trackers.get(this);
    if (t && !t.connected) {
      t.connected = true;
      t.watcher.watch(t.comp);
      rerender(this); // something may have changed while it was away
    }
    return connected?.call(this);
  };
  const disconnected = own('disconnectedCallback');
  proto.disconnectedCallback = function () {
    const t = trackers.get(this);
    if (t) {
      t.connected = false;
      // Unwatched, a shared store no longer holds this element through the signal graph.
      t.watcher.unwatch(t.comp);
    }
    return disconnected?.call(this);
  };
};

/**
 * A component field backed by a TC39 `Signal.State`. Reading it in `render()` subscribes the
 * component; writing it re-renders. Options are the `Signal.State` options (`equals`).
 */
export function Signal(options) {
  return (proto, key) => {
    patch(proto);
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: true,
      get() {
        return stateOf(this, key, options, undefined).get();
      },
      set(value) {
        const map = states.get(this);
        if (map?.has(key)) map.get(key).set(value);
        else stateOf(this, key, options, value);
      },
    });
  };
}

/**
 * A getter cached in a TC39 `Signal.Computed`: recomputed when a signal it read changes, and
 * after each render (a getter reading a `@Prop` or `@State` sees the value the last render saw).
 */
export function Computed(options) {
  return (proto, key, descriptor) => {
    const get = descriptor?.get;
    if (typeof get !== 'function') throw new Error(`@Computed() goes on a getter; "${String(key)}" is not one.`);
    patch(proto);
    return {
      ...descriptor,
      get() {
        let map = computeds.get(this);
        if (!map) computeds.set(this, (map = new Map()));
        let c = map.get(key);
        if (!c) {
          const tick = tickOf(this);
          // A getter may read @Prop/@State, which are not signals: recompute after each render too.
          map.set(key, (c = new TC39.Computed(() => (tick.get(), get.call(this)), options)));
        }
        return c.get();
      },
    };
  };
}
