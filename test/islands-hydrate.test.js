// Islands rendered on different worker threads with distinct `idBase`, concatenated into a page, hydrate in Chromium to the same DOM
// as the page rendered in one go, and the components work (a click). Without `idBase` the same page has colliding host ids (control; on this small DSD page the client survives them, on the Ionic kitchen-sink page
// it does not: see examples/ionic/spike/islands/idbase-engine.mjs).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { stencilEngine } from '../express.js';
import { ISLAND_A, ISLAND_B, SHELL } from './fixtures/islands/build.mjs';
import { buildFixture } from './fixtures/islands/setup.mjs';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  // no browser here
}
const skip = !chromium && 'playwright not installed';

const built = await buildFixture({ client: true });
const clientJs = readFileSync(`${built.client}/components.js`, 'utf8');
const engine = stencilEngine({ hydrate: built.hydrate, workers: 2 });
await engine.ready;
after(() => engine.close());

const hostIds = (html) => [...html.matchAll(/\bs-id="(\d+)"/g)].map((m) => m[1]);
const head = (styles) => `<meta charset="utf-8"><title>islands</title>${[...new Map(styles.map((s) => [s.id, s])).values()].map((s) => `<style sty-id="${s.id}">${s.content}</style>`).join('')}`;
const page = (headHtml, body) => `<!doctype html><html><head>${headHtml}</head><body>${body}</body></html>`;

/** The page rendered in one go (a fresh in-process app: Stencil's own numbering), the reference. */
const fullRender = async () => {
  const { renderToString } = await import(`${pathToFileURL(built.plain).href}?full`);
  return (await renderToString(page('<meta charset="utf-8"><title>islands</title>', SHELL(ISLAND_A, ISLAND_B)), { fullDocument: true, buildId: 'b' })).html;
};

/** The page assembled from two islands rendered concurrently, i.e. on the two threads. */
const assemble = async (bases) => {
  const [a, b] = await Promise.all([engine.renderFragment(ISLAND_A, bases[0]), engine.renderFragment(ISLAND_B, bases[1])]);
  return { html: page(head([...a.styles, ...b.styles]), SHELL(a.html, b.html)), a, b };
};

// Self-contained: Playwright serializes these into the page.
function mark(doc) {
  const nodes = [];
  const visit = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.localName === 'script' || el.localName === 'style') continue;
      nodes.push(el);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(doc.body);
  doc.defaultView.__server = nodes;
  return nodes.length;
}
function report(doc) {
  const sig = (node) => {
    if (node.nodeType === 3) return node.nodeValue.trim() ? JSON.stringify(node.nodeValue.trim()) : '';
    if (node.nodeType !== 1 || node.localName === 'style' || node.localName === 'script') return '';
    const attrs = [...node.attributes].filter((a) => !['s-id', 'c-id'].includes(a.name)).map((a) => `${a.name}=${a.value.split(/\s+/).sort().join('.')}`).sort().join(' ');
    return `<${node.localName} ${attrs}${node.shadowRoot ? ' #shadow' : ''}>${[...(node.shadowRoot?.childNodes ?? []), ...node.childNodes].map(sig).join('')}</>`;
  };
  const server = doc.defaultView.__server;
  const hosts = [...doc.querySelectorAll('isl-counter, isl-tag')];
  return {
    sig: sig(doc.body),
    lost: server.filter((n) => !n.isConnected).length,
    notHydrated: hosts.filter((h) => !h.classList.contains('hydrated')).length,
    leftover: doc.querySelectorAll('[s-id],[c-id]').length,
    buttons: [...doc.querySelectorAll('isl-counter')].map((c) => c.shadowRoot.querySelector('button').textContent.trim()),
  };
}
async function click(doc) {
  const out = [];
  for (const c of doc.querySelectorAll('isl-counter')) c.shadowRoot.querySelector('button').click();
  await new Promise((r) => setTimeout(r, 100));
  for (const c of doc.querySelectorAll('isl-counter')) out.push(c.shadowRoot.querySelector('button').textContent.trim());
  return out;
}

const hydrate = async (browser, html) => {
  const ctx = await browser.newContext();
  const tab = await ctx.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message));
  await tab.route('http://isl.test/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === '/' ? { contentType: 'text/html', body: html } : { contentType: 'text/javascript', body: path === '/components.js' ? clientJs : '' });
  });
  await tab.goto('http://isl.test/');
  const marked = await tab.evaluate(`(${mark})(document)`);
  await tab.addScriptTag({ type: 'module', content: "import '/components.js';" });
  await tab.waitForFunction(() => customElements.get('isl-counter') && customElements.get('isl-tag'), null, { timeout: 30_000 });
  await tab.waitForFunction(() => [...document.querySelectorAll('isl-counter')].every((c) => c.shadowRoot?.querySelector('button')), null, { timeout: 30_000 });
  await tab.waitForTimeout(300);
  const state = await tab.evaluate(`(${report})(document)`);
  const clicked = await tab.evaluate(`(${click})(document)`);
  await ctx.close();
  return { marked, state, clicked, errors };
};

test('islands from two threads with distinct idBase: unique host ids, and a page that hydrates like the full render', { skip }, async () => {
  const { html, a, b } = await assemble([{ idBase: 10_000 }, { idBase: 20_000 }]);
  const all = hostIds(html);
  assert.equal(all.length, 5);
  assert.equal(new Set(all).size, 5, 'no id twice');
  assert.equal(a.hydratedCount + b.hydratedCount, 5);

  const browser = await chromium.launch();
  try {
    const [full, islands] = [await hydrate(browser, await fullRender()), await hydrate(browser, html)];
    for (const r of [full, islands]) {
      assert.deepEqual(r.errors, []);
      assert.equal(r.state.lost, 0, 'every server node was adopted, none re-rendered');
      assert.equal(r.state.notHydrated, 0);
      assert.equal(r.state.leftover, 0, 'annotations consumed');
      assert.deepEqual(r.state.buttons, ['A: 1', 'B: 5']);
      assert.deepEqual(r.clicked, ['A: 2', 'B: 6'], 'the click reaches the component');
    }
    assert.equal(islands.marked, full.marked);
    assert.equal(islands.state.sig, full.state.sig, 'hydrated DOM equals the full render\'s');
  } finally {
    await browser.close();
  }
});

test('control: the same islands without idBase collide on host ids', { skip }, async () => {
  const { html } = await assemble([{}, {}]);
  const all = hostIds(html);
  assert.ok(new Set(all).size < all.length, `expected duplicate s-id, got ${all}`);
});
