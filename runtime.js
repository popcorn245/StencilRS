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
// Also: scoped CSS, slot relocation outside shadow DOM, functional components, child-before-parent
// load order, modes/Env, HMR, and hydration of server markup (runtime-server.js). Not covered: the
// lazy loader (Vite splits code).

// ---------------------------------------------------------------------------------------------
// Templates

const MARK = 'rs';
// Set by `@popcorn245/stencilrs/runtime/server` before this module loads.
const SERVER = !!globalThis.__RS_SERVER__;
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
  const marked = [];
  let i = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode(), i++) {
    if (n.nodeType === 8 ? n.data === MARK : n.hasAttribute(MARK)) {
      order.push(i);
      marked.push(n);
      if (n.nodeType === 1) n.removeAttribute(MARK);
    }
  }
  tmpl.el = content;
  tmpl.order = order;
  // What hydration checks server nodes against, and which marks sit at the top level.
  const shape = (n) => (n.nodeType === 1 ? n.localName : n.nodeType);
  tmpl.markShape = marked.map(shape);
  tmpl.topMark = marked.map((n) => n.parentNode === content);
  tmpl.topShape = Array.from(content.childNodes, shape);
};

// ---------------------------------------------------------------------------------------------
// Hydration in place
//
// Every node a render creates and later needs (an instance's first and top-level nodes, the
// nodes its parts bind to, the text and markers of holes and lists) is "claimed" in creation
// order with a number per host. On the server the number goes on the node and the serializer
// writes it out (`rs-n="<host>.<n>"`, or a `<!--rs ...-->` comment for text and comments). On
// the client, the first render of a server-rendered host looks each claimed node up by its
// number instead of creating it, so the server's DOM is kept as it is. Any disagreement (a
// missing number, another tag) throws MISMATCH and the host renders again from scratch.

const MISMATCH = { mismatch: true };
const claim = (host, shape, make) => {
  if (!host) return make();
  const map = host.__adoptMap;
  if (map) {
    const n = map.get(host.__seq++);
    if (n === undefined || (n.nodeType === 1 ? n.localName : n.nodeType) !== shape) throw MISMATCH;
    return n;
  }
  const n = make();
  if (SERVER) {
    (n.__rsn ||= []).push(host.__seq++);
    n.__rsh = host;
  }
  return n;
};
const adopting = (host) => !!(host && host.__adoptMap);

const instantiate = (tmpl, host) => {
  if (!tmpl.el) prepare(tmpl);
  if (adopting(host)) return adoptInstance(tmpl, host);
  const inst = cloneInstance(tmpl, host);
  if (SERVER && host) {
    for (const n of inst.top) claim(host, 0, () => n);
    for (const p of inst.marked) claim(host, 0, () => p);
  }
  inst.marked = null;
  return inst;
};

const adoptInstance = (tmpl, host) => {
  const top = tmpl.topShape.map(() => null);
  const start = claim(host, 3, null);
  for (let i = 0; i < top.length; i++) top[i] = claim(host, tmpl.topShape[i], null);
  top.unshift(start);
  const marked = tmpl.markShape.map((shape) => claim(host, shape, null));
  const parts = tmpl.parts.map(([m, type, name]) => makePart(type, marked[m], name, marked[m].namespaceURI === SVG_NS, host));
  let topParts = null;
  tmpl.parts.forEach(([m], i) => {
    const p = parts[i];
    if (tmpl.topMark[m] && (p instanceof NodePart || p instanceof SlotPart)) (topParts ||= new Map()).set(p.m, p);
  });
  return { tmpl, frag: document.createDocumentFragment(), parts, start, end: top[top.length - 1], top, topParts };
};

const cloneInstance = (tmpl, host) => {
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
  const parts = tmpl.parts.map(([m, type, name]) => makePart(type, marked[m], name, marked[m].namespaceURI === SVG_NS, host));
  // An empty text node first, so the instance is a contiguous range from `start` to `end`
  // (a hole at either edge inserts its content inside it).
  const start = document.createTextNode('');
  frag.insertBefore(start, frag.firstChild);
  // The top-level nodes and holes, for when a slotting host scatters them (see `place`).
  const top = Array.from(frag.childNodes);
  let topParts = null;
  for (const p of parts) if ((p instanceof NodePart || p instanceof SlotPart) && p.m.parentNode === frag) (topParts ||= new Map()).set(p.m, p);
  return { tmpl, frag, parts, start, end: frag.lastChild, top, topParts, marked };
};

const update = (inst, values, offset = 0) => {
  const parts = inst.parts;
  for (let i = 0; i < parts.length; i++) parts[i].set(values[i + offset]);
};

// Native removal: a host's patched removeChild must not see the runtime's own work (and
// happy-dom implements `remove()` through the parent's removeChild).
const nativeRemove = Node.prototype.removeChild;
const detach = (n) => {
  const p = n.parentNode;
  if (p) nativeRemove.call(p, n);
};

const removeRange = (start, end) => {
  for (let n = start; ; ) {
    const next = n.nextSibling;
    detach(n);
    if (n === end || !next) break;
    n = next;
  }
};

// Slot relocation outside shadow DOM. A host without a shadow root moves its own children into
// its `<slot>` parts, so what another component rendered into it (its "logical" children, marked
// with `__lp`) ends up spread over several containers. Insertions before such a node are routed
// through the host (`__adopt`), and such ranges are removed or moved node by node.
const nativeInsert = Node.prototype.insertBefore;
const ins = (parent, node, ref) => nativeInsert.call(parent, node, ref);
const place = (node, ref) => {
  const lp = ref.__lp;
  if (lp === undefined) ins(ref.parentNode, node, ref);
  else lp.__adopt(node, ref);
};
const drop = (n) => {
  detach(n);
  const lp = n.__lp;
  if (lp !== undefined) {
    lp.__slotted.delete(n);
    n.__slot = null;
  }
};
const instNodes = (inst, out) => {
  for (const n of inst.top) {
    const p = inst.topParts && inst.topParts.get(n);
    if (p) partNodes(p, out);
    out.push(n);
  }
  return out;
};
const partNodes = (p, out) => {
  if (p instanceof SlotPart) {
    for (const n of p.slotted) if (n.__slot === p) out.push(n);
    return partNodes(p.fallback, out);
  }
  if (p.inst) instNodes(p.inst, out);
  else if (p.text) out.push(p.text);
  else if (p.node) out.push(p.node);
  else if (p.hel) out.push(p.hel);
  else if (p.list) for (const e of p.list) entryNodes(e, out);
  return out;
};
const entryNodes = (e, out) => {
  out.push(e.start);
  partNodes(e.part, out);
  out.push(e.part.m);
  return out;
};
const removeEntry = (e) => {
  if (e.start.__lp !== undefined) for (const n of entryNodes(e, [])) drop(n);
  else removeRange(e.start, e.part.m);
};

const moveRange = (start, end, parent, before) => {
  for (let n = start; ; ) {
    const next = n.nextSibling;
    ins(parent, n, before);
    if (n === end || !next) break;
    n = next;
  }
};

// ---------------------------------------------------------------------------------------------
// Parts

const makePart = (type, node, name, svg, host) => {
  switch (type) {
    case 0: return new NodePart(node, host);
    case 1: return new AttrPart(node, name, svg);
    case 2: return new EventPart(node, name);
    case 3: return new ClassPart(node);
    case 4: return new StylePart(node);
    case 5: return new RefPart(node);
    case 6: return new SpreadPart(node, svg);
    case 7: return new SlotPart(node, name, host);
    default: throw new Error(`stencilrs runtime: unknown part type ${type}`);
  }
};

/** A child hole: text, a template, a node, a list of those, or nothing. Content sits before the marker. */
class NodePart {
  constructor(marker, host) {
    this.m = marker;
    this.host = host;
    this.v = undefined;
    this.hel = null;
    this.inst = null;
    this.text = null;
    this.node = null;
    this.list = null;
  }
  clear() {
    if (this.inst) {
      if (this.inst.start.__lp !== undefined) for (const n of instNodes(this.inst, [])) drop(n);
      else removeRange(this.inst.start, this.inst.end);
      this.inst = null;
    } else if (this.text) {
      drop(this.text);
      this.text = null;
    } else if (this.node) {
      drop(this.node);
      this.node = null;
    } else if (this.list) {
      for (const e of this.list) removeEntry(e);
      this.list = null;
    } else if (this.hel) {
      drop(this.hel);
      this.hel = null;
    }
  }
  /** A vnode from `h()` called directly: one element, patched in place while the tag holds. */
  setH(v) {
    if (v.tag === Fragment) {
      if (!this.list) this.clear();
      this.setList(v.children);
      return;
    }
    if (!this.hel || this.htag !== v.tag) {
      this.clear();
      const parent = this.m.parentNode;
      const svg = v.tag === 'svg' || (!!parent && parent.namespaceURI === SVG_NS && parent.localName !== 'foreignObject');
      const adopt = adopting(this.host);
      const el = claim(this.host, v.tag, () => (svg ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag)));
      const marker = claim(this.host, 8, () => el.appendChild(document.createComment('')));
      this.hel = el;
      this.htag = v.tag;
      this.hprops = new SpreadPart(el, svg);
      this.hkids = new NodePart(marker, this.host);
      if (!adopt) place(el, this.m);
    }
    this.hprops.set(v.props);
    if (v.sc && !this.hel.classList.contains(v.sc)) this.hel.classList.add(v.sc);
    this.hkids.set(v.children);
  }
  set(v) {
    if (v === this.v && (v === null || typeof v !== 'object')) return;
    if (v == null || v === false || v === true) {
      this.clear();
    } else if (v.$h === 1) {
      this.setH(v);
    } else if (v.$t !== undefined) {
      if (this.inst && this.inst.tmpl === v.$t) {
        update(this.inst, v.v);
      } else {
        this.clear();
        const inst = instantiate(v.$t, this.host);
        update(inst, v.v);
        place(inst.frag, this.m);
        this.inst = inst;
      }
    } else if (Array.isArray(v)) {
      if (!this.list) this.clear();
      this.setList(v);
    } else if (v instanceof Node) {
      if (this.node !== v) {
        if (adopting(this.host)) throw MISMATCH; // a node from outside: the server's is another
        this.clear();
        place(v, this.m);
        this.node = v;
      }
    } else {
      const s = String(v);
      if (this.text) {
        if (this.text.data !== s) this.text.data = s;
      } else {
        this.clear();
        const adopt = adopting(this.host);
        this.text = claim(this.host, 3, () => document.createTextNode(s));
        if (!adopt) place(this.text, this.m);
        else if (this.text.data !== s) this.text.data = s;
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
        const start = claim(this.host, 3, () => document.createTextNode(''));
        next[i] = { k, start, part: new NodePart(claim(this.host, 8, () => document.createComment('')), this.host) };
        from[i] = -1;
      }
    }
    for (let j = 0; j < old.length; j++) if (!used[j]) removeEntry(old[j]);
    // Entries on the longest run that kept their relative order stay put; the rest move.
    const keep = lis(from);
    let ref = this.m;
    const adopt = adopting(this.host);
    for (let i = next.length - 1; i >= 0; i--) {
      const e = next[i];
      if (from[i] === -1) {
        if (!adopt) {
          place(e.start, ref);
          place(e.part.m, ref);
        }
      } else if (!keep[i]) {
        if (e.start.__lp !== undefined) for (const n of entryNodes(e, [])) place(n, ref);
        else moveRange(e.start, e.part.m, parent, ref);
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

/**
 * `<slot>` outside shadow DOM (scoped or no encapsulation): the host's own children for that
 * slot name are moved here on first render, as Stencil's slot relocation does; the fallback
 * content renders when there are none.
 */
class SlotPart {
  constructor(marker, name, host) {
    this.m = marker;
    this.name = name;
    this.host = host;
    this.fallback = new NodePart(marker, host);
    this.slotted = [];
    this.taken = false;
    this.fb = null;
    host?.__slotParts?.set(name, this);
  }
  set(fallback) {
    this.fb = fallback;
    if (!this.taken) {
      this.taken = true;
      const parent = this.m.parentNode;
      for (const n of this.host?.__slotted || []) {
        if (slotName(n) !== this.name) continue;
        unhide(n);
        // Hydrating, the server already put it here.
        if (!adopting(this.host) || n.parentNode !== parent) ins(parent, n, this.m);
        n.__slot = this;
        this.slotted.push(n);
      }
    }
    this.fallback.set(this.has() ? null : fallback);
  }
  /** A node the host routed here after the first render. */
  add(n) {
    this.slotted.push(n);
    if (this.fallback.v != null && real(n)) this.fallback.set(null);
  }
  has() {
    this.slotted = this.slotted.filter((n) => n.__slot === this);
    return this.slotted.some(real);
  }
}

const unhide = (n) => {
  if (n.__hid) {
    n.hidden = false;
    n.__hid = false;
  }
};

/** Slotted content that hides the fallback: an element or non-blank text. */
const real = (n) => n.nodeType === 1 || (n.nodeType === 3 && n.data.trim() !== '');
const slotName = (n) => (n.nodeType === 1 && n.getAttribute('slot')) || '';

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
          : k === 'key' || k === 'children' ? { set() {} }
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

// On the server a `<style>` in the shadow root serializes with it; adopted sheets would not.
const canAdopt = !SERVER && typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype && typeof ShadowRoot === 'function' && 'adoptedStyleSheets' in ShadowRoot.prototype;
const shadowStyle = (root, Cstr, style) => {
  if (canAdopt) root.adoptedStyleSheets = [sheetFor(Cstr, style)];
  else {
    const el = Object.assign(document.createElement('style'), { textContent: cssOf(style) });
    el.setAttribute('sty-id', Cstr.__meta.tag);
    root.prepend(el);
  }
};
/** Scoped and unencapsulated styles: once per document or shadow root the component is in. */
// Kept on the root (not in this module) so the server renderer can reset it between requests.
const injectStyle = (root, Cstr, style) => {
  const done = (root.__rsStyles ||= new Set());
  if (done.has(Cstr)) return;
  done.add(Cstr);
  const tag = Cstr.__meta.tag;
  const into = root.nodeType === 9 ? root.head : root;
  if (root.querySelector(`style[sty-id="${tag}"]`)) return; // server-rendered
  const el = Object.assign(document.createElement('style'), { textContent: cssOf(style) });
  el.setAttribute('sty-id', tag);
  into.prepend(el);
};

/** `rs t n=1.3,1.7 l=2 h` → { t: true, n: '1.3,1.7', l: '2', h: true } */
const tokens = (data) => {
  const o = {};
  for (const p of data.split(' ')) {
    const i = p.indexOf('=');
    if (i < 0) o[p] = true;
    else o[p.slice(0, i)] = p.slice(i + 1);
  }
  return o;
};

/**
 * Reads the hydration marks the server left for host `id` (see runtime-server.js): the claimed
 * nodes by number, and the host's logical children (`l=`), in document order. A `<!--rs t ...-->`
 * comment stands for the text node after it (an empty one is made when the text was empty) and
 * is removed, whichever host gets to it first.
 */
const scan = (root, id) => {
  const map = new Map();
  const logical = [];
  const pre = `${id}.`;
  const read = (n, tok) => {
    if (tok.n) for (const k of tok.n.split(',')) if (k.startsWith(pre)) map.set(+k.slice(pre.length), n);
    if (tok.l === id) logical.push(n);
  };
  const visit = (parent) => {
    for (let n = parent.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1) {
        const nn = n.getAttribute('rs-n');
        const l = n.getAttribute('rs-l');
        if (nn !== null || l !== null) read(n, { n: nn, l });
        visit(n);
      } else if (n.nodeType === 8 && n.data.startsWith('rs ')) {
        const tok = tokens(n.data);
        if (tok.t) {
          let text = n.nextSibling;
          if (!text || text.nodeType !== 3 || text.__rsTok !== undefined) text = ins(parent, document.createTextNode(''), n.nextSibling);
          text.__rsTok = tok;
          detach(n);
          n = text;
        }
        read(n, tok);
      } else if (n.nodeType === 3 && n.__rsTok) {
        read(n, n.__rsTok);
      }
    }
  };
  visit(root);
  return { map, logical };
};

/** After hydration: the host's own marks go. */
const unmark = (map, logical) => {
  for (const n of map.values()) if (n.nodeType === 1) n.removeAttribute('rs-n');
  for (const n of logical) {
    if (n.nodeType !== 1) continue;
    n.removeAttribute('rs-l');
    if (n.hasAttribute('rs-h')) {
      n.removeAttribute('rs-h');
      if (n.hidden) n.__hid = true;
    }
  }
};

/**
 * The fallback when the client's first render doesn't match the server's: render again from
 * scratch. A shadow host empties its declarative shadow root; a light-DOM host takes back its
 * logical children and drops the rest.
 */
const rehydrate = (host, shadow, id) => {
  if (shadow) {
    host.shadowRoot?.replaceChildren();
    return;
  }
  const { logical } = scan(host, id);
  for (const n of logical) {
    if (n.nodeType !== 1) continue;
    n.removeAttribute('rs-l');
    if (n.hasAttribute('rs-h')) {
      n.removeAttribute('rs-h');
      n.hidden = false;
    }
  }
  host.replaceChildren(...logical);
};

const HAS_LOADED = 1, QUEUED = 2, RENDERING = 4, CONNECTED_ONCE = 8, REFLECTING = 16, DIRTY = 32;

/** What every compiled component extends. */
export class Base extends HTMLElement {
  constructor() {
    super();
    this.__f = 0;
    this.__v = new Map();
    this.__root = null;
    this.__host = null;
    this.__seq = 0;
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
    track(this);
  }
  componentOnReady() {
    return this.__onReady;
  }
  /** A logical child, from another component's render or the page: into the slot it names. */
  __adopt(node, ref) {
    if (node.nodeType === 11) {
      for (const c of Array.from(node.childNodes)) this.__adopt(c, ref);
      return;
    }
    node.__lp = this;
    this.__slotted.add(node);
    const sp = this.__slotParts.get(slotName(node));
    if (sp === undefined || !this.contains(sp.m)) {
      this.__stash(node);
      return;
    }
    const parent = sp.m.parentNode;
    unhide(node);
    ins(parent, node, ref && ref.__slot === sp && ref.parentNode === parent ? ref : sp.m);
    node.__slot = sp;
    sp.add(node);
  }
  /**
   * A logical child with no slot rendered for it. As in Stencil, an element stays in the host,
   * hidden (so `el.querySelector('[slot=x]')` still finds it); text and comments leave.
   */
  __stash(n) {
    n.__slot = null;
    if (n.nodeType === 1) {
      if (!n.hidden) {
        n.hidden = true;
        n.__hid = true;
      }
      if (n.parentNode !== this) ins(this, n, this.firstChild);
    } else {
      detach(n);
    }
  }
  // Outside shadow DOM, children added after the first render go to their slot too.
  appendChild(n) {
    if (this.__slotParts === undefined) return super.appendChild(n);
    this.__adopt(n, null);
    return n;
  }
  insertBefore(n, ref) {
    if (this.__slotParts === undefined) return super.insertBefore(n, ref);
    this.__adopt(n, ref);
    return n;
  }
  append(...nodes) {
    if (this.__slotParts === undefined) return super.append(...nodes);
    for (const n of nodes) this.__adopt(typeof n === 'string' ? document.createTextNode(n) : n, null);
  }
  prepend(...nodes) {
    if (this.__slotParts === undefined) return super.prepend(...nodes);
    for (const n of nodes) this.__adopt(typeof n === 'string' ? document.createTextNode(n) : n, null);
  }
  removeChild(n) {
    if (this.__slotParts !== undefined && n.__lp === this) {
      drop(n);
      return n;
    }
    return super.removeChild(n);
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
    const ssr = SERVER ? null : this.getAttribute('s-rs');
    if (ssr !== null) {
      this.removeAttribute('s-rs');
      if (!this.__hydrate(ssr, meta)) rehydrate(this, !!meta.shadow, ssr);
    }
    if (this.__f & HAS_LOADED) {
      // hydrated in place
    } else if (meta.shadow) {
      const root = this.shadowRoot || this.attachShadow({ mode: 'open', delegatesFocus: !!meta.delegatesFocus });
      if (meta.style) shadowStyle(root, this.constructor, meta.style);
      this.__target = root;
    } else {
      if (meta.style) injectStyle(this.getRootNode(), this.constructor, meta.style);
      if (meta.scoped) this.classList.add(`sc-${meta.tag}-h`);
      // Slot relocation: the host's own children wait here until a <slot> part takes them.
      this.__slotted = new Set();
      this.__slotParts = new Map();
      for (const n of Array.from(this.childNodes)) {
        n.__lp = this;
        this.__slotted.add(n);
        this.__stash(n);
      }
      this.__target = this;
    }
    if (!(this.__f & HAS_LOADED)) {
      this.__f &= ~DIRTY;
      this.__render(true);
      this.__f |= HAS_LOADED;
    }
    // State set during the first render's lifecycle (componentDidRender, say) renders again.
    if (this.__f & DIRTY) this.__schedule();
    // As Stencil: a component finishes loading after the components it rendered.
    const pending = [];
    for (const el of this.__target.querySelectorAll('*')) if (el instanceof Base && !(el.__f & HAS_LOADED)) pending.push(el.__onReady);
    if (pending.length) await Promise.all(pending);
    this.classList.add('hydrated');
    try {
      this.componentDidLoad?.();
    } catch (e) {
      console.error(e);
    }
    this.__ready(this);
  }
  /** First render over server markup, keeping its nodes. False (and nothing kept) on a mismatch. */
  __hydrate(id, meta) {
    const shadow = !!meta.shadow;
    const root = shadow ? this.shadowRoot : this;
    if (!root || typeof this.render !== 'function') return false;
    const { map, logical } = scan(root, id);
    if (shadow) {
      if (meta.style && canAdopt) {
        shadowStyle(root, this.constructor, meta.style);
        for (const st of Array.from(root.children)) if (st.localName === 'style' && st.hasAttribute('sty-id')) detach(st);
      }
    } else {
      if (meta.style) injectStyle(this.getRootNode(), this.constructor, meta.style);
      this.__slotted = new Set();
      this.__slotParts = new Map();
      for (const n of logical) {
        n.__lp = this;
        this.__slotted.add(n);
      }
    }
    this.__target = root;
    this.__adoptMap = map;
    this.__seq = 0;
    this.__f &= ~DIRTY;
    try {
      this.__render(true);
    } catch (e) {
      if (e !== MISMATCH) console.error(e);
      this.__root = this.__host = this.__hostT = null;
      if (!shadow) {
        for (const n of logical) n.__lp = undefined;
        this.__slotted = this.__slotParts = undefined;
      }
      return false;
    } finally {
      this.__adoptMap = null;
    }
    unmark(map, logical);
    this.__f |= HAS_LOADED;
    return true;
  }
  __render(first) {
    if (typeof this.render !== 'function') return;
    this.__f |= RENDERING;
    try {
      this.componentWillRender?.();
      if (!first) this.componentWillUpdate?.();
      const out = this.render();
      if (!this.__root) {
        const adopt = adopting(this);
        const marker = claim(this, 8, () => document.createComment(''));
        if (!adopt) ins(this.__target, marker, null);
        this.__root = new NodePart(marker, this);
      }
      if (out != null && out.$t !== undefined && out.$t.host) {
        // `<Host>`: its attributes bind to this element, its children render inside.
        if (this.__hostT !== out.$t) {
          this.__hostT = out.$t;
          this.__host = out.$t.host.map(([type, name]) => makePart(type, this, name, false, this));
        }
        for (let i = 0; i < this.__host.length; i++) this.__host[i].set(out.v[i]);
        if (this.__root.inst && this.__root.inst.tmpl === out.$t) {
          update(this.__root.inst, out.v, this.__host.length);
        } else {
          this.__root.clear();
          const inst = instantiate(out.$t, this);
          update(inst, out.v, this.__host.length);
          ins(this.__root.m.parentNode, inst.frag, this.__root.m);
          this.__root.inst = inst;
          this.__root.v = out;
        }
      } else {
        this.__root.set(out);
      }
      // Logical children whose slot this render removed go back to the host, hidden.
      if (this.__slotted !== undefined && this.__slotted.size) {
        for (const n of this.__slotted) if (n.nodeType === 1 && !this.contains(n)) this.__stash(n);
      }
    } catch (e) {
      if (e === MISMATCH) throw e;
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
    if (!(this.__f & HAS_LOADED)) {
      this.__f |= DIRTY;
      return;
    }
    if (this.__f & QUEUED) return;
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

/** `<Host>` and `<Fragment>` for `h()` called directly; compiled JSX never reaches them. */
export const Host = { __host: true };
export const Fragment = (_props, children) => children;

/** Stencil's `h()`, for code that calls it directly: a vnode the node parts render. */
export function h(tag, props, ...children) {
  children = children.flat(Infinity);
  if (typeof tag === 'function' && tag !== Fragment) return fc(tag, props || {}, children);
  if (tag === Host) throw new Error('stencilrs runtime: h(Host) is not supported; use JSX');
  return { $h: 1, tag, props: props || {}, children, k: props?.key };
}

/** Stencil's functional component utilities, over the values children are here. */
const fcUtils = {
  forEach: (children, cb) => children.forEach((c, i, a) => cb(toChildNode(c), i, a)),
  map: (children, cb) => children.map((c, i, a) => fromChildNode(cb(toChildNode(c), i, a))),
};
const toChildNode = (c) =>
  c && c.$h === 1
    ? { vtag: c.tag, vkey: c.k, vattrs: c.props, vchildren: c.children, vtext: null, vname: c.props?.name }
    : typeof c === 'string' || typeof c === 'number'
      ? { vtag: null, vkey: undefined, vattrs: null, vchildren: null, vtext: String(c), vname: undefined, $c: c }
      : { vtag: null, vkey: c?.k, vattrs: null, vchildren: null, vtext: null, vname: undefined, $c: c };
const fromChildNode = (n) => (n && '$c' in n ? n.$c : n && n.vtag ? h(n.vtag, n.vattrs, ...(n.vchildren || [])) : n?.vtext ?? n);

/** A functional component call (`<Fn a={1}>…</Fn>`). */
export const fc = (fn, props, children, scope) => {
  if (typeof fn === 'string') {
    // `const Tag = 'a'; <Tag/>`: an element whose name is decided at render time.
    const v = h(fn, props, ...children);
    v.sc = scope;
    return v;
  }
  return fn(props, children, fcUtils);
};

/** Stencil's `Env` (the config's `env`); empty unless the app sets it. */
export const Env = {};
let modeResolver = null;
/** Stencil's `setMode` / `getMode`. */
export const setMode = (resolver) => (modeResolver = resolver);
export const getMode = (ref) => ref?.__mode ?? (ref ? (ref.__mode = modeResolver?.(ref)) : undefined);
let assetPath = '';
export const setAssetPath = (path) => (assetPath = path);
export const getRenderingRef = () => null;
/** Decorators exist as values only for code the compiler did not see; they do nothing. */
const noDecorator = () => () => {};
export { noDecorator as Component, noDecorator as Prop, noDecorator as State, noDecorator as Event, noDecorator as Method, noDecorator as Watch, noDecorator as Listen, noDecorator as Element, noDecorator as AttachInternals, noDecorator as PropSerialize, noDecorator as AttrDeserialize };

/** Stencil's `Mixin`: the factories applied right to left over the runtime's base class. */
export const Mixin = (...mixins) => mixins.reduceRight((acc, mixin) => mixin(acc), Base);

/** Stencil's `Build`, as the browser sees it. */
export const Build = { isBrowser: !SERVER, isServer: SERVER, isDev: false, isTesting: false };
/** Stencil's `getElement`: a component here is its element. */
export const getElement = (ref) => ref;
export const writeTask = (cb) => requestAnimationFrame(cb);
export const readTask = (cb) => requestAnimationFrame(cb);
export const getAssetPath = (path) => new URL(path, assetPath ? new URL(assetPath, document.baseURI) : document.baseURI).href;

/** Re-render a component (Stencil's `forceUpdate`). */
export const forceUpdate = (el) => el.__schedule?.();

/**
 * Register a compiled component. `meta.members` is `{ name: [flags, attribute?] }`, `watchers`
 * `{ name: [method...] }`, `listeners` `[[event, method, target?]]`.
 */
export const define = (Cstr, meta, register = true) => {
  const existing = register ? customElements.get(meta.tag) : undefined;
  if (existing && existing !== Cstr && existing.__meta) return hotSwap(existing, Cstr, meta);
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
        } else if (this.__f & CONNECTED_ONCE) {
          this.__f |= DIRTY; // during the first render's lifecycle: render again once loaded
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
  if (register && !existing) customElements.define(meta.tag, Cstr);
};

/** Live instances per tag, for hot reload. */
const live = new Map();
const track = (el) => {
  const tag = el.constructor.__meta?.tag;
  if (!tag) return;
  let set = live.get(tag);
  if (!set) live.set(tag, (set = new Set()));
  set.add(new WeakRef(el));
};

/**
 * Hot reload: a custom element can't be defined twice, so the new class's methods, accessors
 * and metadata move onto the registered one and every live instance renders again.
 */
const hotSwap = (Old, New, meta) => {
  define(New, meta, false); // accessors and callbacks on New, not registered
  for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(New.prototype))) {
    if (k !== 'constructor') Object.defineProperty(Old.prototype, k, d);
  }
  const m = New.__meta;
  Object.assign(Old.__meta, m);
  sheets.delete(Old);
  for (const ref of live.get(meta.tag) || []) {
    const el = ref.deref();
    if (el?.isConnected && el.__f & HAS_LOADED) {
      el.__hostT = null;
      el.__render(false);
    }
  }
};

/** Stencil's `createEvent`: `this.changed.emit(detail)`. */
export const createEvent = (el, name, flags) => ({
  emit: (detail) => {
    const ev = new CustomEvent(name, { bubbles: !!(flags & 4), composed: !!(flags & 2), cancelable: !!(flags & 1), detail });
    el.dispatchEvent(ev);
    return ev;
  },
});
