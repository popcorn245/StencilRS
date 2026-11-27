// Experimental: server rendering for the stencilrs runtime (componentExport: 'stencilrs').
//
//   import { createRenderer } from '@popcorn245/stencilrs/runtime/server';
//   const render = await createRenderer(() => import('./dist-server/components.js'));
//   const html = await render('<my-app></my-app>');
//
// The components run on the same runtime as in the browser, inside a happy-dom window (an
// optional peer dependency) whose globals are installed before `load` imports them. Shadow roots
// come out as declarative shadow DOM (`<template shadowrootmode="open">`) with their styles
// inlined; scoped and unencapsulated styles come out as `<style sty-id>` tags. Each component
// host carries `s-rs="<id>"`. Each node a render claimed (see `claim` in runtime.js) carries its
// numbers, `r:n="<n>"` (bare for the component it is written in, `<host>.<n>` for another), and
// each child a light-DOM host moved into a slot carries `r:l="<host>"`; text and comments carry
// the same in a `<!--^...-->` comment (see `parseMark`).
// The client's first render looks the claimed nodes up and keeps them (hydration in place).
//
// One window per renderer, renders one at a time: the runtime keeps per-document state.

// The DOM events a resumable page delegates: a component listening to any other hydrates on load.
const DELEGATED = new Set(['click', 'dblclick', 'auxclick', 'contextmenu', 'input', 'change', 'beforeinput', 'submit', 'reset', 'keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'pointerover', 'pointerenter', 'pointerleave', 'pointerout', 'mousedown', 'mouseup', 'mouseover', 'mouseenter', 'mouseleave', 'mouseout', 'touchstart', 'touchend', 'focus', 'blur', 'focusin', 'focusout', 'paste', 'copy', 'cut', 'dragstart', 'drop']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['style', 'script']);
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const isHost = (el) => !!el.constructor?.__meta;

/**
 * Server rendering for the stencilrs runtime. `load` imports the components (compiled for the runtime); it is called
 * with `{ renderer }`, which is `'dom'` for the bundle built for the runtime in `runtime.js`, and `'string'` for the one
 * built for `runtime-string.js` (see `stringRenderer` in docs/vite-plugin.md).
 *
 * `renderer: 'dom'` (default) installs a happy-dom window's globals, then imports the components. `renderer: 'string'`
 * renders without a DOM (runtime-string.js, 30 to 40 times faster), and renders a page that uses something it does not
 * model with the happy-dom renderer instead, with identical output (see `createHybrid`).
 */
export async function createRenderer(load, options = {}) {
  const { renderer = 'dom' } = options;
  if (renderer === 'string') return createHybrid(load, options);
  if (renderer !== 'dom') throw new Error(`[stencilrs] createRenderer: renderer must be 'dom' or 'string', got ${JSON.stringify(renderer)}`);
  return createDomRenderer(load, options, false);
}

/**
 * Installs the happy-dom window's globals (the names Node does not have, and the few it has that the DOM overrides).
 * Returns what puts everything back as it was.
 */
function installGlobals(window) {
  const keep = new Set(Object.getOwnPropertyNames(globalThis));
  const undo = [];
  const set = (key, value) => {
    undo.push([key, Object.getOwnPropertyDescriptor(globalThis, key)]);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  for (const key of Object.getOwnPropertyNames(window)) {
    if (keep.has(key) || key === 'undefined' || key === 'NaN' || key === 'Infinity') continue;
    try {
      set(key, window[key]);
    } catch {
      // read-only on this Node: leave Node's own
    }
  }
  for (const key of ['window', 'document', 'customElements', 'HTMLElement', 'Node', 'Element', 'Event', 'CustomEvent', 'EventTarget', 'navigator', 'location']) set(key, key === 'window' ? window : window[key]);
  return () => {
    for (let i = undo.length - 1; i >= 0; i--) {
      const [key, d] = undo[i];
      if (d) Object.defineProperty(globalThis, key, d);
      else delete globalThis[key];
    }
  };
}

/**
 * The happy-dom renderer. With `isolate`, the window's globals exist only while it loads and renders: a renderer that
 * runs components without a DOM (`renderer: 'string'`) must not find a `document` between them.
 */
async function createDomRenderer(load, { url = 'http://localhost/', settleRounds = 20, resumable = true, lazyDefine = null } = {}, isolate) {
  const { Window } = await import('happy-dom');
  const window = new Window({ url });
  const uninstallLoad = installGlobals(window);
  globalThis.__RS_SERVER__ = true;
  try {
    await load({ renderer: 'dom' });
  } finally {
    if (isolate) uninstallLoad();
  }

  const document = window.document;
  let queue = Promise.resolve();
  const renderPage = async (html, { resumable: resume = resumable, lazyDefine: ld = lazyDefine } = {}) => {
    // Fresh state per request: no styles or components left from the last one.
    document.body.replaceChildren();
    for (const s of document.head.querySelectorAll('style[sty-id]')) s.remove();
    delete document.__rsStyles;
    // Parsed detached first, so every component connects with its children already in place.
    const t = document.createElement('template');
    t.innerHTML = html;
    document.body.append(t.content);
    await settle(document.body, settleRounds);
    const styles = [...document.head.querySelectorAll('style[sty-id]')].map((s) => s.outerHTML).join('');
    const ids = new WeakMap();
    let next = 0;
    const state = resume ? {} : null;
    // Components that must hydrate on load so far: a list holding one can't be skipped on the client.
    let stateless = 0;
    const types = new Set();
    const delegated = DELEGATED;
    // For lazy define: the tags seen, and those with an instance that hydrates on load.
    const seen = new Set(), eager = new Set();
    const nextId = (host) => {
      const id = ++next;
      let now = false;
      if (state) {
        const entry = stateEntry(host, document);
        // A component waits only when its state goes through JSON and the page delegates its events.
        for (const type of host.__evs || []) {
          if (delegated.has(type)) types.add(type);
          else if (`on${type}` in window.HTMLElement.prototype) now = true;
        }
        // A part bound to a signal must be bound on load, or it would miss the signal's changes.
        if (host.__sb && host.__sb.size) now = true;
        if (entry === null) {
          now = true;
          stateless++;
        } else if (entry) state[id] = entry;
      }
      nextId.now = now;
      seen.add(host.localName);
      if (now) eager.add(host.localName);
      return id;
    };
    nextId.stateless = () => (state ? stateless : -1);
    let out = '';
    out += serializeKids(document.body.firstChild, ids, nextId, null);
    document.body.replaceChildren();
    // Each component's state, for resuming without rendering (see Resuming in runtime.js).
    // `e`: the events to delegate, for the components that wait.
    if (state) {
      const e = [...types].join(',');
      out += `<script type="rs/state" e="${e}"${ld ? ` ld="${ld}" lt="${[...seen].filter((t) => !eager.has(t))}"` : ''}>${JSON.stringify(state).replace(/</g, '\\u003c')}</script>`;
      // Interactive before the runtime arrives: this catches those events until it does (which
      // replays them, see `replay` in runtime.js), and says so with an `rsinit` event.
      if (e) out += `<script>(d=>{const q=[],t="${e}".split(","),f=e=>q.push([e,e.composedPath()]);for(const k of t)d.addEventListener(k,f,!0);d.__rsq={q,off(){for(const k of t)d.removeEventListener(k,f,!0)}};d.dispatchEvent(new Event("rsinit"))})(document)</script>`;
    }
    return styles + out;
  };
  const render = async (html, opts) => {
    if (!isolate) return renderPage(html, opts);
    const uninstall = installGlobals(window);
    try {
      return await renderPage(html, opts);
    } finally {
      // What a component left for the next macrotask still finds its globals.
      await new Promise((r) => setTimeout(r));
      uninstall();
    }
  };
  return (html, opts) => (queue = queue.then(() => render(html, opts), () => render(html, opts)));
}

/**
 * `renderer: 'string'`: every page goes to the string renderer (runtime-string.js) first. It throws `Fallback` for
 * anything it cannot reproduce exactly, and the page is then rendered from the start by the happy-dom renderer, whose
 * globals exist only while it runs. A render is atomic, so the two never overlap: a string render waits for a
 * happy-dom render that is in flight, and a page that falls back therefore delays the renders behind it, as every
 * render of the default renderer does.
 */
async function createHybrid(load, options) {
  const { url, resumable = true, lazyDefine = null, onFallback = null } = options;
  const { createStringRenderer } = await import('./runtime-string.js');
  const strRender = await createStringRenderer(() => load({ renderer: 'string' }), { resumable, lazyDefine, url });
  let dom = null;
  let tail = Promise.resolve();
  let busy = 0;
  const viaDom = (html, opts) => {
    busy++;
    const job = tail.then(async () => {
      dom ||= createDomRenderer(() => load({ renderer: 'dom' }), options, true);
      return (await dom)(html, opts);
    });
    tail = job.then(
      () => busy--,
      () => busy--,
    );
    return job;
  };
  const render = async (html, opts) => {
    while (busy) await tail;
    try {
      return await strRender(html, opts);
    } catch (e) {
      if (e?.name !== 'Fallback') throw e;
      render.fallbacks++;
      render.lastFallback = e.message;
      if (onFallback) onFallback(e.message, html);
      return viaDom(html, opts);
    }
  };
  render.fallbacks = 0;
  render.lastFallback = null;
  return render;
}

// A component's state as the page should resume it: its members that differ from a fresh
// instance's (undefined when none do). null when a value can't go through JSON (the component
// then hydrates on load, `s-rh`).
const fresh = new Map();
const plain = (v) => {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(plain);
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.values(v).every(plain);
  return false;
};
function stateEntry(host, document) {
  const tag = host.localName;
  if (!fresh.has(tag)) fresh.set(tag, document.createElement(tag));
  const def = fresh.get(tag);
  const s = {};
  let any = false;
  for (const name of Object.keys(host.constructor.__meta.members)) {
    const v = host.__v.get(name);
    const d = def.__v.get(name);
    if (v === d || (v === undefined && d === undefined)) continue;
    if (!plain(v)) return null;
    if (JSON.stringify(v) === JSON.stringify(d)) continue;
    s[name] = v;
    any = true;
  }
  return any ? s : undefined;
}

/** Waits until every component in the tree has loaded and no render is queued. */
async function settle(root, rounds) {
  for (let i = 0; i < rounds; i++) {
    const hosts = [];
    const walk = (node) => {
      for (let n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType !== 1) continue;
        if (isHost(n)) hosts.push(n);
        if (n.shadowRoot) walk(n.shadowRoot);
        walk(n);
      }
    };
    walk(root);
    await Promise.all(hosts.map((h) => h.__onReady));
    await new Promise((r) => setTimeout(r));
    // Loaded (1) and nothing queued (2) or pending from the first render (32).
    if (hosts.every((h) => (h.__f & 1) && !(h.__f & 34))) return;
  }
}

/**
 * The hydration marks of a node: its claim numbers (`n`) and the host it is a logical child of
 * (`l`). A claim of `ctx`, the component whose element or shadow root the node is written in,
 * is a bare number; another component's carries its id (`2.6`).
 */
function marks(node, ids, ctx) {
  let m = null;
  if (node.__rsn && ids.has(node.__rsh)) {
    const h = node.__rsh === ctx ? '' : `${ids.get(node.__rsh)}.`;
    m = { n: node.__rsn.map((k) => h + k).join(',') };
  }
  if (node.__lp && ids.has(node.__lp)) {
    m ||= {};
    m.l = String(ids.get(node.__lp));
    m.h = !!node.__hid;
  }
  return m;
}

const markData = (node, m) => `^${node.nodeType === 3 ? 't' : ''}${m.n ?? ''}${m.l ? `@${m.l}` : ''}${m.h ? '!' : ''}`;

/**
 * Siblings in order. A list the client may keep as the server left it (see `setList` in
 * runtime.js) gets its last claim on its first node's mark (`<!--^t1.6~2005-->`), once its
 * marker shows that: its host rendered once, resuming is on, every component in it got a state
 * entry, and its first node is a plain mark in the same parent.
 */
function serializeKids(first, ids, nextId, ctx) {
  const out = [];
  let open = null;
  let count = 0; // nodes the browser will parse from what is written so far
  let prevText = false;
  for (let n = first; n; n = n.nextSibling) {
    if (n.__rsdOf) (open ||= new Map()).set(n.__rsdOf, { i: out.length, s: nextId.stateless(), c: count });
    const o = open && open.get(n);
    if (o) {
      // `~<last claim>:<nodes before the marker>`, so the client steps over them without reading.
      const r = n.__rsr;
      const s = nextId.stateless();
      if (r && n.__rsh.__rc === 1 && s >= 0 && s === o.s && !o.merged && /^<!--\^t[\d.,]+-->$/.test(out[o.i])) out[o.i] = `${out[o.i].slice(0, -3)}~${r[1]}:${count - o.c}-->`;
      open.delete(n);
    }
    const html = serialize(n, ids, nextId, ctx);
    out.push(html);
    if (html === '') continue;
    // Count the nodes: a text the parser would merge into the one before it doesn't count.
    const startsText = html[0] !== '<';
    if (startsText && prevText && open) for (const v of open.values()) v.merged = true;
    count += n.nodeType === 3 ? (html.startsWith('<!--') ? (html.endsWith('-->') ? 1 : 2) : 1) : 1;
    prevText = !html.endsWith('>') || n.nodeType === 3 && !html.endsWith('-->');
  }
  return out.join('');
}

function serialize(node, ids, nextId, ctx) {
  if (node.nodeType === 3) {
    const m = marks(node, ids, ctx);
    const pre = m ? `<!--${markData(node, m)}-->` : '';
    const parent = node.parentNode;
    return pre + (parent && RAW.has(parent.localName) ? node.data : escText(node.data));
  }
  if (node.nodeType === 8) {
    const m = marks(node, ids, ctx);
    if (m) return `<!--${markData(node, m)}-->`;
    return node.data === '' || node.data === 'rs' ? '' : `<!--${node.data}-->`;
  }
  if (node.nodeType !== 1) return '';
  const tag = node.localName;
  let attrs = '';
  for (const a of node.attributes) attrs += a.value === '' ? ` ${a.name}` : ` ${a.name}="${escAttr(a.value)}"`;
  const m = marks(node, ids, ctx);
  if (m) {
    if (m.n) attrs += ` r:n="${m.n}"`;
    if (m.l) attrs += ` r:l="${m.l}"${m.h ? ' r:h' : ''}`;
  }
  let inner = '';
  if (isHost(node)) {
    const id = nextId(node);
    ids.set(node, id);
    attrs += ` s-rs="${id}"${nextId.now ? ' s-rh' : ''}`;
  }
  // The events this element listens to, and the id of the component listening (it may be the
  // element itself, for `<Host onClick>`).
  // Bare when it is `ctx`, the nearest component around the element.
  if (node.__rse && ids.has(node.__rseh)) attrs += ` r:e="${node.__rseh === ctx && node !== ctx ? '' : `${ids.get(node.__rseh)}:`}${[...node.__rse].join(',')}"`;
  // A component with slotted content: the client's scan for another component goes inside.
  if (isHost(node) && node.__slotted && node.__slotted.size) attrs += ' r:s';
  if (isHost(node)) {
    if (node.shadowRoot) {
      const df = node.constructor.__meta.delegatesFocus ? ' shadowrootdelegatesfocus' : '';
      inner += `<template shadowrootmode="open"${df}>`;
      inner += serializeKids(node.shadowRoot.firstChild, ids, nextId, node);
      inner += '</template>';
    }
  }
  if (VOID.has(tag)) return `<${tag}${attrs}>`;
  const kids = tag === 'template' ? node.content : node;
  inner += serializeKids(kids.firstChild, ids, nextId, isHost(node) ? node : ctx);
  return `<${tag}${attrs}>${inner}</${tag}>`;
}
