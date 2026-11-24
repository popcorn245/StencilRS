// Experimental: the stencilrs runtime (componentExport: 'stencilrs').
//
// Stencil components, the same source, without a virtual DOM. stencilrs compiles each JSX tree
// in `render()` to a static template (parsed once, cloned per use) plus the list of its dynamic
// parts; `render()` returns the template and the values of those parts. Updating a component
// compares each value with the last one and touches only the parts that changed, as Lit does.
// `render()` still runs on every change, so components behave as they do on Stencil's runtime.
//
// Covered: @Prop (attribute parsing, reflect, mutable), @State, @Event, @Element, @Method, @Watch,
// @Listen, the load/update/render lifecycle, componentOnReady, forceUpdate, shadow or light DOM,
// adopted styles, keyed and unkeyed lists, class/style objects, refs, spreads, events.
// Not covered: scoped CSS, slot emulation outside shadow DOM, functional components, SSR and
// hydration, the lazy loader, child-before-parent load ordering.

// ---------------------------------------------------------------------------------------------
// Templates

const MARK = 'rs';
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A compiled template. `html` marks each element with dynamic parts with an `rs` attribute and
 * each child hole with an `<!--rs-->` comment; `parts` is `[mark index, type, name?]` per value.
 * `host` lists the parts bound to the host element (`<Host>` attributes), which come first in
 * the values.
 */
export const template = (html, parts, svg = false, host = null) => ({ html, parts, svg, host, el: null, marks: 0 });

/** A template and the values of its parts: what compiled JSX evaluates to. */
export const t = (tmpl, v, k) => ({ $t: tmpl, v, k });

const prepare = (tmpl) => {
  const te = document.createElement('template');
  te.innerHTML = tmpl.svg ? `<svg>${tmpl.html}</svg>` : tmpl.html;
  let content = te.content;
  if (tmpl.svg) {
    const svg = content.firstChild;
    content = document.createDocumentFragment();
    while (svg.firstChild) content.appendChild(svg.firstChild);
  }
  // Number the marked nodes in document order; strip the attribute marks.
  const walker = document.createTreeWalker(content, 129 /* elements and comments */);
  const order = [];
  let i = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode(), i++) {
    if (n.nodeType === 8 ? n.data === MARK : n.hasAttribute(MARK)) {
      order.push(i);
      if (n.nodeType === 1) n.removeAttribute(MARK);
    }
  }
  tmpl.el = content;
  tmpl.order = order;
};

const instantiate = (tmpl) => {
  if (!tmpl.el) prepare(tmpl);
  const frag = document.importNode(tmpl.el, true);
  const marked = [];
  if (tmpl.order.length) {
    const walker = document.createTreeWalker(frag, 129);
    let i = 0, j = 0, want = tmpl.order[0];
    for (let n = walker.nextNode(); n; n = walker.nextNode(), i++) {
      if (i === want) {
        marked.push(n);
        want = tmpl.order[++j];
        if (want === undefined) break;
      }
    }
  }
  const parts = tmpl.parts.map(([m, type, name]) => makePart(type, marked[m], name, marked[m].namespaceURI === SVG_NS));
  // An empty text node first, so the instance is a contiguous range from `start` to `end`
  // (a hole at either edge inserts its content inside it).
  const start = document.createTextNode('');
  frag.insertBefore(start, frag.firstChild);
  return { tmpl, frag, parts, start, end: frag.lastChild };
};

const update = (inst, values, offset = 0) => {
  const parts = inst.parts;
  for (let i = 0; i < parts.length; i++) parts[i].set(values[i + offset]);
};

const removeRange = (start, end) => {
  for (let n = start; ; ) {
    const next = n.nextSibling;
    n.remove();
    if (n === end || !next) break;
    n = next;
  }
};

const moveRange = (start, end, parent, before) => {
  for (let n = start; ; ) {
    const next = n.nextSibling;
    parent.insertBefore(n, before);
    if (n === end || !next) break;
    n = next;
  }
};

// ---------------------------------------------------------------------------------------------
// Parts

const makePart = (type, node, name, svg) => {
  switch (type) {
    case 0: return new NodePart(node);
    case 1: return new AttrPart(node, name, svg);
    case 2: return new EventPart(node, name);
    case 3: return new ClassPart(node);
    case 4: return new StylePart(node);
    case 5: return new RefPart(node);
    case 6: return new SpreadPart(node, svg);
    default: throw new Error(`stencilrs runtime: unknown part type ${type}`);
  }
};

/** A child hole: text, a template, a node, a list of those, or nothing. Content sits before the marker. */
class NodePart {
  constructor(marker) {
    this.m = marker;
    this.v = undefined;
    this.inst = null;
    this.text = null;
    this.node = null;
    this.list = null;
  }
  clear() {
    if (this.inst) {
      removeRange(this.inst.start, this.inst.end);
      this.inst = null;
    } else if (this.text) {
      this.text.remove();
      this.text = null;
    } else if (this.node) {
      this.node.remove();
      this.node = null;
    } else if (this.list) {
      for (const e of this.list) removeRange(e.start, e.part.m);
      this.list = null;
    }
  }
  set(v) {
    if (v === this.v && (v === null || typeof v !== 'object')) return;
    if (v == null || v === false || v === true) {
      this.clear();
    } else if (v.$t !== undefined) {
      if (this.inst && this.inst.tmpl === v.$t) {
        update(this.inst, v.v);
      } else {
        this.clear();
        const inst = instantiate(v.$t);
        update(inst, v.v);
        this.m.parentNode.insertBefore(inst.frag, this.m);
        this.inst = inst;
      }
    } else if (Array.isArray(v)) {
      if (!this.list) this.clear();
      this.setList(v);
    } else if (v instanceof Node) {
      if (this.node !== v) {
        this.clear();
        this.m.parentNode.insertBefore(v, this.m);
        this.node = v;
      }
    } else {
      const s = String(v);
      if (this.text) {
        if (this.text.data !== s) this.text.data = s;
      } else {
        this.clear();
        this.text = document.createTextNode(s);
        this.m.parentNode.insertBefore(this.text, this.m);
      }
    }
    this.v = v;
  }
  /** Items are matched by `key` when they have one, by position otherwise. */
  setList(items) {
    const parent = this.m.parentNode;
    const old = this.list || [];
    const byKey = new Map();
    for (let i = 0; i < old.length; i++) byKey.set(old[i].k, i);
    const next = new Array(items.length);
    const from = new Int32Array(items.length); // old index of each new entry, -1 when new
    const used = new Uint8Array(old.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const k = item != null && item.k != null ? item.k : `\0${i}`;
      const j = byKey.get(k);
      if (j !== undefined && !used[j]) {
        used[j] = 1;
        next[i] = old[j];
        from[i] = j;
      } else {
        next[i] = { k, start: document.createTextNode(''), part: new NodePart(document.createComment('')) };
        from[i] = -1;
      }
    }
    for (let j = 0; j < old.length; j++) if (!used[j]) removeRange(old[j].start, old[j].part.m);
    // Entries on the longest run that kept their relative order stay put; the rest move.
    const keep = lis(from);
    let ref = this.m;
    for (let i = next.length - 1; i >= 0; i--) {
      const e = next[i];
      if (from[i] === -1) {
        parent.insertBefore(e.start, ref);
        parent.insertBefore(e.part.m, ref);
      } else if (!keep[i]) {
        moveRange(e.start, e.part.m, parent, ref);
      }
      e.part.set(items[i]);
      ref = e.start;
    }
    this.list = next;
  }
}

/** Marks the positions of a longest increasing subsequence of `a` (ignoring -1). */
const lis = (a) => {
  const n = a.length;
  const keep = new Uint8Array(n);
  const prev = new Int32Array(n);
  const tails = [];
  for (let i = 0; i < n; i++) {
    const v = a[i];
    if (v < 0) continue;
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (a[tails[mid]] < v) lo = mid + 1;
      else hi = mid;
    }
    prev[i] = lo > 0 ? tails[lo - 1] : -1;
    tails[lo] = i;
  }
  for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) keep[i] = 1;
  return keep;
};

/** Stencil's `setAccessor` for one name: a property when the element has it, an attribute otherwise. */
class AttrPart {
  constructor(el, name, svg) {
    this.el = el;
    this.n = name;
    this.svg = svg;
    this.v = undefined;
    this.prop = !svg && name !== 'list' && name !== 'type' && name !== 'form' && name in el;
  }
  set(v) {
    if (v === this.v) return;
    this.v = v;
    const { el, n } = this;
    const complex = v != null && (typeof v === 'object' || typeof v === 'function');
    if (this.prop || complex) {
      el[n] = v == null && typeof el[n] === 'string' ? '' : v;
      if (complex || this.prop) return;
    }
    if (v == null || v === false) {
      if (v !== false || el.getAttribute(n) === '') el.removeAttribute(n);
    } else {
      el.setAttribute(n, v === true ? '' : v);
    }
  }
}

/** `onClick` and friends: one listener per element and event, calling the latest handler. */
class EventPart {
  constructor(el, name) {
    this.el = el;
    // Stencil: `onClick` → `click` (a known window event), `onIonChange` → `ionChange`.
    const lower = name.toLowerCase();
    if (name[2] === '-') this.type = name.slice(3);
    else if (lower in globalThis) this.type = lower.slice(2);
    else this.type = name[2].toLowerCase() + name.slice(3);
    this.fn = null;
    this.on = false;
  }
  set(fn) {
    this.fn = fn;
    if (!this.on && fn) {
      this.on = true;
      this.el.addEventListener(this.type, (e) => this.fn && this.fn(e));
    }
  }
}

const classSet = (v) => {
  const s = new Set();
  if (!v) return s;
  if (typeof v === 'string') {
    for (const c of v.split(/\s+/)) if (c) s.add(c);
  } else {
    for (const k in v) if (v[k]) for (const c of k.split(/\s+/)) if (c) s.add(c);
  }
  return s;
};

/** `class` as a string or `{ name: bool }`: adds and removes only its own classes, as Stencil does. */
class ClassPart {
  constructor(el) {
    this.el = el;
    this.cur = new Set();
    this.v = undefined;
  }
  set(v) {
    if (v === this.v && typeof v !== 'object') return;
    this.v = v;
    const next = classSet(v);
    const cl = this.el.classList;
    for (const c of this.cur) if (!next.has(c)) cl.remove(c);
    for (const c of next) if (!this.cur.has(c)) cl.add(c);
    this.cur = next;
  }
}

class StylePart {
  constructor(el) {
    this.el = el;
    this.cur = {};
  }
  set(v) {
    const style = this.el.style;
    if (typeof v === 'string') {
      style.cssText = v;
      this.cur = {};
      return;
    }
    v = v || {};
    for (const k in this.cur) if (!(k in v)) k.includes('-') ? style.removeProperty(k) : (style[k] = '');
    for (const k in v) {
      const x = v[k];
      if (this.cur[k] !== x) k.includes('-') ? style.setProperty(k, x) : (style[k] = x);
    }
    this.cur = { ...v };
  }
}

class RefPart {
  constructor(el) {
    this.el = el;
    this.fn = null;
  }
  set(fn) {
    if (fn !== this.fn) {
      this.fn = fn;
      if (fn) fn(this.el);
    }
  }
}

class SpreadPart {
  constructor(el, svg) {
    this.el = el;
    this.svg = svg;
    this.parts = new Map();
  }
  set(obj) {
    obj = obj || {};
    for (const [k, p] of this.parts) if (!(k in obj)) p.set(undefined);
    for (const k in obj) {
      let p = this.parts.get(k);
      if (!p) {
        p = k === 'class' || k === 'className' ? new ClassPart(this.el)
          : k === 'style' ? new StylePart(this.el)
          : k === 'ref' ? new RefPart(this.el)
          : k === 'key' ? { set() {} }
          : /^on[A-Z-]/.test(k) ? new EventPart(this.el, k)
          : new AttrPart(this.el, k, this.svg);
        this.parts.set(k, p);
      }
      p.set(obj[k]);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Components

/** Member flags, as `define` receives them. */
const PROP = 1, STATE = 2;
const T_STRING = 64, T_NUMBER = 128, T_BOOLEAN = 256, T_ANY = 512;
const MUTABLE = 16, REFLECT = 32;

const parseProp = (v, flags) => {
  if (v == null || (v !== null && typeof v === 'object') || typeof v === 'function') return v;
  if (flags & T_BOOLEAN) return v === 'false' ? false : v === '' || !!v;
  if (flags & T_NUMBER) return typeof v === 'number' ? v : parseFloat(v);
  if (flags & T_STRING) return String(v);
  return v;
};

const sheets = new WeakMap();
const cssOf = (style) => (Array.isArray(style) ? style.map(cssOf).join('') : typeof style === 'function' ? style() : style) || '';
const sheetFor = (Cstr, css) => {
  let s = sheets.get(Cstr);
  if (!s) {
    css = cssOf(css);
    s = new CSSStyleSheet();
    s.replaceSync(css);
    sheets.set(Cstr, s);
  }
  return s;
};

const HAS_LOADED = 1, QUEUED = 2, RENDERING = 4, CONNECTED_ONCE = 8, REFLECTING = 16;

/** What every compiled component extends. */
export class Base extends HTMLElement {
  constructor() {
    super();
    this.__f = 0;
    this.__v = new Map();
    this.__root = null;
    this.__host = null;
    this.__onReady = new Promise((r) => (this.__ready = r));
    // Properties set on the element before it was upgraded would shadow the accessors.
    const meta = this.constructor.__meta;
    let early = null;
    for (const name in meta.members) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        (early ||= []).push([name, this[name]]);
        delete this[name];
      }
    }
    this.__early = early;
  }
  componentOnReady() {
    return this.__onReady;
  }
  connectedCallback() {
    const meta = this.constructor.__meta;
    if (!(this.__f & CONNECTED_ONCE)) {
      this.__f |= CONNECTED_ONCE;
      if (this.__early) {
        for (const [k, v] of this.__early) this[k] = v;
        this.__early = null;
      }
      meta.reflectAll(this);
      for (const [ev, method, target] of meta.listeners) {
        const t = target === 'window' ? window : target === 'document' ? document : target === 'body' ? document.body : this;
        t.addEventListener(ev, (e) => this[method](e));
      }
      this.__connected?.();
      this.__load();
    } else {
      this.__connected?.();
    }
  }
  disconnectedCallback() {
    this.__disconnected?.();
  }
  async __load() {
    try {
      const will = this.componentWillLoad?.();
      if (will && typeof will.then === 'function') await will;
    } catch (e) {
      console.error(e);
    }
    const meta = this.constructor.__meta;
    if (meta.shadow) {
      const root = this.shadowRoot || this.attachShadow({ mode: 'open', delegatesFocus: !!meta.delegatesFocus });
      if (meta.style) root.adoptedStyleSheets = [sheetFor(this.constructor, meta.style)];
      this.__target = root;
    } else {
      if (meta.style && !this.constructor.__styled) {
        this.constructor.__styled = true;
        document.head.appendChild(Object.assign(document.createElement('style'), { textContent: cssOf(meta.style) }));
      }
      this.__target = this;
    }
    this.__render(true);
    this.__f |= HAS_LOADED;
    this.classList.add('hydrated');
    try {
      this.componentDidLoad?.();
    } catch (e) {
      console.error(e);
    }
    this.__ready(this);
  }
  __render(first) {
    if (typeof this.render !== 'function') return;
    this.__f |= RENDERING;
    try {
      this.componentWillRender?.();
      if (!first) this.componentWillUpdate?.();
      const out = this.render();
      if (!this.__root) {
        const marker = document.createComment('');
        this.__target.appendChild(marker);
        this.__root = new NodePart(marker);
      }
      if (out != null && out.$t !== undefined && out.$t.host) {
        // `<Host>`: its attributes bind to this element, its children render inside.
        if (this.__hostT !== out.$t) {
          this.__hostT = out.$t;
          this.__host = out.$t.host.map(([type, name]) => makePart(type, this, name, false));
        }
        for (let i = 0; i < this.__host.length; i++) this.__host[i].set(out.v[i]);
        if (this.__root.inst && this.__root.inst.tmpl === out.$t) {
          update(this.__root.inst, out.v, this.__host.length);
        } else {
          this.__root.clear();
          const inst = instantiate(out.$t);
          update(inst, out.v, this.__host.length);
          this.__root.m.parentNode.insertBefore(inst.frag, this.__root.m);
          this.__root.inst = inst;
          this.__root.v = out;
        }
      } else {
        this.__root.set(out);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.__f &= ~RENDERING;
    }
    try {
      this.componentDidRender?.();
      if (!first) this.componentDidUpdate?.();
    } catch (e) {
      console.error(e);
    }
  }
  __schedule() {
    if (!(this.__f & HAS_LOADED) || this.__f & QUEUED) return;
    this.__f |= QUEUED;
    queueMicrotask(() => {
      this.__f &= ~QUEUED;
      this.__render(false);
    });
  }
  attributeChangedCallback(attr, _old, value) {
    if (this.__f & REFLECTING) return;
    const meta = this.constructor.__meta;
    const name = meta.attrs[attr];
    if (name === undefined) return;
    const des = meta.deserializers[name];
    this[name] = des ? this[des[0]](value, name) : value;
  }
}

/** Stencil's `Mixin`: the factories applied right to left over the runtime's base class. */
export const Mixin = (...mixins) => mixins.reduceRight((acc, mixin) => mixin(acc), Base);

/** Stencil's `Build`, as the browser sees it. */
export const Build = { isBrowser: true, isServer: false, isDev: false, isTesting: false };
/** Stencil's `getElement`: a component here is its element. */
export const getElement = (ref) => ref;
export const writeTask = (cb) => requestAnimationFrame(cb);
export const readTask = (cb) => requestAnimationFrame(cb);
export const getAssetPath = (path) => new URL(path, document.baseURI).href;

/** Re-render a component (Stencil's `forceUpdate`). */
export const forceUpdate = (el) => el.__schedule?.();

/**
 * Register a compiled component. `meta.members` is `{ name: [flags, attribute?] }`, `watchers`
 * `{ name: [method...] }`, `listeners` `[[event, method, target?]]`.
 */
export const define = (Cstr, meta) => {
  meta.listeners ||= [];
  meta.watchers ||= {};
  meta.attrs = {};
  const proto = Cstr.prototype;
  meta.serializers ||= {};
  meta.deserializers ||= {};
  const reflected = [];
  const reflect = (el, name, value) => {
    const [flags, attr] = meta.members[name];
    const ser = meta.serializers[name];
    if (ser) value = el[ser[0]](value, name);
    else if (!(flags & REFLECT)) return;
    el.__f |= REFLECTING;
    if (value == null || value === false) el.removeAttribute(attr);
    else el.setAttribute(attr, value === true ? '' : typeof value === 'object' ? JSON.stringify(value) : value);
    el.__f &= ~REFLECTING;
  };
  meta.reflectAll = (el) => {
    for (const name of reflected) if (el.__v.get(name) != null) reflect(el, name, el.__v.get(name));
  };
  for (const [name, [flags, attr]] of Object.entries(meta.members)) {
    if (flags & PROP && attr) meta.attrs[attr] = name;
    const reflects = !!(flags & PROP && attr && (flags & REFLECT || meta.serializers[name]));
    if (reflects) reflected.push(name);
    const watchers = meta.watchers[name];
    Object.defineProperty(proto, name, {
      configurable: true,
      enumerable: true,
      get() {
        return this.__v.get(name);
      },
      set(value) {
        if (flags & PROP) value = parseProp(value, flags);
        const old = this.__v.get(name);
        if (old === value || (Number.isNaN(old) && Number.isNaN(value))) return;
        this.__v.set(name, value);
        // Attributes can't be written from a constructor: before the first connect, reflecting waits.
        if (reflects && this.__f & CONNECTED_ONCE) reflect(this, name, value);
        if (this.__f & HAS_LOADED) {
          if (watchers) for (const m of watchers) this[m](value, old, name);
          this.__schedule();
        }
      },
    });
  }
  // The user's connected/disconnected callbacks run inside Base's.
  for (const [cb, own] of [['connectedCallback', '__connected'], ['disconnectedCallback', '__disconnected']]) {
    if (Object.prototype.hasOwnProperty.call(proto, cb)) {
      Object.defineProperty(proto, own, { value: proto[cb], configurable: true });
      delete proto[cb];
    }
  }
  Object.defineProperty(Cstr, '__meta', { value: meta });
  Object.defineProperty(Cstr, 'observedAttributes', { value: Object.keys(meta.attrs) });
  if (!customElements.get(meta.tag)) customElements.define(meta.tag, Cstr);
};

/** Stencil's `createEvent`: `this.changed.emit(detail)`. */
export const createEvent = (el, name, flags) => ({
  emit: (detail) => {
    const ev = new CustomEvent(name, { bubbles: !!(flags & 4), composed: !!(flags & 2), cancelable: !!(flags & 1), detail });
    el.dispatchEvent(ev);
    return ev;
  },
});
