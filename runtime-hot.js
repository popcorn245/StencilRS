// Hot reload for the stencilrs runtime. The Vite plugin imports this in dev only, so none of it
// ships. While it is loaded the runtime also warns when hydration falls back.
import { __hot, define } from './runtime.js';

/** Live instances per tag. */
const live = new Map();
const { sheets } = __hot({
  track(el) {
    const tag = el.constructor.__meta?.tag;
    if (!tag) return;
    let set = live.get(tag);
    if (!set) live.set(tag, (set = new Set()));
    set.add(new WeakRef(el));
  },
  /**
   * A custom element can't be defined twice, so the new class's methods, accessors and metadata
   * move onto the registered one and every live instance renders again.
   */
  swap(Old, New, meta) {
    define(New, meta, false); // accessors and callbacks on New, not registered
    for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(New.prototype))) {
      if (k !== 'constructor') Object.defineProperty(Old.prototype, k, d);
    }
    Object.assign(Old.__meta, New.__meta);
    sheets.delete(Old);
    for (const ref of live.get(meta.tag) || []) {
      const el = ref.deref();
      if (el?.isConnected && el.__f & 1 /* loaded */) {
        el.__hostT = null;
        el.__render(false);
      }
    }
  },
});
