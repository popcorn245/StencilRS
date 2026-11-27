// The DOM-free server renderer for the stencilrs runtime (docs/runtime.md, "Server rendering").
//
// Compiled components import their runtime (`@popcorn245/stencilrs/runtime`); a server bundle built with
// `stencilrs({ runtime: 'stencilrs', stringRenderer: true })` also gets a variant whose import resolves to THIS file
// (`@popcorn245/stencilrs/runtime/string`). It exports the same surface the compiled code uses (`template`, `t`,
// `Base`, `define`, ...), but a component is a plain object, not an element, and a render is a walk over the
// compiled templates that splices part values into a string. Its output is byte-identical to the happy-dom
// renderer's (runtime-server.js): the same hydration marks (`r:n`, `<!--^n-->`, `s-rs`, the `~` list skips, the
// state script, the event catcher) in the same claim order, so the client hydrates and resumes it unchanged.
//
// Whatever it does not model throws `Fallback` (see `createRenderer(load, { renderer: 'string' })` in
// runtime-server.js, which renders that page with happy-dom instead). It must never produce HTML that differs from
// the happy-dom renderer's, so anything it cannot reproduce exactly is a fallback:
//   - a `<slot>` outside shadow DOM (slot relocation), light children inside a light-DOM component,
//   - an async hook, a timer or microtask started by a hook, state or props changed after the first render,
//   - signals, `h()` vnodes, dynamic tags, `<table>`, `<select>`, `<textarea>`, `<template>`, `<math>`, and
//     elements and properties whose DOM behaviour is not reproduced (`runtime-string-dom.js` lists the DOM),
//   - a hook that touches the DOM, however it does so: while a page renders, every DOM global (`window`,
//     `document`, `HTMLElement`, ...) is an accessor that falls back, and so is any element member read from a
//     component (`this.el.classList`),
//   - an event that bubbles to a listener other than the emitting element's own.
//
// The data this file needs about the DOM (event names, which attributes are properties) is generated from
// happy-dom: `node scripts/gen-string-dom.mjs`.
import { DOM_GLOBALS, ELEMENT_METHODS, ENTITIES, ELEMENT_ON, ELEMENT_PROPS, TAG_PROPS, WINDOW_ON } from './runtime-string-dom.js';

/** Thrown for anything this renderer does not model; the page is then rendered by the happy-dom renderer. */
export class Fallback extends Error {
  constructor(why) {
    super(why);
    this.name = 'Fallback';
  }
}
// The first reason of the current render. User code may catch the exception below; the render still falls back.
let FELL = null;
const fallback = (why) => {
  if (FELL === null) FELL = why;
  throw new Fallback(why);
};

// ---------------------------------------------------------------------------------------------
// The surface compiled components use

export const template = (html, parts, svg = false, host = null) => ({ html, parts, svg, host, s: null });
export const t = (tmpl, v, k) => ({ $t: tmpl, v, k });

const PROP = 1;
const T_BOOLEAN = 256, T_NUMBER = 128, T_STRING = 64;
const REFLECT = 32;
const HAS_LOADED = 1, CONNECTED_ONCE = 8, DIRTY = 32, RENDERED = 1 << 10;

const parseProp = (v, flags) => {
  if (v == null || (v !== null && typeof v === 'object') || typeof v === 'function') return v;
  if (flags & T_BOOLEAN) return v === 'false' ? false : v === '' || !!v;
  if (flags & T_NUMBER) return typeof v === 'number' ? v : parseFloat(v);
  if (flags & T_STRING) return String(v);
  return v;
};

/** The current render (see `run`): hosts, claims, styles. Null between renders. */
let RC = null;
/** The component whose element (or shadow root) the markup being written is in: what `r:n` numbers are relative to. */
let CTX = null;
let RENDERING = null;

/**
 * What every compiled component extends: no DOM, only the members and the lifecycle bookkeeping. Anything of an
 * element's API that a component might read or write throws `Fallback` (see ELEMENT_PROPS below), except what
 * can be reproduced: listeners on the element itself, `componentOnReady`.
 */
export class Base {
  constructor() {
    this.__f = 0;
    this.__v = new Map();
    this.__seq = 0; // claim counter (see claim in runtime.js)
    this.__live = 0; // parts of this component the client has to run (events, refs, objects...)
    this.__rc = 0;
    this.__evs = null;
    this.__ops = null; // attribute changes of the host element, in order
    this.__ls = null; // listeners on this element
    this.__ctx = RC;
    this.__idx = -1;
  }
  addEventListener(type, fn) {
    ((this.__ls ||= {})[type] ||= []).push(fn);
  }
  removeEventListener(type, fn) {
    const l = this.__ls && this.__ls[type];
    if (l) this.__ls[type] = l.filter((f) => f !== fn);
  }
  dispatchEvent(ev) {
    for (const fn of (this.__ls && this.__ls[ev.type]) || []) fn(ev);
    return true;
  }
  componentOnReady() {
    return Promise.resolve(this);
  }
}
// The element API: reading it (or setting an accessor) falls back. A method name can be assigned over, as on an element.
for (const name of ELEMENT_PROPS) {
  if (name in Base.prototype) continue;
  Object.defineProperty(Base.prototype, name, {
    configurable: true,
    get() {
      return fallback(`the element's ${name}`);
    },
    set(value) {
      if (!ELEMENT_METHODS.has(name)) fallback(`the element's ${name}`);
      Object.defineProperty(this, name, { value, writable: true, configurable: true, enumerable: true });
    },
  });
}

export const Host = { __host: true };
export const Fragment = (_props, children) => children;
export const h = () => fallback('h() vnode');
const fcUtils = { forEach: () => fallback('functional component utilities'), map: () => fallback('functional component utilities') };
export const fc = (fn, props, children) => (typeof fn === 'string' ? fallback('dynamic tag') : fn(props, children, fcUtils));
export const Env = {};
let modeResolver = null;
export const setMode = (resolver) => (modeResolver = resolver);
export const getMode = (ref) => ref?.__mode ?? (ref ? (ref.__mode = modeResolver?.(ref)) : undefined);
let assetPath = '';
let BASE_URL = 'http://localhost/';
export const setAssetPath = (path) => (assetPath = path);
export const getRenderingRef = () => RENDERING;
export const getElement = (ref) => ref;
// Work that runs later cannot be part of a render that is over when it would run.
export const writeTask = () => fallback('writeTask');
export const readTask = () => fallback('readTask');
export const getAssetPath = (path) => new URL(path, assetPath ? new URL(assetPath, BASE_URL) : BASE_URL).href;
export const forceUpdate = (el) => {
  if (RC) fallback('forceUpdate');
  if (el && el.__ctx) el.__ctx.late ||= 'forceUpdate after the render';
};
export const Build = { isBrowser: false, isServer: true, isDev: false, isTesting: false };
export const Mixin = (...mixins) => mixins.reduceRight((acc, mixin) => mixin(acc), Base);
export const __hot = () => ({ sheets: new WeakMap() });
const noDecorator = () => () => {};
export { noDecorator as Component, noDecorator as Prop, noDecorator as State, noDecorator as Event, noDecorator as Method, noDecorator as Watch, noDecorator as Listen, noDecorator as Element, noDecorator as AttachInternals, noDecorator as PropSerialize, noDecorator as AttrDeserialize };

/** What a listener receives: the parts of a CustomEvent that are the same here; anything else is a fallback. */
const serverEvent = (type, detail, bubbles, composed, cancelable, el) => {
  const ev = {
    type,
    detail,
    bubbles,
    composed,
    cancelable,
    target: el,
    currentTarget: el,
    defaultPrevented: false,
    preventDefault() {
      if (cancelable) ev.defaultPrevented = true;
    },
    stopPropagation() {},
  };
  return new Proxy(ev, { get: (o, k) => (k in o ? o[k] : fallback(`the event's ${String(k)}`)) });
};
export const createEvent = (el, name, flags) => ({
  emit: (detail) => {
    // Whatever else listens to this event (an ancestor, a window listener) is not run here.
    const own = (el.__ls && el.__ls[name] && el.__ls[name].length) || 0;
    if (RC && (RC.listen[name] | 0) > own) fallback(`event ${name} has listeners other than the emitter's`);
    const ev = serverEvent(name, detail, !!(flags & 4), !!(flags & 2), !!(flags & 1), el);
    el.dispatchEvent(ev);
    return ev;
  },
});

/** What a `ref` callback receives: using the element for anything is a fallback; keeping it is not. */
const REF = new Proxy(
  {},
  {
    get: () => fallback('a ref element used'),
    set: () => fallback('a ref element used'),
    has: () => fallback('a ref element used'),
    ownKeys: () => fallback('a ref element used'),
    getPrototypeOf: () => fallback('a ref element used'),
    defineProperty: () => fallback('a ref element used'),
    deleteProperty: () => fallback('a ref element used'),
    getOwnPropertyDescriptor: () => fallback('a ref element used'),
  },
);

const tags = new Map(); // tag -> class
const cssOf = (style) => (Array.isArray(style) ? style.map(cssOf).join('') : typeof style === 'function' ? style() : style) || '';

const lateChange = (host) => {
  // The render is over: a timer or a promise changed a component after it was written. Its output is stale.
  if (host.__ctx && !RC) host.__ctx.late ||= 'a component changed after its render';
};

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
    Object.defineProperty(proto, name, {
      configurable: true,
      enumerable: true,
      get() {
        return this.__v.get(name);
      },
      set(value) {
        if (flags & PROP) value = parseProp(value, flags);
        // In the constructor (defaults) and before the first connect: only stored.
        if (!(this.__f & CONNECTED_ONCE)) {
          this.__v.set(name, value);
          return;
        }
        const old = this.__v.get(name);
        if (old === value || (Number.isNaN(old) && Number.isNaN(value))) return;
        this.__v.set(name, value);
        // A change once the component rendered renders it again (and runs its watchers): that is the DOM renderer's job.
        if (this.__f & (HAS_LOADED | RENDERED)) {
          if (RC) fallback('state or a prop changed after the first render');
          return lateChange(this);
        }
        if (reflects) reflect(this, name, value);
        this.__f |= DIRTY;
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

// ---------------------------------------------------------------------------------------------
// Template compiler: the html string -> a program of static strings and ops, once per template

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// The HTML tags whose parsing and serialization are the plain case. Anything else (tables, forms controls with
// values, templates, raw-text elements...) has quirks happy-dom's parser has its own take on: a fallback.
const PLAIN = new Set('a abbr address area article aside audio b bdi bdo blockquote br button canvas cite code data dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr i img input ins kbd label legend li main map mark menu meter nav ol output p picture progress q rp rt ruby s samp section slot small source span strong style sub summary sup time track u ul var video wbr'.split(' '));
// Opening one of these closes an open <p>.
const CLOSES_P = new Set('address article aside blockquote details dialog div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul'.split(' '));
const decode = (s) => {
  if (s.indexOf('&') < 0) return s;
  const r = s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (_, e) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1);
      if (!(cp > 31 && cp < 0x10ffff) || (cp >= 0xd800 && cp <= 0xdfff) || (cp >= 0x7f && cp <= 0x9f)) fallback(`character reference ${_}`);
      return String.fromCodePoint(cp);
    }
    return ENTITIES[e] ?? fallback(`html entity &${e};`);
  });
  if (/&[a-zA-Z#]/.test(r)) fallback('html entity without a semicolon');
  return r;
};
// The renderer's placeholder characters (U+0001..U+0008) cannot be in data.
const CTL = /[&<>\u0000-\u0008\r]/;
const escText = (s) => (CTL.test(s) ? esc(s, false) : s);
const escAttr = (s) => (/[&"\u0000-\u0008\r]/.test(s) ? esc(s, true) : s);
const esc = (s, attr) => {
  if (/[\u0000-\u0008\r]/.test(s)) fallback('a control character in text');
  s = s.replace(/&/g, '&amp;');
  return attr ? s.replace(/"/g, '&quot;') : s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
const attrStr = (attrs) => {
  let s = '';
  for (const [n, v] of attrs) s += v === '' ? ` ${n}` : ` ${n}="${escAttr(v)}"`;
  return s;
};

/** html -> tree of { t: 'e' | 't' | 'c', ... }. The compiler's output is well formed; whatever is not is a fallback. */
const parse = (html) => {
  const root = [];
  const stack = [{ kids: root }];
  const top = () => stack[stack.length - 1];
  const n = html.length;
  let i = 0;
  let svg = 0; // depth inside <svg>
  if (/[\u0000\r]/.test(html)) fallback('a NUL or CR in a template');
  while (i < n) {
    if (html.charCodeAt(i) !== 60) {
      let j = html.indexOf('<', i);
      if (j < 0) j = n;
      const raw = html.slice(i, j);
      top().kids.push({ t: 't', data: decode(raw) });
      i = j;
    } else if (html.startsWith('<!--', i)) {
      const j = html.indexOf('-->', i + 4);
      if (j < 0) fallback('an unclosed comment');
      top().kids.push({ t: 'c', data: html.slice(i + 4, j) });
      i = j + 3;
    } else if (html.charCodeAt(i + 1) === 47) {
      const j = html.indexOf('>', i);
      const name = html.slice(i + 2, j).trim();
      const cur = top();
      if (stack.length < 2 || cur.tag !== (svg ? name : name.toLowerCase())) fallback(`an end tag </${name}> that does not match`);
      stack.pop();
      if (cur.tag === 'svg') svg--;
      i = j + 1;
    } else {
      let j = i + 1;
      while (j < n && !/[\s/>]/.test(html[j])) j++;
      const raw = html.slice(i + 1, j);
      const tag = svg ? raw : raw.toLowerCase();
      if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(raw)) fallback(`markup ${JSON.stringify(html.slice(i, i + 20))}`);
      const attrs = [];
      let rs = false;
      let selfClose = false;
      for (;;) {
        while (/\s/.test(html[j])) j++;
        if (html[j] === '>') {
          j++;
          break;
        }
        if (html[j] === '/') {
          selfClose = true;
          j++;
          continue;
        }
        if (j >= n) fallback('an unclosed tag');
        selfClose = false;
        let k = j;
        while (k < n && !/[\s=/>]/.test(html[k])) k++;
        const aname = svg || tag === 'svg' ? html.slice(j, k) : html.slice(j, k).toLowerCase();
        j = k;
        let value = '';
        if (html[j] === '=') {
          j++;
          if (html[j] === '"' || html[j] === "'") {
            const q = html[j];
            k = html.indexOf(q, j + 1);
            if (k < 0) fallback('an unclosed attribute');
            value = html.slice(j + 1, k);
            j = k + 1;
          } else {
            k = j;
            while (k < n && !/[\s>]/.test(html[k])) k++;
            value = html.slice(j, k);
            j = k;
          }
        }
        if (aname === 'rs') rs = true;
        else if (attrs.some((a) => a[0] === aname)) fallback('a repeated attribute');
        else if (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(aname)) fallback(`attribute name ${JSON.stringify(aname)}`);
        else attrs.push([aname, decode(value)]);
      }
      const inSvg = svg > 0 || tag === 'svg';
      if (inSvg) {
        if (tag === 'foreignObject' || tag === 'title' || tag === 'desc' || tag === 'script' || tag === 'style') fallback(`<${tag}> in svg`);
      } else if (!PLAIN.has(tag) && !tag.includes('-') && tag !== 'svg') fallback(`<${tag}> in a template`);
      if (!inSvg && stack.some((e) => e.tag === 'p') && CLOSES_P.has(tag)) fallback(`<${tag}> inside <p>`);
      if (!inSvg && tag === 'a' && stack.some((e) => e.tag === 'a')) fallback('<a> inside <a>');
      if (!inSvg && stack.some((e) => e.tag === 'button') && tag === 'button') fallback('<button> inside <button>');
      const el = { t: 'e', tag, attrs, rs, kids: [], svg: inSvg };
      top().kids.push(el);
      i = j;
      if (inSvg ? selfClose : VOID.has(tag)) continue;
      if (tag === 'style') {
        const close = html.indexOf('</style', j);
        if (close < 0) fallback('an unclosed <style>');
        if (close > j) el.kids.push({ t: 't', data: html.slice(j, close), raw: true });
        i = html.indexOf('>', close) + 1;
        continue;
      }
      if (tag === 'svg') svg++;
      stack.push(el);
    }
  }
  if (stack.length !== 1) fallback('an element that is never closed');
  return root;
};

// Op codes of a compiled program
const OPEN = 1, PART = 2, MARK = 3, TEXT = 4, CTXIN = 5, CTXOUT = 6;

const compile = (tmpl, page) => {
  for (const [, type] of tmpl.parts) if (type === 7) fallback('<slot> outside shadow DOM (slot relocation)');
  // A template made of svg's children is parsed inside an <svg>, as the runtime does.
  const tree = tmpl.svg ? parse(`<svg>${tmpl.html}</svg>`)[0].kids : parse(tmpl.html);
  // Marked nodes in document order (elements and comments, as the runtime's TreeWalker 129).
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
  const topIdx = new Map(tree.map((nd, i) => [nd, i]));
  const partTop = [];
  const cmps = []; // the component elements, in document order
  const cmpOfM = []; // marked index -> index in `cmps`
  const tagOfM = [];
  const svgOfM = [];
  const attrsOfM = [];
  const emit = (nd, parentRaw) => {
    const ti = topIdx.has(nd) ? topIdx.get(nd) : -1;
    if (nd.t === 't') {
      if (ti >= 0) {
        flush();
        prog.push({ k: TEXT, data: nd.data, top: ti });
      } else buf += parentRaw || nd.raw ? nd.data : escText(nd.data);
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
        prog.push({ k: MARK, m: -1, top: ti, data: nd.data });
      } else if (nd.data !== '') buf += `<!--${nd.data}-->`;
    } else {
      const cmp = !nd.svg && tags.has(nd.tag);
      if (nd.m !== undefined) {
        tagOfM[nd.m] = nd.tag;
        svgOfM[nd.m] = nd.svg;
        attrsOfM[nd.m] = nd.attrs;
      }
      const dynamic = nd.m !== undefined || ti >= 0 || cmp;
      const raw = nd.tag === 'style';
      if (!dynamic) {
        buf += `<${nd.tag}${attrStr(nd.attrs)}>`;
      } else {
        flush();
        if (cmp && nd.kids.length && !tags.get(nd.tag).__meta.shadow) fallback('light children inside a light-DOM component (slot relocation)');
        let ci = -1;
        if (cmp) {
          ci = cmps.length;
          cmps.push({ tag: nd.tag, attrs: nd.attrs });
          if (nd.m !== undefined) cmpOfM[nd.m] = ci;
        }
        prog.push({ k: OPEN, tag: nd.tag, attrs: nd.attrs, m: nd.m === undefined ? -1 : nd.m, top: ti, ci, str: `<${nd.tag}${attrStr(nd.attrs)}` });
      }
      const kidsCtx = cmp && nd.kids.length > 0;
      if (kidsCtx) (flush(), prog.push({ k: CTXIN, ci: cmps.length - 1 }));
      if (!VOID.has(nd.tag) || nd.svg) {
        for (const kid of nd.kids) emit(kid, raw);
        if (kidsCtx) (flush(), prog.push({ k: CTXOUT }));
        buf += `</${nd.tag}>`;
      }
    }
  };
  for (const nd of tree) emit(nd, false);
  flush();
  return {
    prog,
    T: tree.length,
    M,
    page,
    live: tmpl.parts.some(([, type]) => type === 2 || type >= 5),
    cmps,
    cmpOfM,
    tagOfM,
    svgOfM,
    attrsOfM,
    partTop,
  };
};
const compiled = (tmpl, page) => {
  let s = tmpl.s;
  if (s === null) {
    try {
      s = tmpl.s = compile(tmpl, page);
    } catch (e) {
      if (!(e instanceof Fallback)) throw e;
      s = tmpl.s = { fb: e.message };
    }
  }
  if (s.fb !== undefined) fallback(s.fb);
  return s;
};

// ---------------------------------------------------------------------------------------------
// Parts: the attribute side of a render (what the runtime's AttrPart, ClassPart, StylePart, EventPart do to an element)

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

// What happy-dom's CSSStyleDeclaration does with a declaration is its own (drops what it finds invalid, expands
// shorthands, adds units): only the cases verified against it are written here, the rest falls back.
const STYLE_KEYWORD = /^(?:[a-z]+(?:-[a-z]+)*|#[0-9a-fA-F]{3,8})$/;
const STYLE_LENGTH = /^(?:-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|ch|ex|pt)|auto|0px)$/;
const STYLE_PROPS = {
  color: STYLE_KEYWORD, 'background-color': STYLE_KEYWORD, display: STYLE_KEYWORD, cursor: STYLE_KEYWORD, position: STYLE_KEYWORD,
  'text-align': STYLE_KEYWORD, visibility: STYLE_KEYWORD, overflow: STYLE_KEYWORD, 'font-weight': /^(?:[a-z]+|[1-9]00)$/, 'text-decoration': STYLE_KEYWORD,
  'white-space': STYLE_KEYWORD, 'flex-direction': STYLE_KEYWORD, 'justify-content': STYLE_KEYWORD, 'align-items': STYLE_KEYWORD, 'pointer-events': STYLE_KEYWORD,
  width: STYLE_LENGTH, height: STYLE_LENGTH, 'min-width': STYLE_LENGTH, 'max-width': STYLE_LENGTH, 'min-height': STYLE_LENGTH, 'max-height': STYLE_LENGTH,
  top: STYLE_LENGTH, left: STYLE_LENGTH, right: STYLE_LENGTH, bottom: STYLE_LENGTH, 'font-size': STYLE_LENGTH, 'border-radius': STYLE_LENGTH,
  'margin-top': STYLE_LENGTH, 'margin-bottom': STYLE_LENGTH, 'margin-left': STYLE_LENGTH, 'margin-right': STYLE_LENGTH,
  'padding-top': STYLE_LENGTH, 'padding-bottom': STYLE_LENGTH, 'padding-left': STYLE_LENGTH, 'padding-right': STYLE_LENGTH,
  opacity: /^(?:0|1|0?\.\d+)$/, 'z-index': /^-?\d+$/,
};
const kebab = (k) => (k.includes('-') ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
const styleDecl = (out, prop, value) => {
  const re = STYLE_PROPS[prop];
  const v = typeof value === 'number' ? String(value) : value;
  if (!re || typeof v !== 'string' || !re.test(v)) fallback(`style ${prop}: ${String(value).slice(0, 30)}`);
  if (typeof value === 'number' && prop !== 'opacity' && prop !== 'z-index') fallback(`style ${prop} as a number`);
  if (out.some((d) => d.startsWith(`${prop}:`))) fallback('a repeated style property');
  out.push(`${prop}: ${v};`);
};
const styleText = (v) => {
  const out = [];
  if (typeof v === 'string') {
    for (const d of v.split(';')) {
      if (!d.trim()) continue;
      const i = d.indexOf(':');
      if (i <= 0) fallback('a style declaration without a colon');
      styleDecl(out, d.slice(0, i).trim(), d.slice(i + 1).trim());
    }
  } else if (v && typeof v === 'object') {
    for (const k in v) {
      const x = v[k];
      if (x === '' || x == null) continue;
      styleDecl(out, kebab(k), x);
    }
  } else if (v != null && v !== '' && v !== false) fallback('a style value');
  return out.join(' ');
};

/** Applies an element's attribute changes, in order, to its static attributes. */
const applyOps = (attrs, ops) => {
  const list = attrs.map((a) => [a[0], a[1]]);
  for (const op of ops) {
    const i = list.findIndex((a) => a[0] === (op[0] === 'c' ? 'class' : op[1]));
    if (op[0] === 'r') {
      if (i >= 0) list.splice(i, 1);
    } else if (op[0] === 'f') {
      // removeAttribute for `false`, only when the attribute is empty
      if (i >= 0 && list[i][1] === '') list.splice(i, 1);
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

// The element properties an attribute part sets as a property, and what they write: the verified cases (the tags
// are the ones whose property is reflected the same way by happy-dom; anything else falls back).
const STRING_PROPS = { id: null, title: null, lang: null, slot: null, role: null, href: ['a'], src: ['img'], alt: ['img'], placeholder: ['input'], name: ['input', 'button'], target: ['a'], rel: ['a'] };
const BOOLEAN_PROPS = { hidden: null, disabled: ['button', 'input'] };
const NUMBER_PROPS = { width: ['img'], height: ['img'] };
const hasProp = (tag, name) => ELEMENT_PROPS.has(name) || (TAG_PROPS[tag] !== undefined && TAG_PROPS[tag].has(name));

/**
 * `AttrPart.set(v)` (v is not undefined): a property when the element has it, an attribute otherwise. `inst` is
 * the component whose element it is, if it is one; `ops` collects the attribute changes of a native element.
 */
const setAttr = (ops, tag, inst, svg, name, v, H) => {
  const complex = v != null && (typeof v === 'object' || typeof v === 'function');
  if (complex && H) H.__live++;
  // A member of the component: its setter. Anything else of a component's element is a native element's attribute.
  if (inst && name in inst.constructor.__meta.members) {
    const cur = inst[name];
    inst[name] = v == null && typeof cur === 'string' ? '' : v;
    return;
  }
  const prop = !svg && name !== 'list' && name !== 'type' && name !== 'form' && hasProp(tag, name);
  if (prop || complex) {
    // An object is a JS property of the element that is not written out; a scalar must be a property known to be written as below.
    if (!prop) return;
    if (complex) fallback(`an object for the property ${name} of <${tag}>`);
    if (name in STRING_PROPS && (STRING_PROPS[name] === null || STRING_PROPS[name].includes(tag))) ops.push(['a', name, v == null ? '' : String(v)]);
    else if (name in BOOLEAN_PROPS && (BOOLEAN_PROPS[name] === null || BOOLEAN_PROPS[name].includes(tag))) ops.push(v ? ['a', name, ''] : ['r', name]);
    else if (name in NUMBER_PROPS && NUMBER_PROPS[name].includes(tag) && (typeof v === 'number' ? Number.isInteger(v) && v >= 0 : /^\d+$/.test(v))) ops.push(['a', name, String(v)]);
    else fallback(`the property ${name} of <${tag}>`);
    return;
  }
  const attr = svg ? name : name.toLowerCase();
  if (v == null) ops.push(['r', attr]);
  else if (v === false) ops.push(['f', attr]);
  else ops.push(['a', attr, v === true ? '' : String(v)]);
};

const isSignal = (v) => v !== null && typeof v === 'object' && ((typeof v.peek === 'function' && typeof v.subscribe === 'function') || (globalThis.__RS_SIGNALS__ !== undefined && globalThis.__RS_SIGNALS__.is(v)));

/** One part of a spread (`{...props}`): the part kind its key names. */
const setSpread = (ops, tag, inst, svg, obj, H) => {
  obj = obj || {};
  for (const k in obj) {
    const v = obj[k];
    if (k === 'class' || k === 'className') for (const c of classSet(v)) ops.push(['c', c]);
    else if (k === 'style') {
      if (v !== undefined) styleOp(ops, v);
    } else if (k === 'ref') {
      if (v) v(REF);
    } else if (k === 'key' || k === 'children') {
      continue;
    } else if (/^on[A-Z-]/.test(k)) {
      // An EventPart made by a spread is not recorded for resuming (see SpreadPart in runtime.js).
      if (v && inst) addListener(inst, eventType(k), v);
      else if (v) RC.listen[eventType(k)] = (RC.listen[eventType(k)] | 0) + 1;
    } else if (v !== undefined) setAttr(ops, tag, inst, svg, k, v, H);
  }
};

const addListener = (inst, type, fn) => {
  inst.addEventListener(type, fn);
  RC.listen[type] = (RC.listen[type] | 0) + 1;
};

const styleOp = (ops, v) => {
  if (ops.some((o) => o[0] === 'a' && o[1] === 'style')) fallback('two style parts on one element');
  const text = styleText(v);
  if (text) ops.push(['a', 'style', text]);
};

// ---------------------------------------------------------------------------------------------
// Phase A: the values of a template's parts (claims, props, attributes), and its component instances. Phase B,
// further down, writes the markup, which is where the components run (they connect in the order the DOM
// connects them, which is not the order their parts are set).

/** A template instance: what `instantiate` and `update` of runtime.js make. */
class Frame {
  constructor(s, H, base) {
    this.s = s;
    this.H = H;
    this.base = base;
    this.insts = null;
    this.ops = null;
    this.rse = null;
    this.ph = null;
    this.cnt = 0;
  }
}
/** A keyed list (`setList`): the claims of its entries and what each one renders. */
class List {
  constructor(H) {
    this.H = H;
    this.starts = null;
    this.marks = null;
    this.items = null;
    this.cnt = 0;
    this.cand = false;
    this.last = 0;
    this.k = -1;
    this.conn = false;
  }
}
/** The number of top-level nodes of what was just built: what `serializeKids` counts. */
let CNT = 0;

const newInstance = (tag, attrs) => {
  const inst = new (tags.get(tag))();
  // The element's own attributes are its observed attributes.
  if (attrs.length) {
    const meta = inst.constructor.__meta;
    for (const [a, val] of attrs) {
      const nm = meta.attrs[a];
      if (nm !== undefined) {
        const des = meta.deserializers[nm];
        inst[nm] = des ? inst[des[0]](val, nm) : val;
      }
    }
  }
  return inst;
};

const opsOf = (f, m) => (f.ops[m] ||= []);

const build = (tmpl, vals, H, offset) => {
  const s = tmpl.s !== null && tmpl.s.fb === undefined ? tmpl.s : compiled(tmpl, false);
  const parts = tmpl.parts;
  const base = H ? H.__seq : 0;
  const f = new Frame(s, H, base);
  if (H) {
    H.__seq += s.T + s.M;
    if (s.live) H.__live++;
  }
  // The first use of a template parses it, which constructs its components once before the clones are made (happy-dom
  // does, and a constructor with a side effect shows it). A page is parsed inert, and its components are constructed
  // when it is appended, all before any of them connects.
  if (s.cmps.length && !s.page && !tmpl.prepared) {
    tmpl.prepared = true;
    for (const c of s.cmps) newInstance(c.tag, c.attrs);
  }
  if (s.cmps.length) {
    f.insts = new Array(s.cmps.length);
    for (let k = 0; k < s.cmps.length; k++) f.insts[k] = newInstance(s.cmps[k].tag, s.cmps[k].attrs);
  }
  const n = parts.length;
  if (n) {
    f.ops = new Array(s.M);
    f.ph = new Array(n);
    f.pc = new Array(n);
  }
  for (let i = 0; i < n; i++) {
    const [m, type, name] = parts[i];
    const v = vals[i + offset];
    if (isSignal(v)) fallback('a signal bound to a part');
    const inst = m >= 0 && f.insts !== null && s.cmpOfM[m] !== undefined ? f.insts[s.cmpOfM[m]] : undefined;
    switch (type) {
      case 0:
        f.ph[i] = buildValue(v, H);
        f.pc[i] = CNT;
        break;
      case 1:
        if (v !== undefined) setAttr(opsOf(f, m), s.tagOfM[m], inst, s.svgOfM[m], name, v, H);
        break;
      case 2: {
        const type = eventType(name);
        (H.__evs ||= new Set()).add(type);
        const rse = (f.rse ||= [])[m] || (f.rse[m] = []);
        if (!rse.includes(type)) rse.push(type);
        if (v) {
          if (inst) inst.addEventListener(type, v);
          RC.listen[type] = (RC.listen[type] | 0) + 1;
        }
        break;
      }
      case 3:
        for (const c of classSet(v)) opsOf(f, m).push(['c', c]);
        break;
      case 4:
        if (v != null && v !== '') {
          if (s.attrsOfM[m].some((a) => a[0] === 'style')) fallback('a style part on an element with a style attribute');
          styleOp(opsOf(f, m), v);
        }
        break;
      case 5:
        // `fn(el)`: the element is not here, and using it falls back.
        if (v) v(REF);
        break;
      case 6:
        setSpread(opsOf(f, m), s.tagOfM[m], inst, s.svgOfM[m], v, H);
        break;
      default:
        fallback(`part type ${type}`);
    }
  }
  // The count of top-level nodes (for list skips).
  let cnt = 0;
  const prog = s.prog;
  for (let p = 0; p < prog.length; p++) {
    const op = prog[p];
    if (typeof op === 'string') continue;
    switch (op.k) {
      case OPEN:
        if (op.top >= 0) cnt++;
        break;
      case PART:
        if (s.partTop[op.i]) cnt += f.pc[op.i];
        break;
      case MARK:
        if (op.top >= 0) cnt++;
        break;
      case TEXT:
        cnt += H ? (op.data === '' ? 1 : 2) : op.data === '' ? 0 : 1;
        break;
    }
  }
  f.cnt = cnt;
  return f;
};

/** What `NodePart.set` makes of a value: text (a string, already written), a template, or a list. */
const buildValue = (v, H, conn = false) => {
  if (v == null || v === false || v === true) {
    CNT = 0;
    return '';
  }
  if (typeof v === 'object') {
    if (v.$h === 1) fallback('an h() vnode');
    if (v.$t !== undefined) {
      const f = build(v.$t, v.v, H, 0);
      CNT = f.cnt;
      return f;
    }
    if (Array.isArray(v)) return buildList(v, H, conn);
  }
  const s = escText(String(v));
  // text: its own claim, and a `<!--^t<n>-->` mark before it
  const n = H ? H.__seq++ : 0;
  CNT = s === '' ? 1 : 2;
  return H ? new Text(n, s, H) : s;
};
class Text {
  constructor(n, s, H) {
    this.n = n;
    this.s = s;
    this.H = H;
  }
}

/** `setList` on a first render: every entry claims a start text and a marker, then entries are built last to first. */
const buildList = (items, H, conn) => {
  const len = items.length;
  const list = new List(H);
  if (!len) {
    CNT = 0;
    return list;
  }
  const live = H.__live;
  const a = H.__seq;
  list.starts = new Array(len);
  list.marks = new Array(len);
  for (let i = 0; i < len; i++) {
    list.starts[i] = H.__seq++;
    list.marks[i] = H.__seq++;
  }
  // A list written straight into a connected parent connects each entry as it is made (so, last to first); inside a
  // template that is not connected yet, the entries connect when the template does, first to last (`emitList`).
  list.items = new Array(len);
  let total = 0;
  for (let i = len - 1; i >= 0; i--) {
    const piece = buildValue(items[i], H, conn);
    total += CNT + 2;
    if (conn) {
      const B = [];
      emitValue(piece, B);
      list.items[i] = B;
    } else list.items[i] = piece;
  }
  list.conn = conn;
  // `~<last claim>:<nodes>` on the first start mark: the client steps over a list nothing in it has to run. Whether
  // every component in it resumes is known once they have rendered (the numbering pass).
  list.cand = H.__live === live && RC.resume && H.__rc === 1;
  list.last = H.__seq - 1;
  list.total = total;
  void a;
  CNT = total;
  return list;
};

// ---------------------------------------------------------------------------------------------
// Phase B: the markup. `A` is the output so far, an array of strings, numbers (tokens the numbering pass fills in:
// a component's `s-rs`, the id of the component that claimed a node, the start and end of a list) and nested arrays.

const T_HOST = 0, T_LISTSTART = 1, T_LISTEND = 2, T_DOT = 3, T_COLON = 4;
const tok = (kind, val) => (val << 3) | kind;

/** The claim numbers of a node, as `marks` writes them: bare for the component the node is written in, else with its id. */
const pushNums = (A, buf, H, nums, kind) => {
  if (H === CTX) return buf + nums.join(',');
  for (let i = 0; i < nums.length; i++) {
    if (i) buf += ',';
    A.push(buf);
    A.push(tok(kind, H.__idx));
    buf = String(nums[i]);
  }
  return buf;
};

const emitValue = (p, A) => {
  if (typeof p === 'string') A.push(p);
  else if (p instanceof Frame) emitFrame(p, A);
  else if (p instanceof List) emitList(p, A);
  else if (p instanceof Text) {
    let buf = '<!--^t';
    buf = pushNums(A, buf, p.H, [p.n], T_DOT);
    A.push(`${buf}-->${p.s}`);
  }
};

const emitList = (list, A) => {
  const items = list.items;
  if (items === null) return;
  const H = list.H;
  const len = items.length;
  let k = -1;
  if (list.cand) {
    k = RC.lists.push(list) - 1;
    list.k = k;
  }
  // Entries that were not connected as they were made connect now, first to last.
  let bodies = items;
  if (!list.conn) {
    bodies = new Array(len);
    for (let i = 0; i < len; i++) {
      const B = [];
      emitValue(items[i], B);
      bodies[i] = B;
    }
  }
  for (let i = 0; i < len; i++) {
    let buf = '<!--^t';
    buf = pushNums(A, buf, H, [list.starts[i]], T_DOT);
    if (i === 0 && k >= 0) {
      A.push(buf);
      A.push(tok(T_LISTSTART, k));
      buf = '';
    }
    A.push(`${buf}-->`);
    A.push(bodies[i]);
    buf = '<!--^';
    buf = pushNums(A, buf, H, [list.marks[i]], T_DOT);
    A.push(`${buf}-->`);
  }
  if (k >= 0) A.push(tok(T_LISTEND, k));
};

const emitFrame = (f, A) => {
  const s = f.s;
  const prog = s.prog;
  const H = f.H;
  let buf = '';
  let saved = null;
  for (let p = 0; p < prog.length; p++) {
    const op = prog[p];
    if (typeof op === 'string') {
      buf += op;
      continue;
    }
    switch (op.k) {
      case OPEN: {
        const ops = op.m >= 0 && f.ops ? f.ops[op.m] : undefined;
        let res = null;
        if (op.ci >= 0) {
          res = renderComponent(f.insts[op.ci]);
        }
        // Two writers of `style` (the parent's part or attribute, and <Host>) merge their declarations in the DOM.
        if (res && (ops || op.attrs.length) && res.ops.some((o) => o[0] === 'a' && o[1] === 'style') && ((ops && ops.some((o) => o[0] === 'a' && o[1] === 'style')) || op.attrs.some((a) => a[0] === 'style'))) fallback('style set by a parent and by <Host>');
        let str;
        if (!ops && !(res && res.ops.length)) str = op.str;
        else if (res && !ops && !op.attrs.length && res.classOnly) str = `<${op.tag} class="${res.classOnly}"`;
        else str = `<${op.tag}${attrStr(applyOps(op.attrs, res ? (ops ? ops.concat(res.ops) : res.ops) : ops))}`;
        buf += str;
        if (H && (op.top >= 0 || op.m >= 0)) {
          buf += ' r:n="';
          const nums = op.top >= 0 ? (op.m >= 0 ? [f.base + op.top, f.base + s.T + op.m] : [f.base + op.top]) : [f.base + s.T + op.m];
          buf = pushNums(A, buf, H, nums, T_DOT) + '"';
        }
        if (res) {
          A.push(buf);
          A.push(tok(T_HOST, res.idx));
          buf = '';
        }
        if (op.m >= 0 && f.rse && f.rse[op.m]) {
          buf += ' r:e="';
          buf = pushNums(A, buf, H, [f.rse[op.m].join(',')], T_COLON) + '"';
        }
        buf += '>';
        if (res) {
          A.push(buf);
          A.push(res.inner);
          buf = '';
        }
        break;
      }
      case PART:
        A.push(buf);
        buf = '';
        emitValue(f.ph[op.i], A);
        break;
      case MARK:
        if (!H) {
          if (op.m < 0 && op.data !== '' && op.data !== 'rs') buf += `<!--${op.data}-->`;
        } else {
          buf += '<!--^';
          buf = pushNums(A, buf, H, op.top >= 0 ? (op.m >= 0 ? [f.base + op.top, f.base + s.T + op.m] : [f.base + op.top]) : [f.base + s.T + op.m], T_DOT) + '-->';
        }
        break;
      case TEXT:
        if (H) {
          buf += '<!--^t';
          buf = pushNums(A, buf, H, [f.base + op.top], T_DOT) + '-->';
        }
        buf += escText(op.data);
        break;
      case CTXIN: {
        // The children of a component's element are written in that component's context.
        (saved ||= []).push(CTX);
        CTX = f.insts[op.ci];
        break;
      }
      case CTXOUT:
        CTX = saved.pop();
        break;
    }
  }
  A.push(buf);
};

// ---------------------------------------------------------------------------------------------
// Components

const guard = (fn, what) => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof Fallback) throw e;
    // A hook that reaches for the DOM (or fails): the DOM renderer will say what happens.
    return fallback(`${what} threw ${e && e.constructor && e.constructor.name}: ${e && e.message}`);
  }
};
const AsyncFunction = (async () => {}).constructor;
/** Calls a lifecycle hook: a hook that is async, or returns a thenable, is a fallback (its continuation is part of the render). */
const hook = (host, name, what) => {
  const fn = host[name];
  if (typeof fn !== 'function') return;
  if (fn instanceof AsyncFunction) fallback(`async ${what}`);
  const r = guard(() => fn.call(host), what);
  if (r && typeof r.then === 'function') fallback(`${what} returned a promise`);
};

const SIGNALS = Symbol.for('stencilrs.signals.patched');

/** connectedCallback + __load + __render of runtime.js for a first server render; returns the component's content and attributes. */
const renderComponent = (host) => {
  const C = host.constructor;
  const meta = C.__meta;
  if (host[SIGNALS]) fallback('a component with signals');
  host.__idx = RC.hosts.push(host) - 1;
  host.__ops = [];
  host.__f |= CONNECTED_ONCE;
  meta.reflectAll(host);
  for (const [ev] of meta.listeners) RC.listen[ev] = (RC.listen[ev] | 0) + 1;
  hook(host, '__connected', 'connectedCallback');
  hook(host, 'componentWillLoad', 'componentWillLoad');
  const root = RC.root;
  const shadow = !!meta.shadow;
  let rc = root;
  const styles = [];
  if (shadow) {
    rc = { styles, done: new Set() };
    if (meta.style) styles.push(`<style sty-id="${meta.tag}">${cssOf(meta.style)}</style>`);
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
  const content = [];
  const ctx = CTX;
  RC.root = rc;
  CTX = host;
  try {
    if (typeof host.render === 'function') {
      hook(host, 'componentWillRender', 'componentWillRender');
      const outer = RENDERING;
      RENDERING = host;
      let out;
      try {
        if (host.render instanceof AsyncFunction) fallback('an async render');
        out = guard(() => host.render(), 'render');
      } finally {
        RENDERING = outer;
      }
      host.__seq = 0;
      host.__seq++; // the root marker: claim 0
      if (out != null && out.$t !== undefined && out.$t.host) {
        const hostParts = out.$t.host;
        for (let i = 0; i < hostParts.length; i++) {
          const [type, name] = hostParts[i];
          const v = out.v[i];
          if (type === 1) {
            if (v !== undefined) setAttr(host.__ops, meta.tag, host, false, name, v, host);
          } else if (type === 3) for (const c of classSet(v)) host.__ops.push(['c', c]);
          else if (type === 4) {
            if (v != null && v !== '') styleOp(host.__ops, v);
          } else fallback(`<Host> part type ${type}`);
        }
        emitFrame(build(out.$t, out.v, host, hostParts.length), content);
      } else {
        // A list written straight into the (connected) host: its entries connect last to first.
        emitValue(buildValue(out, host, true), content);
      }
      content.push('<!--^0-->');
      hook(host, 'componentDidRender', 'componentDidRender');
    }
  } finally {
    RC.root = root;
    CTX = ctx;
  }
  if (host.__f & DIRTY) fallback('state changed during the first render');
  host.__f |= RENDERED;
  host.__ops.push(['c', 'hydrated']);
  hook(host, 'componentDidLoad', 'componentDidLoad');
  host.__f |= HAS_LOADED;
  let inner = content;
  if (shadow) inner = [`<template shadowrootmode="open"${meta.delegatesFocus ? ' shadowrootdelegatesfocus' : ''}>${styles.join('')}`, content, '</template>'];
  // Usual case (a scoped component): the host's only attribute is its class list.
  let classOnly = null;
  for (const op of host.__ops) {
    if (op[0] !== 'c') {
      classOnly = null;
      break;
    }
    classOnly = classOnly === null ? op[1] : classOnly.split(' ').includes(op[1]) ? classOnly : `${classOnly} ${op[1]}`;
  }
  return { inner, ops: host.__ops, idx: host.__idx, classOnly };
};

// A component's state as the page should resume it: its members that differ from a fresh instance's (undefined
// when none do; null when a value cannot go through JSON, and the component then hydrates on load).
const fresh = new Map();
const plain = (v) => {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(plain);
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.values(v).every(plain);
  return false;
};
const stateEntry = (host) => {
  const C = host.constructor;
  let def = fresh.get(C);
  if (!def) {
    const ctx = RC;
    fresh.set(C, (def = new C()));
    void ctx;
  }
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

// ---------------------------------------------------------------------------------------------
// The renderer

// The DOM events a resumable page delegates: a component listening to any other hydrates on load.
const DELEGATED = new Set(['click', 'dblclick', 'auxclick', 'contextmenu', 'input', 'change', 'beforeinput', 'submit', 'reset', 'keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'pointerover', 'pointerenter', 'pointerleave', 'pointerout', 'mousedown', 'mouseup', 'mouseover', 'mouseenter', 'mouseleave', 'mouseout', 'touchstart', 'touchend', 'focus', 'blur', 'focusin', 'focusout', 'paste', 'copy', 'cut', 'dragstart', 'drop']);

const pageCache = new Map();
const PAGES = 256;

/** The DOM globals, as accessors that fall back while a page renders. */
const trapDescriptors = DOM_GLOBALS.map((name) => ({
  configurable: true,
  get() {
    return fallback(`${name} (a DOM global)`);
  },
  set() {
    return fallback(`${name} (a DOM global)`);
  },
}));
const trapProps = Object.fromEntries(DOM_GLOBALS.map((name, i) => [name, trapDescriptors[i]]));
const TIMERS = ['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask'];

/**
 * Installs the traps: every DOM global falls back, and so does a timer or microtask (their work would be part of
 * the render the DOM renderer waits for). Returns what to put back.
 */
let ORIG = null;
const arm = () => {
  const saved = [];
  // When another DOM renderer has installed its globals, they are shadowed for the render and put back.
  const foreign = 'document' in globalThis;
  if (foreign) for (const name of DOM_GLOBALS) saved.push(Object.getOwnPropertyDescriptor(globalThis, name));
  else ORIG ||= DOM_GLOBALS.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperties(globalThis, trapProps);
  const timers = TIMERS.map((name) => globalThis[name]);
  for (const name of TIMERS) globalThis[name] = () => fallback(`${name} in a render`);
  return { saved: foreign ? saved : null, timers };
};
const disarm = (st) => {
  for (let i = 0; i < DOM_GLOBALS.length; i++) {
    const name = DOM_GLOBALS[i];
    const d = st.saved ? st.saved[i] : ORIG[i];
    if (d) Object.defineProperty(globalThis, name, d);
    else delete globalThis[name];
  }
  for (let i = 0; i < TIMERS.length; i++) globalThis[TIMERS[i]] = st.timers[i];
};

/**
 * `createStringRenderer(load, { resumable, url, lazyDefine })`: `load` imports the server bundle built for this
 * runtime. `render(html)` returns the same string as runtime-server.js's renderer, or throws `Fallback` when the
 * page uses something this renderer does not model (runtime-server.js's `createRenderer(load, { renderer: 'string' })`
 * catches it and renders that page with happy-dom).
 */
export async function createStringRenderer(load, { resumable = true, url = 'http://localhost/', lazyDefine = null } = {}) {
  BASE_URL = url;
  globalThis.__RS_SERVER__ = true;
  await load();
  if (!tags.size) throw new Error('stencilrs: the string renderer found no components. The server bundle must import its runtime from @popcorn245/stencilrs/runtime/string (build it with `stringRenderer: true`), and from this copy of the package.');

  const run = (html, resume, ld) => {
    FELL = null;
    let tmpl = pageCache.get(html);
    if (!tmpl) {
      if (pageCache.size >= PAGES) pageCache.delete(pageCache.keys().next().value);
      pageCache.set(html, (tmpl = template(html, [])));
    }
    const st = arm();
    const page = (RC = { hosts: [], lists: [], listen: Object.create(null), resume, root: { styles: [], done: new Set() }, late: null });
    CTX = null;
    try {
      compiled(tmpl, true);
      const f = build(tmpl, [], null, 0);
      const A = [];
      emitFrame(f, A);
      const out = number(A, page, resume, ld);
      if (FELL !== null) throw new Fallback(FELL);
      // What a component's `disconnectedCallback` does when the page is thrown away.
      for (const host of page.hosts) hook(host, '__disconnected', 'disconnectedCallback');
      if (FELL !== null) throw new Fallback(FELL);
      return { html: out, ctx: page };
    } catch (e) {
      if (e instanceof Fallback) throw e;
      const fb = new Fallback(`${e && e.constructor && e.constructor.name}: ${e && e.message}`);
      fb.cause = e;
      throw fb;
    } finally {
      RC = null;
      CTX = null;
      RENDERING = null;
      disarm(st);
    }
  };
  const render = async (html, { resumable: resume = resumable, lazyDefine: ld = lazyDefine } = {}) => {
    const { html: out, ctx } = run(html, resume, ld);
    // Whatever a hook left for a microtask has happened by now; if it changed a component, the page is stale.
    await new Promise((r) => setImmediate(r));
    if (ctx.late) throw new Fallback(ctx.late);
    return out;
  };
  render.sync = (html, opts = {}) => run(html, opts.resumable ?? resumable, opts.lazyDefine ?? lazyDefine).html;
  return render;
}

/** The numbering pass: the tokens of the output become ids, `s-rs`, list skips and the state script. */
const number = (A, page, resume, ld) => {
  const state = resume ? {} : null;
  const types = new Set();
  const seen = new Set(), eager = new Set();
  const ids = new Array(page.hosts.length);
  const OUT = [];
  const startAt = [];
  const startCount = [];
  let next = 0;
  let stateless = 0;
  const walk = (a) => {
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (typeof x === 'string') OUT.push(x);
      else if (typeof x === 'number') {
        const kind = x & 7;
        const val = x >> 3;
        switch (kind) {
          case T_HOST: {
            const host = page.hosts[val];
            const id = ++next;
            ids[val] = id;
            let now = false;
            if (state) {
              const entry = stateEntry(host);
              for (const type of host.__evs || []) {
                if (DELEGATED.has(type)) types.add(type);
                else if (ELEMENT_ON.has(`on${type}`)) now = true;
              }
              if (entry === null) {
                now = true;
                stateless++;
              } else if (entry) state[id] = entry;
            }
            seen.add(host.constructor.__meta.tag);
            if (now) eager.add(host.constructor.__meta.tag);
            OUT.push(` s-rs="${id}"${now ? ' s-rh' : ''}`);
            break;
          }
          case T_LISTSTART:
            startAt[val] = OUT.length;
            startCount[val] = stateless;
            OUT.push('');
            break;
          case T_LISTEND:
            if (state && stateless === startCount[val]) OUT[startAt[val]] = `~${page.lists[val].last}:${page.lists[val].total}`;
            break;
          case T_DOT:
            OUT.push(`${ids[val]}.`);
            break;
          case T_COLON:
            OUT.push(`${ids[val]}:`);
            break;
        }
      } else walk(x);
    }
  };
  walk(A);
  let out = page.root.styles.join('') + OUT.join('');
  if (state) {
    const e = [...types].join(',');
    out += `<script type="rs/state" e="${e}"${ld ? ` ld="${ld}" lt="${[...seen].filter((t) => !eager.has(t))}"` : ''}>${JSON.stringify(state).replace(/</g, '\\u003c')}</script>`;
    if (e) out += `<script>(d=>{const q=[],t="${e}".split(","),f=e=>q.push([e,e.composedPath()]);for(const k of t)d.addEventListener(k,f,!0);d.__rsq={q,off(){for(const k of t)d.removeEventListener(k,f,!0)}};d.dispatchEvent(new Event("rsinit"))})(document)</script>`;
  }
  return out;
};
