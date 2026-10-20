// Hydrate the server-rendered page in happy-dom (its own process: it installs a window as globals).
//
//   node ssr/hydrate-happy-dom.mjs <server-rendered.html> <client bundle>
//
// Prints one JSON line: the page's state after the client bundle loaded.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { GlobalWindow } from 'happy-dom';

import { clickSwitch, hydrationState, markServerNodes } from './page.mjs';

const [htmlFile, bundle] = process.argv.slice(2);
const window = new GlobalWindow({ url: 'http://localhost/' });
// The bundle reads `customElements`, `HTMLElement`, `document`... as globals: lend it the window's.
for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis)) Object.defineProperty(globalThis, key, { configurable: true, get: () => window[key] });
}
// Node has its own Event classes, which a happy-dom EventTarget rejects.
for (const key of ['Event', 'CustomEvent', 'EventTarget', 'MessageEvent', 'KeyboardEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: window[key] });
}
Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
const doc = window.document;
doc.write(readFileSync(htmlFile, 'utf8'));

const marked = markServerNodes(doc);
const errors = [];
const note = (e) => errors.push(String(e?.stack ?? e).split('\n').slice(0, 2).join(' ').slice(0, 300));
console.error = (...args) => note(args[0]);
window.addEventListener('error', (e) => note(e.error ?? e.message));
process.on('unhandledRejection', note);

await import(pathToFileURL(bundle).href);
await new Promise((resolve) => setTimeout(resolve, 300)); // the components' first (hydrating) render

const state = hydrationState(doc);
const click = await clickSwitch(doc);
console.log(JSON.stringify({ marked, ...state, click, errors }));
await window.happyDOM.close();
process.exit(0);
