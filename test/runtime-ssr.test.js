// Server rendering and hydration for the stencilrs runtime: render in happy-dom (this process),
// then load the markup in Chromium with the same components and check that the client takes over.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { createRenderer } from '../runtime-server.js';
import { compiledSources, compileFixtures } from './runtime-ssr-fixture.mjs';

const render = await createRenderer(compileFixtures());
const PAGE = '<ssr-card heading="Hi"><b slot="title">T</b>body <i>text</i></ssr-card>';

const strip = (html) => html.replace(/<!--rs [^>]*-->/g, '').replace(/ rs-n="[^"]*"/g, '');

test('server: declarative shadow DOM, inlined styles, slots filled', async () => {
  const html = strip(await render(PAGE));
  assert.match(html, /^<style sty-id="ssr-card">\.card\{border:1px solid\}<\/style>/);
  assert.match(html, /<ssr-card heading="Hi" class="sc-ssr-card-h hydrated" s-rs="1">/);
  assert.match(html, /<header class="sc-ssr-card sc-ssr-card-s"><b slot="title" rs-l="1">T<\/b><\/header>/);
  assert.match(html, /<main class="sc-ssr-card sc-ssr-card-s">body <i rs-l="1">text<\/i><\/main>/);
  assert.match(html, /<ssr-badge class="sc-ssr-card hydrated" s-rs="2"><template shadowrootmode="open"><style sty-id="ssr-badge">:host\{color:red\}<\/style><span class="n">0<\/span><\/template><\/ssr-badge>/);
});

test('server: every node a render claimed is numbered for hydration', async () => {
  const html = await render(PAGE);
  assert.match(html, /<span class="n" rs-n="2\.2"><!--rs t n=2\.4-->0<!--rs n=2\.3--><\/span>/);
  assert.match(html, /<main class="sc-ssr-card sc-ssr-card-s"><!--rs t l=1-->body <i rs-l="1">text<\/i><!--rs n=1\.7--><\/main>/);
});

test('server: renders are independent', async () => {
  await render(PAGE);
  const html = strip(await render('<ssr-badge count="3"></ssr-badge>'));
  assert.equal(html, '<ssr-badge count="3" class="hydrated" s-rs="1"><template shadowrootmode="open"><style sty-id="ssr-badge">:host{color:red}</style><span class="n">3</span></template></ssr-badge>');
});

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  // no browser here
}

async function hydrateInChromium(html) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const files = { '/runtime.js': readFileSync(new URL('../runtime.js', import.meta.url), 'utf8') };
  const sources = compiledSources('/runtime.js');
  for (const tag in sources) files[`/${tag}.js`] = sources[tag];
  await page.route('http://rs.test/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head></head><body>${html}</body></html>` });
    return route.fulfill({ contentType: 'text/javascript', body: files[path] ?? '' });
  });
  await page.goto('http://rs.test/');
  // The server's nodes, before any script runs.
  await page.evaluate(() => {
    const card = document.querySelector('ssr-card');
    const badge = card.querySelector('ssr-badge');
    window.before = [card.querySelector('.card'), card.querySelector('button'), card.querySelector('b'), card.querySelector('i'), badge, badge.shadowRoot.querySelector('.n')];
  });
  await page.evaluate(() => Promise.all(['/ssr-badge.js', '/ssr-card.js', '/ssr-list.js'].map((f) => import(f))));
  await page.evaluate(() => document.querySelector('ssr-card').componentOnReady());
  const state = await page.evaluate(() => {
    const card = document.querySelector('ssr-card');
    const badge = card.querySelector('ssr-badge');
    const after = [card.querySelector('.card'), card.querySelector('button'), card.querySelector('b'), card.querySelector('i'), badge, badge.shadowRoot.querySelector('.n')];
    return {
      kept: after.map((n, i) => n === window.before[i]),
      cards: card.querySelectorAll('.card').length,
      title: card.querySelector('header').textContent,
      main: card.querySelector('main').textContent,
      marks: document.querySelectorAll('[s-rs],[rs-l],[rs-n]').length + badge.shadowRoot.querySelectorAll('[rs-n]').length,
      styles: document.querySelectorAll('style[sty-id="ssr-card"]').length + badge.shadowRoot.querySelectorAll('style').length,
      count: badge.shadowRoot.querySelector('.n').textContent,
    };
  });
  await page.click('ssr-card button');
  await page.click('ssr-card button');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 10)));
  state.afterClicks = await page.evaluate(() => document.querySelector('ssr-badge').shadowRoot.querySelector('.n').textContent);
  state.errors = errors;
  await browser.close();
  return state;
}

const chromiumOnly = { skip: !chromium && 'playwright not installed' };

test('client: hydrates in place, keeping every server node, and takes over', chromiumOnly, async () => {
  const state = await hydrateInChromium(await render(PAGE));
  assert.deepEqual(state, {
    kept: [true, true, true, true, true, true],
    cards: 1,
    title: 'T',
    main: 'body text',
    marks: 0,
    styles: 1, // the shadow root's server <style> gave way to an adopted sheet
    count: '0',
    afterClicks: '2',
    errors: [],
  });
});

test('client: a mismatch falls back to rendering again, and still takes over', chromiumOnly, async () => {
  // Drop one claimed number: the card can't find its button and renders from scratch.
  const html = (await render(PAGE)).replace(/<button([^>]*) rs-n="1\.6"/, '<button$1');
  const state = await hydrateInChromium(html);
  assert.deepEqual(state.kept, [false, false, true, true, false, false]); // only the slotted children survive
  assert.equal(state.cards, 1);
  assert.equal(state.title, 'T');
  assert.equal(state.main, 'body text');
  assert.equal(state.afterClicks, '2');
  assert.deepEqual(state.errors, []);
});

test('client: a component rendering into another one\'s slots hydrates in place, lists included', chromiumOnly, async () => {
  const html = await render('<ssr-list items="a,b,c"></ssr-list>');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const files = { '/runtime.js': readFileSync(new URL('../runtime.js', import.meta.url), 'utf8') };
    const sources = compiledSources('/runtime.js');
    for (const tag in sources) files[`/${tag}.js`] = sources[tag];
    await page.route('http://rs.test/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head></head><body>${html}</body></html>` });
      return route.fulfill({ contentType: 'text/javascript', body: files[path] ?? '' });
    });
    await page.goto('http://rs.test/');
    await page.evaluate(() => (window.before = [...document.querySelectorAll('li, span[slot], ssr-card, .card')]));
    // Children before parents, the order a page that loads its modules separately can see.
    await page.evaluate(() => Promise.all(['/ssr-badge.js', '/ssr-card.js', '/ssr-list.js'].map((f) => import(f))));
    await page.evaluate(() => document.querySelector('ssr-list').componentOnReady());
    const kept = await page.evaluate(() => [...document.querySelectorAll('li, span[slot], ssr-card, .card')].map((n, i) => n === window.before[i]));
    assert.ok(kept.length === 6 && kept.every(Boolean), `kept ${kept}`);
    assert.equal(await page.evaluate(() => document.querySelector('header').textContent), '3 items');
    await page.evaluate(() => (document.querySelector('ssr-list').items = 'c,a'));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 10)));
    const after = await page.evaluate(() => ({
      lis: [...document.querySelectorAll('main li')].map((li) => li.textContent),
      sameA: document.querySelectorAll('li')[1] === window.before[3], // "a" moved, not re-created
      title: document.querySelector('header').textContent,
      cards: document.querySelectorAll('.card').length,
    }));
    assert.deepEqual(after, { lis: ['c', 'a'], sameA: true, title: '2 items', cards: 1 });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
