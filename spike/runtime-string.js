// SPIKE: a DOM-free server renderer for the stencilrs runtime.
//
// The compiled components import their runtime (`@stencil/core`); for a server bundle built with
// spike/vite.string.config.ts that import resolves to THIS file instead of runtime.js. It exports the
// same surface the compiled code uses (`template`, `t`, `Base`, `define`, ...), but a component is a
// plain object and a render is a walk over the compiled template that splices part values into a
// string. It emits the same hydration marks as runtime-server.js (`r:n`, `<!--^n-->`, `s-rs`, `~`
// list skips, the state script, the event catcher), in the same claim order, so the client
// hydrates the result unchanged.
//
// Anything it does not model throws `Fallback` (a <slot> part, refs, spreads, h() vnodes, svg,
// async componentWillLoad, state changes after load, DOM access in a lifecycle hook...). The caller
// then renders that page with the happy-dom renderer instead (see createStringRenderer).
import { ELEMENT_ON, WINDOW_ON } from './dom-events.generated.js';

export class Fallback extends Error {}
const fallback = (why) => {
  throw new Fallback(why);
};

// ---------------------------------------------------------------------------------------------
// The surface compiled components use

export const template = (html, parts, svg = false, host = null) => ({ html, parts, svg, host, s: null });
export const t = (tmpl, v, k) => ({ $t: tmpl, v, k });

const PROP = 1, STATE = 2;
const T_STRING = 64, T_NUMBER = 128, T_BOOLEAN = 256;
const REFLECT = 32;
const CONNECTED_ONCE = 8, HAS_LOADED = 1, DIRTY = 32;

const parseProp = (v, flags) => {
  if (v == null || (v !== null && typeof v === 'object') || typeof v === 'function') return v;
  if (flags & T_BOOLEAN) return v === 'false' ? false : v === '' || !!v;
  if (flags & T_NUMBER) return typeof v === 'number' ? v : parseFloat(v);
  if (flags & T_STRING) return String(v);
  return v;
};

/** What every compiled component extends: no DOM, only the members and lifecycle bookkeeping. */
export class Base {
  constructor() {
    this.__f = 0;
    this.__v = new Map();
    this.__seq = 0; // claim counter (see claim in runtime.js)
    this.__live = 0;
    this.__rc = 0;
    this.__evs = null;
    this.__ops = null; // attribute changes of the host element, in order
    this.__ls = null; // listeners an `onFoo` part put on this element
  }
  // Components that listen to or emit events work as long as the listener is on the element itself.
  addEventListener(type, fn) {
    ((this.__ls ||= {})[type] ||= []).push(fn);
  }
  removeEventListener() {}
  dispatchEvent(ev) {
    for (const fn of (this.__ls && this.__ls[ev.type]) || []) fn(ev);
    return true;
  }
  componentOnReady() {
    return Promise.resolve(this);
  }
}

export const Host = { __host: true };
export const Fragment = (_props, children) => children;
export const h = () => fallback('h() vnode');
export const fc = (fn, props, children) => (typeof fn === 'string' ? fallback('dynamic tag') : fn(props, children, fcUtils));
const fcUtils = { forEach: () => fallback('functional utils'), map: () => fallback('functional utils') };
export const Env = {};
export const setMode = () => {};
export const getMode = () => undefined;
export const setAssetPath = () => {};
export const getRenderingRef = () => null;
export const getElement = (ref) => ref;
export const writeTask = (cb) => cb();
export const readTask = (cb) => cb();
export const getAssetPath = (p) => p;
export const forceUpdate = () => {};
export const Build = { isBrowser: false, isServer: true, isDev: false, isTesting: false };
export const Mixin = (...mixins) => mixins.reduceRight((acc, mixin) => mixin(acc), Base);
const noDecorator = () => () => {};
export { noDecorator as Component, noDecorator as Prop, noDecorator as State, noDecorator as Event, noDecorator as Method, noDecorator as Watch, noDecorator as Listen, noDecorator as Element, noDecorator as AttachInternals, noDecorator as PropSerialize, noDecorator as AttrDeserialize };
export const createEvent = (el, name, flags) => ({
  emit: (detail) => {
    const ev = { type: name, detail, bubbles: !!(flags & 4), composed: !!(flags & 2), cancelable: !!(flags & 1), target: el, currentTarget: el, preventDefault() {}, stopPropagation() {} };
    el.dispatchEvent(ev);
    return ev;
  },
});

const tags = new Map(); // tag -> class
const cssOf = (style) => (Array.isArray(style) ? style.map(cssOf).join('') : typeof style === 'function' ? style() : style) || '';

export const define = (Cstr, meta, register = true) => {
  meta.listeners ||= [];
  meta.names = Object.keys(meta.members);
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
    if (value == null || value === false) el.__ops.push(['r', attr]);
    else el.__ops.push(['a', attr, String(value === true ? '' : typeof value === 'object' ? JSON.stringify(value) : value)]);
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
        if (!(this.__f & CONNECTED_ONCE)) {
          this.__v.set(name, value);
          return;
        }
        const old = this.__v.get(name);
        if (old === value || (Number.isNaN(old) && Number.isNaN(value))) return;
        // A change once the component rendered would render it again: that is the DOM renderer's job.
        if (this.__f & HAS_LOADED || this.__f & RENDERED) fallback('state or prop changed after the first render');
        this.__v.set(name, value);
        if (reflects) reflect(this, name, value);
        this.__f |= DIRTY;
        void watchers;
      },
    });
  }
  for (const [cb, own] of [['connectedCallback', '__connected'], ['disconnectedCallback', '__disconnected']]) {
    if (Object.prototype.hasOwnProperty.call(proto, cb)) {
      Object.defineProperty(proto, own, { value: proto[cb], configurable: true });
      delete proto[cb];
    }
  }
  Object.defineProperty(Cstr, '__meta', { value: meta });
  if (register) tags.set(meta.tag, Cstr);
};
const RENDERED = 1 << 10;

// ---------------------------------------------------------------------------------------------
// Template compiler: the html string -> a program of static strings and ops, once per template

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['style', 'script']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const decode = (s) =>
  s.indexOf('&') < 0
    ? s
    : s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (_, e) => {
        if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1));
        return ENT[e] ?? fallback(`html entity &${e};`);
      });
// The control characters U+0001..3 are the renderer's own placeholders: data can't carry them.
const CTL = /[\u0001-\u0003]/g;
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(CTL, '\ufffd');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(CTL, '\ufffd');
const attrStr = (attrs) => {
  let s = '';
  for (const [n, v] of attrs) s += v === '' ? ` ${n}` : ` ${n}="${escAttr(v)}"`;
  return s;
};

/** html -> tree of { t: 'e' | 't' | 'c', ... }. The compiler's output is well formed; nothing else is parsed. */
const parse = (html) => {
  const root = [];
  const stack = [root];
  const n = html.length;
  let i = 0;
  while (i < n) {
    if (html.charCodeAt(i) !== 60) {
      let j = html.indexOf('<', i);
      if (j < 0) j = n;
      stack[stack.length - 1].push({ t: 't', data: decode(html.slice(i, j)) });
      i = j;
    } else if (html.startsWith('<!--', i)) {
      const j = html.indexOf('-->', i + 4);
      stack[stack.length - 1].push({ t: 'c', data: html.slice(i + 4, j) });
      i = j + 3;
    } else if (html.charCodeAt(i + 1) === 47) {
      stack.pop();
      i = html.indexOf('>', i) + 1;
    } else {
      let j = i + 1;
      while (j < n && !/[\s/>]/.test(html[j])) j++;
      const tag = html.slice(i + 1, j).toLowerCase();
      const attrs = [];
      let rs = false;
      for (;;) {
        while (/\s/.test(html[j])) j++;
        if (html[j] === '>') {
          j++;
          break;
        }
        if (html[j] === '/') {
          j++;
          continue;
        }
        let k = j;
        while (k < n && !/[\s=/>]/.test(html[k])) k++;
        const name = html.slice(j, k).toLowerCase();
        j = k;
        let value = '';
        if (html[j] === '=') {
          j++;
          if (html[j] === '"' || html[j] === "'") {
            const q = html[j];
            k = html.indexOf(q, j + 1);
            value = html.slice(j + 1, k);
            j = k + 1;
          } else {
            k = j;
            while (k < n && !/[\s>]/.test(html[k])) k++;
            value = html.slice(j, k);
            j = k;
          }
        }
        if (name === 'rs') rs = true;
        else attrs.push([name, decode(value)]);
      }
      if (tag === 'svg' || tag === 'math' || tag === 'template' || tag === 'textarea' || tag === 'select' || tag === 'table') fallback(`<${tag}> in a template`);
      const el = { t: 'e', tag, attrs, rs, kids: [] };
      stack[stack.length - 1].push(el);
      if (RAW.has(tag)) {
        const close = html.indexOf(`</${tag}`, j);
        if (close > j) el.kids.push({ t: 't', data: html.slice(j, close), raw: true });
        j = html.indexOf('>', close) + 1;
      } else if (!VOID.has(tag)) {
        stack.push(el.kids);
      }
      i = j;
    }
  }
  return root;
};

// Op codes of a compiled program
const OPEN = 1, PART = 2, MARK = 3, TEXT = 4;

/**
 * { prog, T (top-level nodes), M (marked nodes), live, partM[i] (marked index of part i),
 *   partTop[i], cmp[m] (marked element m is a component) }
 */
const compile = (tmpl) => {
  if (tmpl.svg) fallback('svg template');
  const tree = parse(tmpl.html);
  // marked nodes in document order (elements and comments, as the runtime's TreeWalker 129)
  let M = 0;
  const number = (nodes) => {
    for (const nd of nodes) {
      if (nd.t === 'e') {
        if (nd.rs) nd.m = M++;
        number(nd.kids);
      } else if (nd.t === 'c' && nd.data === 'rs') nd.m = M++;
    }
  };
  number(tree);
  const prog = [];
  let buf = '';
  const flush = () => {
    if (buf) prog.push(buf), (buf = '');
  };
  const partOf = new Map(); // marked index -> part indexes
  tmpl.parts.forEach(([m], i) => (partOf.get(m) || partOf.set(m, []).get(m)).push(i));
  const cmpFlags = [];
  const top = new Set(tree);
  const topIdx = new Map(tree.map((nd, i) => [nd, i]));
  const partTop = [];
  const emit = (nd, parentRaw) => {
    const ti = topIdx.has(nd) ? topIdx.get(nd) : -1;
    if (nd.t === 't') {
      if (ti >= 0) {
        flush();
        prog.push({ k: TEXT, data: nd.data, top: ti });
      } else buf += parentRaw ? nd.data : escText(nd.data);
    } else if (nd.t === 'c') {
      if (nd.m !== undefined) {
        flush();
        for (const pi of partOf.get(nd.m) || []) {
          prog.push({ k: PART, i: pi });
          partTop[pi] = ti >= 0;
        }
        prog.push({ k: MARK, m: nd.m, top: ti });
      } else if (ti >= 0) {
        flush();
        prog.push({ k: MARK, m: -1, top: ti });
      } else if (nd.data !== '') buf += `<!--${nd.data}-->`;
    } else {
      const cmp = tags.has(nd.tag);
      const dynamic = nd.m !== undefined || ti >= 0 || cmp;
      if (nd.m !== undefined) cmpFlags[nd.m] = cmp ? nd.tag : null;
      if (!dynamic) {
        buf += `<${nd.tag}${attrStr(nd.attrs)}>`;
      } else {
        flush();
        if (cmp && nd.kids.length && !tags.get(nd.tag).__meta.shadow) fallback('light children inside a light-DOM component (slot relocation)');
        prog.push({ k: OPEN, tag: nd.tag, attrs: nd.attrs, m: nd.m === undefined ? -1 : nd.m, top: ti, cmp, str: `<${nd.tag}${attrStr(nd.attrs)}` });
      }
      if (!VOID.has(nd.tag)) {
        for (const kid of nd.kids) emit(kid, RAW.has(nd.tag));
        buf += `</${nd.tag}>`;
      }
    }
  };
  for (const nd of tree) emit(nd, false);
  flush();
  for (const [, type] of tmpl.parts) if (type === 5 || type === 6 || type === 7) fallback(`part type ${type} (ref, spread or slot)`);
  return {
    prog,
    T: tree.length,
    M,
    live: tmpl.parts.some(([, type]) => type === 2 || type >= 5),
    cmp: cmpFlags,
    partTop,
    hasDyn: tmpl.parts.some(([, type]) => type !== 0),
  };
};

// ---------------------------------------------------------------------------------------------
// Rendering

/** Per render: the hosts in the order they were opened, the style tags, the stateless counter. */
let RC = null;
let CNT = 0; // nodes the last rendered value parses to (see serializeKids in runtime-server.js)

const marksOf = (base, T, top, m) => (top >= 0 ? (m >= 0 ? `${base + top},${base + T + m}` : `${base + top}`) : `${base + T + m}`);

const eventType = (name) => {
  const lower = name.toLowerCase();
  if (name[2] === '-') return name.slice(3);
  if (WINDOW_ON.has(lower)) return lower.slice(2);
  return name[2].toLowerCase() + name.slice(3);
};

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

const kebab = (k) => (k.includes('-') ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
const styleText = (v) => {
  if (typeof v === 'string') {
    const out = [];
    for (const d of v.split(';')) {
      const i = d.indexOf(':');
      if (i > 0 && d.slice(i + 1).trim()) out.push(`${d.slice(0, i).trim()}: ${d.slice(i + 1).trim()};`);
    }
    return out.join(' ');
  }
  const out = [];
  for (const k in v || {}) if (v[k] !== '' && v[k] != null) out.push(`${kebab(k)}: ${v[k]};`);
  return out.join(' ');
};

/** Applies an element's attribute changes, in order, to its static attributes. */
const applyOps = (attrs, ops) => {
  const list = attrs.map((a) => [a[0], a[1]]);
  for (const op of ops) {
    const i = list.findIndex((a) => a[0] === (op[0] === 'c' ? 'class' : op[1]));
    if (op[0] === 'r') {
      if (i >= 0) list.splice(i, 1);
    } else if (op[0] === 'a') {
      if (i >= 0) list[i][1] = op[2];
      else list.push([op[1], op[2]]);
    } else if (op[0] === 'c') {
      // classList.add
      if (i < 0) list.push(['class', op[1]]);
      else if (!list[i][1].split(/\s+/).includes(op[1])) list[i][1] = list[i][1] ? `${list[i][1]} ${op[1]}` : op[1];
    }
  }
  return list;
};

// IDL attributes that reflect to a same-named content attribute on a plain element.
const REFLECTED = new Set(['id', 'title', 'href', 'src', 'alt', 'placeholder', 'name', 'lang', 'dir', 'role', 'target', 'rel', 'width', 'height', 'disabled', 'hidden']);

/** An `AttrPart` value for the element of marked node `m`. */
const setAttr = (state, m, name, v, H) => {
  const complex = v != null && (typeof v === 'object' || typeof v === 'function');
  if (complex) H.__live++;
  const inst = state.insts[m];
  if (inst) {
    const members = inst.constructor.__meta.members;
    if (name in members) {
      inst[name] = v;
      return;
    }
    if (complex) fallback(`object value for ${name} on <${inst.constructor.__meta.tag}>`);
  } else if (complex) fallback(`object value for ${name} on a native element`);
  else if (!REFLECTED.has(name) && /^(value|checked|selected|innerHTML|textContent|className|innerText|scrollTop|scrollLeft|indeterminate|files)$/.test(name)) fallback(`property-only attribute ${name}`);
  const ops = (state.ops[m] ||= []);
  if (v == null || v === false) ops.push(['r', name]);
  else ops.push(['a', name, v === true ? '' : String(v)]);
};

const stateOps = (state, m) => (state.ops[m] ||= []);

const instantiate = (tmpl, vals, H, offset) => {
  const s = tmpl.s || (tmpl.s = compile(tmpl));
  const parts = tmpl.parts;
  const base = H ? H.__seq : 0;
  if (H) {
    H.__seq += s.T + s.M;
    if (s.live) H.__live++;
  }
  const state = { insts: s.M && s.cmp.some(Boolean) ? [] : NONE, ops: [], rse: [] };
  if (state.insts !== NONE) for (let m = 0; m < s.M; m++) if (s.cmp[m]) state.insts[m] = newInstance(s.cmp[m]);
  const ph = parts.length ? new Array(parts.length) : null;
  const pc = parts.length ? new Array(parts.length) : null;
  for (let i = 0; i < parts.length; i++) {
    const [m, type, name] = parts[i];
    const v = vals[i + offset];
    if (v !== null && typeof v === 'object' && typeof v.peek === 'function' && typeof v.subscribe === 'function') fallback('signal bound to a part');
    switch (type) {
      case 0:
        ph[i] = renderValue(v, H);
        pc[i] = CNT;
        break;
      case 1:
        if (v !== undefined) setAttr(state, m, name, v, H);
        break;
      case 2: {
        const type = eventType(name);
        (H.__evs ||= new Set()).add(type);
        (state.rse[m] ||= []).includes(type) || state.rse[m].push(type);
        if (state.insts[m]) state.insts[m].addEventListener(type, v);
        break;
      }
      case 3: {
        for (const c of classSet(v)) stateOps(state, m).push(['c', c]);
        break;
      }
      case 4:
        if (v != null && v !== '') stateOps(state, m).push(['a', 'style', styleText(v)]);
        break;
      default:
        fallback(`part type ${type}`);
    }
  }
  // assemble
  let out = '';
  let cnt = 0;
  const prog = s.prog;
  for (let p = 0; p < prog.length; p++) {
    const op = prog[p];
    if (typeof op === 'string') {
      out += op;
      continue;
    }
    switch (op.k) {
      case OPEN: {
        const ops = op.m >= 0 ? state.ops[op.m] : undefined;
        const inst = op.m >= 0 ? state.insts[op.m] : op.cmp ? newInstance(op.tag) : undefined;
        let res = null;
        if (op.cmp) {
          // static attributes of a component element are its observed attributes
          const meta = inst.constructor.__meta;
          for (const [a, val] of op.attrs) {
            const nm = meta.attrs[a];
            if (nm !== undefined) {
              const des = meta.deserializers[nm];
              inst[nm] = des ? inst[des[0]](val, nm) : val;
            }
          }
          res = renderComponent(inst, RC.root, base, op);
        }
        let str;
        if (!ops && !(res && res.ops.length)) str = op.str;
        else if (res && !ops && !op.attrs.length && res.classOnly) str = `<${op.tag} class="${res.classOnly}"`;
        else str = `<${op.tag}${attrStr(applyOps(op.attrs, res ? (ops ? ops.concat(res.ops) : res.ops) : ops))}`;
        if (H && (op.top >= 0 || op.m >= 0)) str += ` r:n="${marksOf(base, s.T, op.top, op.m)}"`;
        if (res) str += ` \u0001${res.idx}\u0002`;
        if (op.m >= 0 && state.rse[op.m]) str += ` r:e="${state.rse[op.m].join(',')}"`;
        out += str + '>';
        if (res) out += res.inner;
        if (op.top >= 0) cnt++;
        break;
      }
      case PART:
        out += ph[op.i];
        if (s.partTop[op.i]) cnt += pc[op.i];
        break;
      case MARK:
        out += H ? `<!--^${marksOf(base, s.T, op.top, op.m)}-->` : '';
        if (op.top >= 0) cnt++;
        break;
      case TEXT:
        out += (H ? `<!--^t${base + op.top}-->` : '') + escText(op.data);
        cnt += H ? (op.data === '' ? 1 : 2) : op.data === '' ? 0 : 1;
        break;
    }
  }
  CNT = cnt;
  return out;
};
const NONE = [];

const newInstance = (tag) => new (tags.get(tag))();

/** What `NodePart.set` renders for a value, as a string (the content that sits before the part's marker). */
const renderValue = (v, H) => {
  if (v == null || v === false || v === true) {
    CNT = 0;
    return '';
  }
  if (v.$h === 1) fallback('h() vnode');
  if (v.$t !== undefined) return instantiate(v.$t, v.v, H, 0);
  if (Array.isArray(v)) return renderList(v, H);
  const s = String(v);
  // text: its own claim, and a `<!--^t<n>-->` mark before it
  const n = H ? H.__seq++ : 0;
  CNT = s === '' ? 1 : 2;
  return `<!--^t${n}-->${escText(s)}`;
};

/** `setList` on a first render: every entry claims a start text and a marker, then entries render last to first. */
const renderList = (items, H) => {
  const len = items.length;
  if (!len) {
    CNT = 0;
    return '';
  }
  const live = H.__live;
  const stateless = RC.stateless;
  const starts = new Array(len);
  const marks = new Array(len);
  for (let i = 0; i < len; i++) {
    starts[i] = H.__seq++;
    marks[i] = H.__seq++;
  }
  const bodies = new Array(len);
  const counts = new Array(len);
  for (let i = len - 1; i >= 0; i--) {
    bodies[i] = renderValue(items[i], H);
    counts[i] = CNT;
  }
  const skip = H.__live === live && RC.resumable && RC.stateless === stateless && H.__rc === 1;
  let total = 0;
  for (let i = 0; i < len; i++) total += counts[i] + 2;
  // `~<last claim>:<nodes>` on the first start mark: the client steps over a list nothing in it has to run.
  // (The marker must be the next mark of the host after the list's claims; see scan in runtime.js.)
  let out = '';
  for (let i = 0; i < len; i++) out += `<!--^t${starts[i]}${i === 0 && skip ? `~${H.__seq - 1}:${total}` : ''}-->${bodies[i]}<!--^${marks[i]}-->`;
  CNT = total;
  return out;
};

// ---------------------------------------------------------------------------------------------
// Components

const fresh = new Map();
const plain = (v) => {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(plain);
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.values(v).every(plain);
  return false;
};
/** The members that differ from a fresh instance's (undefined when none); null when they can't go through JSON. */
const stateEntry = (host) => {
  const C = host.constructor;
  let def = fresh.get(C);
  if (!def) fresh.set(C, (def = new C()));
  const s = {};
  let any = false;
  for (const name of Object.keys(C.__meta.members)) {
    const v = host.__v.get(name);
    const d = def.__v.get(name);
    if (v === d || (v === undefined && d === undefined)) continue;
    if (typeof v === 'object' && v !== null) {
      if (!plain(v)) return null;
      if (JSON.stringify(v) === JSON.stringify(d)) continue;
    } else if (!plain(v)) return null;
    s[name] = v;
    any = true;
  }
  return any ? s : undefined;
};

const guard = (fn, what) => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof Fallback) throw e;
    // A lifecycle hook that reaches for the DOM (or fails): the DOM renderer will say what happens.
    throw new Fallback(`${what} threw ${e && e.constructor && e.constructor.name}: ${e && e.message}`);
  }
};

/** connectedCallback + __load + __render of runtime.js, for a first server render. */
const renderComponent = (host, root) => {
  const C = host.constructor;
  const meta = C.__meta;
  host.__ops = [];
  host.__f |= CONNECTED_ONCE;
  meta.reflectAll(host);
  if (host.__connected) guard(() => host.__connected(), 'connectedCallback');
  if (host.componentWillLoad) {
    const will = guard(() => host.componentWillLoad(), 'componentWillLoad');
    if (will && typeof will.then === 'function') fallback('async componentWillLoad');
  }
  let styles = '';
  const shadow = !!meta.shadow;
  let rc = root;
  if (shadow) {
    rc = { styles: [], done: new Set() };
    if (meta.style) rc.styles.push(`<style sty-id="${meta.tag}">${cssOf(meta.style)}</style>`);
  } else {
    if (meta.style && !root.done.has(C)) {
      root.done.add(C);
      root.styles.unshift(`<style sty-id="${meta.tag}">${cssOf(meta.style)}</style>`);
    }
    if (meta.scoped) host.__ops.push(['c', `sc-${meta.tag}-h`]);
  }
  host.__f &= ~DIRTY;
  // render
  host.__rc++;
  const outer = RC.root;
  RC.root = rc;
  let content = '';
  try {
    if (typeof host.render === 'function') {
      guard(() => host.componentWillRender?.(), 'componentWillRender');
      const out = guard(() => host.render(), 'render');
      host.__seq = 0;
      host.__seq++; // the root marker: claim 0
      if (out != null && out.$t !== undefined && out.$t.host) {
        const hostParts = out.$t.host;
        for (let i = 0; i < hostParts.length; i++) {
          const [type, name] = hostParts[i];
          const v = out.v[i];
          if (type === 1) {
            if (v == null || v === false) host.__ops.push(['r', name]);
            else if (name in meta.members) host[name] = v;
            else host.__ops.push(['a', name, v === true ? '' : String(v)]);
          } else if (type === 3) for (const c of classSet(v)) host.__ops.push(['c', c]);
          else if (type === 4) {
            if (v != null && v !== '') host.__ops.push(['a', 'style', styleText(v)]);
          } else fallback(`<Host> part type ${type}`);
        }
        content = instantiate(out.$t, out.v, host, hostParts.length);
      } else {
        content = renderValue(out, host);
      }
      content += '<!--^0-->';
      guard(() => host.componentDidRender?.(), 'componentDidRender');
    }
  } finally {
    RC.root = outer;
  }
  if (host.__f & DIRTY) fallback('state changed during the first render');
  host.__f |= RENDERED;
  host.__ops.push(['c', 'hydrated']);
  if (host.componentDidLoad) guard(() => host.componentDidLoad(), 'componentDidLoad');
  host.__f |= HAS_LOADED;
  // For the state script and the list skips, which only look at the component's final state.
  const entry = RC.resume ? stateEntry(host) : undefined;
  host.__entry = entry;
  if (entry === null) RC.stateless++;
  if (shadow) {
    styles = rc.styles.join('');
    content = `<template shadowrootmode="open"${meta.delegatesFocus ? ' shadowrootdelegatesfocus' : ''}>${styles}${content}</template>`;
  }
  const idx = RC.hosts.push(host) - 1;
  // Usual case (a scoped component): the host's only attribute is its class list.
  let classOnly = null;
  for (const op of host.__ops) {
    if (op[0] !== 'c') {
      classOnly = null;
      break;
    }
    classOnly = classOnly === null ? op[1] : classOnly.split(' ').includes(op[1]) ? classOnly : `${classOnly} ${op[1]}`;
  }
  return { inner: content, ops: host.__ops, idx, classOnly };
};

// ---------------------------------------------------------------------------------------------
// The renderer

const DELEGATED = new Set(['click', 'dblclick', 'auxclick', 'contextmenu', 'input', 'change', 'beforeinput', 'submit', 'reset', 'keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'pointerover', 'pointerenter', 'pointerleave', 'pointerout', 'mousedown', 'mouseup', 'mouseover', 'mouseenter', 'mouseleave', 'mouseout', 'touchstart', 'touchend', 'focus', 'blur', 'focusin', 'focusout', 'paste', 'copy', 'cut', 'dragstart', 'drop']);

const pageCache = new Map();

/**
 * `createStringRenderer(load, { resumable, fallback })`: `load` imports the server bundle built for
 * this runtime. `render(html)` returns the same string as runtime-server.js's renderer, or, when the page
 * uses something this renderer does not model, whatever `fallback(html)` returns (`render.fallbacks` counts).
 */
export async function createStringRenderer(load, { resumable = true, fallback: onFallback = null } = {}) {
  await load();
  const run = (html, resume) => {
    let tmpl = pageCache.get(html);
    if (!tmpl) pageCache.set(html, (tmpl = template(html, [])));
    RC = { hosts: [], stateless: 0, resume, resumable: resume, root: { styles: [], done: new Set() } };
    const page = RC;
    let body;
    try {
      body = instantiate(tmpl, [], null, 0);
    } finally {
      RC = null;
    }
    const state = resume ? {} : null;
    const types = new Set();
    let next = 0;
    // Each host's `s-rs` placeholder, in document order (this is where the ids come from).
    const pieces = body.split('\u0001');
    for (let k = 1; k < pieces.length; k++) {
      const seg = pieces[k];
      const j = seg.indexOf('\u0002');
      const host = page.hosts[+seg.slice(0, j)];
      const id = ++next;
      let now = false;
      if (state) {
        const entry = host.__entry;
        for (const type of host.__evs || []) {
          if (DELEGATED.has(type)) types.add(type);
          else if (ELEMENT_ON.has(`on${type}`)) now = true;
        }
        if (entry === null) now = true;
        else if (entry) state[id] = entry;
      }
      pieces[k] = `s-rs="${id}"${now ? ' s-rh' : ''}${seg.slice(j + 1)}`;
    }
    body = pieces.join('');
    let out = page.root.styles.join('') + body;
    if (state) {
      const e = [...types].join(',');
      out += `<script type="rs/state" e="${e}">${JSON.stringify(state).replace(/</g, '\\u003c')}</script>`;
      if (e) out += `<script>(d=>{const q=[],t="${e}".split(","),f=e=>q.push([e,e.composedPath()]);for(const k of t)d.addEventListener(k,f,!0);d.__rsq={q,off(){for(const k of t)d.removeEventListener(k,f,!0)}};d.dispatchEvent(new Event("rsinit"))})(document)</script>`;
    }
    return out;
  };
  const render = async (html, { resumable: resume = resumable } = {}) => {
    try {
      return run(html, resume);
    } catch (e) {
      if (!(e instanceof Fallback) || !onFallback) throw e;
      render.fallbacks++;
      render.lastFallback = e.message;
      return onFallback(html, { resumable: resume });
    }
  };
  render.fallbacks = 0;
  render.lastFallback = null;
  render.sync = (html, opts = {}) => run(html, opts.resumable ?? resumable);
  return render;
}
