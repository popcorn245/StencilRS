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
// numbers, `rs-n="<host>.<n>"`, and each child a light-DOM host moved into a slot carries
// `rs-l="<host>"`; text and comments carry the same in a `<!--rs ...-->` comment. The client's
// first render looks the claimed nodes up and keeps them (hydration in place).
//
// One window per renderer, renders one at a time: the runtime keeps per-document state.

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['style', 'script']);
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const isHost = (el) => !!el.constructor?.__meta;

/** Installs a happy-dom window's globals, then imports the components. */
export async function createRenderer(load, { url = 'http://localhost/', settleRounds = 20 } = {}) {
  const { Window } = await import('happy-dom');
  const window = new Window({ url });
  const keep = new Set(Object.getOwnPropertyNames(globalThis));
  for (const key of Object.getOwnPropertyNames(window)) {
    if (keep.has(key) || key === 'undefined' || key === 'NaN' || key === 'Infinity') continue;
    try {
      Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
    } catch {
      // read-only on this Node: leave Node's own
    }
  }
  for (const key of ['window', 'document', 'customElements', 'HTMLElement', 'Node', 'Element', 'Event', 'CustomEvent', 'EventTarget', 'navigator', 'location']) {
    Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true });
  }
  globalThis.__RS_SERVER__ = true;
  await load();

  const document = window.document;
  let queue = Promise.resolve();
  const render = async (html) => {
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
    let out = '';
    for (let n = document.body.firstChild; n; n = n.nextSibling) out += serialize(n, ids, () => ++next);
    document.body.replaceChildren();
    return styles + out;
  };
  return (html) => (queue = queue.then(() => render(html), () => render(html)));
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

/** The hydration marks of a node: its claim numbers (`n=`) and the host it is a logical child of (`l=`). */
function marks(node, ids) {
  const out = [];
  if (node.__rsn && ids.has(node.__rsh)) {
    const h = ids.get(node.__rsh);
    out.push(['n', node.__rsn.map((k) => `${h}.${k}`).join(',')]);
  }
  if (node.__lp && ids.has(node.__lp)) {
    out.push(['l', String(ids.get(node.__lp))]);
    if (node.__hid) out.push(['h', '']);
  }
  return out;
}

function serialize(node, ids, nextId) {
  if (node.nodeType === 3) {
    const m = marks(node, ids);
    const pre = m.length ? `<!--rs t ${m.map(([k, v]) => (v ? `${k}=${v}` : k)).join(' ')}-->` : '';
    const parent = node.parentNode;
    return pre + (parent && RAW.has(parent.localName) ? node.data : escText(node.data));
  }
  if (node.nodeType === 8) {
    const m = marks(node, ids);
    if (m.length) return `<!--rs ${m.map(([k, v]) => (v ? `${k}=${v}` : k)).join(' ')}-->`;
    return node.data === '' || node.data === 'rs' ? '' : `<!--${node.data}-->`;
  }
  if (node.nodeType !== 1) return '';
  const tag = node.localName;
  let attrs = '';
  for (const a of node.attributes) attrs += a.value === '' ? ` ${a.name}` : ` ${a.name}="${escAttr(a.value)}"`;
  for (const [k, v] of marks(node, ids)) attrs += v ? ` rs-${k}="${v}"` : ` rs-${k}`;
  let inner = '';
  if (isHost(node)) {
    const id = nextId();
    ids.set(node, id);
    attrs += ` s-rs="${id}"`;
    if (node.shadowRoot) {
      const df = node.constructor.__meta.delegatesFocus ? ' shadowrootdelegatesfocus' : '';
      inner += `<template shadowrootmode="open"${df}>`;
      for (let n = node.shadowRoot.firstChild; n; n = n.nextSibling) inner += serialize(n, ids, nextId);
      inner += '</template>';
    }
  }
  if (VOID.has(tag)) return `<${tag}${attrs}>`;
  const kids = tag === 'template' ? node.content : node;
  for (let n = kids.firstChild; n; n = n.nextSibling) inner += serialize(n, ids, nextId);
  return `<${tag}${attrs}>${inner}</${tag}>`;
}
