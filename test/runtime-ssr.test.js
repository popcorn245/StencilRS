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

const strip = (html) => html.replace(/<!--\^[^>]*-->/g, '').replace(/ r:[nes](="[^"]*")?/g, '').replace(/<script type="rs\/state">.*<\/script>$/, '');

test('server: declarative shadow DOM, inlined styles, slots filled', async () => {
  const html = strip(await render(PAGE));
  assert.match(html, /^<style sty-id="ssr-card">\.card\{border:1px solid\}<\/style>/);
  assert.match(html, /<ssr-card heading="Hi" class="sc-ssr-card-h hydrated" s-rs="1">/);
  assert.match(html, /<header class="sc-ssr-card sc-ssr-card-s"><b slot="title" r:l="1">T<\/b><\/header>/);
  assert.match(html, /<main class="sc-ssr-card sc-ssr-card-s">body <i r:l="1">text<\/i><\/main>/);
  assert.match(html, /<ssr-badge class="sc-ssr-card hydrated" s-rs="2"><template shadowrootmode="open"><style sty-id="ssr-badge">:host\{color:red\}<\/style><span class="n">0<\/span><\/template><\/ssr-badge>/);
});

test('server: every node a render claimed is numbered for hydration', async () => {
  const html = await render(PAGE);
  assert.match(html, /<span class="n" r:n="1"><!--\^t3-->0<!--\^2--><\/span>/);
  assert.match(html, /<main class="sc-ssr-card sc-ssr-card-s"><!--\^t@1-->body <i r:l="1">text<\/i><!--\^6--><\/main>/);
  assert.match(html, /<button class="sc-ssr-card" r:n="5" r:e="click">\+<\/button>/);
});

test('server: renders are independent', async () => {
  await render(PAGE);
  const html = strip(await render('<ssr-badge count="3"></ssr-badge>', { resumable: false }));
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
      marks: document.querySelectorAll('[s-rs],[r\\:l],[r\\:n],[r\\:e],[r\\:s]').length + badge.shadowRoot.querySelectorAll('[r\\:n]').length,
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
  const state = await hydrateInChromium(await render(PAGE, { resumable: false }));
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
  const html = (await render(PAGE, { resumable: false })).replace(/<button([^>]*) r:n="5"/, '<button$1');
  const state = await hydrateInChromium(html);
  assert.deepEqual(state.kept, [false, false, true, true, false, false]); // only the slotted children survive
  assert.equal(state.cards, 1);
  assert.equal(state.title, 'T');
  assert.equal(state.main, 'body text');
  assert.equal(state.afterClicks, '2');
  assert.deepEqual(state.errors, []);
});

test('client: a component rendering into another one\'s slots hydrates in place, lists included', chromiumOnly, async () => {
  const html = await render('<ssr-list items="a,b,c"></ssr-list>', { resumable: false });
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

test('server: resumable pages carry each component\'s state and events', async () => {
  const html = await render(PAGE);
  const [, events, json] = html.match(/<script type="rs\/state" e="([^"]*)">(.*?)<\/script>/);
  assert.match(html, /<script>\(d=>\{.*"click".*rsinit.*<\/script>$/);
  // Only what differs from a fresh instance; the events the page must delegate, once.
  assert.deepEqual(JSON.parse(json), { 1: { heading: 'Hi' } });
  assert.equal(events, 'click');
  assert.doesNotMatch(html, / s-rh/);
});

test('client: resuming hydrates nothing on load, then only what an event reaches', chromiumOnly, async () => {
  const html = await render('<ssr-list items="a,b,c"></ssr-list><ssr-card heading="Other"></ssr-card>');
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
    await page.evaluate(() => (window.before = [...document.querySelectorAll('li')]));
    await page.evaluate(() => Promise.all(['/ssr-badge.js', '/ssr-card.js', '/ssr-list.js'].map((f) => import(f))));
    const waiting = () => page.evaluate(() => [...document.querySelectorAll('ssr-list, ssr-card, ssr-badge')].map((e) => `${e.localName}:${e.__lazy ? 'waiting' : 'awake'}`));
    assert.deepEqual(await waiting(), ['ssr-list:waiting', 'ssr-card:waiting', 'ssr-badge:waiting', 'ssr-card:waiting', 'ssr-badge:waiting']);
    // State came from the page: no render needed to read it.
    assert.equal(await page.evaluate(() => document.querySelectorAll('ssr-card')[1].heading), 'Other');
    // A click in the second card wakes that card (and nothing else) before its handler runs.
    await page.click('ssr-card:nth-of-type(2) button, body > ssr-card button');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 10)));
    assert.deepEqual(await waiting(), ['ssr-list:waiting', 'ssr-card:waiting', 'ssr-badge:waiting', 'ssr-card:awake', 'ssr-badge:awake']);
    assert.equal(await page.evaluate(() => document.querySelectorAll('ssr-badge')[1].shadowRoot.querySelector('.n').textContent), '1');
    // A property change wakes a component too; the nodes are still the server's.
    await page.evaluate(() => (document.querySelector('ssr-list').items = 'c,a'));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 10)));
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('ssr-list li')].map((li) => li.textContent)), ['c', 'a']);
    assert.equal(await page.evaluate(() => document.querySelectorAll('ssr-list li')[1] === window.before[0]), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

/** Serves `html` and the compiled fixtures to a fresh Chromium page; the components load on `define()`. */
async function servePage(browser, html) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const files = { '/runtime.js': readFileSync(new URL('../runtime.js', import.meta.url), 'utf8') };
  files['/runtime-hot.js'] = readFileSync(new URL('../runtime-hot.js', import.meta.url), 'utf8');
  const sources = compiledSources('/runtime.js');
  for (const tag in sources) files[`/${tag}.js`] = sources[tag];
  await page.route('http://rs.test/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head></head><body>${html}</body></html>` });
    return route.fulfill({ contentType: 'text/javascript', body: files[path] ?? '' });
  });
  await page.goto('http://rs.test/');
  const define = () => page.evaluate(() => Promise.all(['/ssr-badge.js', '/ssr-card.js', '/ssr-list.js', '/ssr-shop.js', '/ssr-live.js'].map((f) => import(f))));
  const tick = () => page.evaluate(() => new Promise((r) => setTimeout(r, 20)));
  return { page, errors, define, tick };
}

test('server: a list with nothing to run on the client says how far it reaches', async () => {
  const html = await render('<ssr-shop></ssr-shop>');
  // Its first node's mark carries the list's last claim and how many nodes it spans.
  assert.match(html, /<ul><!--\^t\d+~\d+:\d+-->/);
  // Not when resuming is off: every component hydrates, so the list must too.
  assert.doesNotMatch(await render('<ssr-shop></ssr-shop>', { resumable: false }), /~\d+:\d+/);
});

test('client: a woken component keeps a server list as it is until the list changes', chromiumOnly, async () => {
  const browser = await chromium.launch();
  try {
    const { page, errors, define, tick } = await servePage(browser, await render('<ssr-shop></ssr-shop>'));
    await page.evaluate(() => (window.before = [...document.querySelectorAll('ssr-shop li')]));
    await define();
    await page.click('ssr-shop button');
    await tick();
    assert.equal(await page.textContent('ssr-shop button'), '1');
    // The list wasn't touched: its items still carry the server's marks.
    assert.equal(await page.evaluate(() => document.querySelectorAll('ssr-shop li[r\\:n]').length), 3);
    // Now it changes: the server's items are adopted in place, then moved.
    await page.evaluate(() => (document.querySelector('ssr-shop').items = 'ccc,a,bb,dddd'));
    await tick();
    const after = await page.evaluate(() => {
      const lis = [...document.querySelectorAll('ssr-shop li')];
      return {
        text: lis.map((li) => li.textContent),
        kept: [lis[0] === window.before[2], lis[1] === window.before[0], lis[2] === window.before[1]],
        marks: document.querySelectorAll('ssr-shop [r\\:n]').length,
        badges: lis.map((li) => li.querySelector('ssr-badge').count),
      };
    });
    assert.deepEqual(after, { text: ['ccc', 'a', 'bb', 'dddd'], kept: [true, true, true], marks: 0, badges: [3, 1, 2, 4] });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('client: events from before the runtime arrived are replayed once it has', chromiumOnly, async () => {
  const browser = await chromium.launch();
  try {
    let fired = false;
    const html = await render('<ssr-shop></ssr-shop>');
    const { page, errors, define, tick } = await servePage(browser, html);
    fired = await page.evaluate(() => !!document.__rsq);
    assert.equal(fired, true);
    await page.click('ssr-shop button');
    await page.click('ssr-shop button');
    assert.equal(await page.textContent('ssr-shop button'), '0');
    await define();
    await tick();
    assert.equal(await page.textContent('ssr-shop button'), '2');
    // And from then on, events go straight to the component.
    await page.click('ssr-shop button');
    await tick();
    assert.equal(await page.textContent('ssr-shop button'), '3');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('dev: the hot module warns about a mismatch and swaps a redefined component in place', chromiumOnly, async () => {
  const browser = await chromium.launch();
  try {
    const html = (await render(PAGE, { resumable: false })).replace(/<button([^>]*) r:n="5"/, '<button$1');
    const { page, errors, define, tick } = await servePage(browser, html);
    const warnings = [];
    page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
    await page.evaluate(() => import('/runtime-hot.js'));
    await define();
    await page.evaluate(() => document.querySelector('ssr-card').componentOnReady());
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /<ssr-card> rendered differently on the client than on the server/);
    // The same tag defined again: the live badge takes the new class's render.
    await page.evaluate(async () => {
      const { Base, define, template, t } = await import('/runtime.js');
      const tmpl = template('<em><!--rs--></em>', [[0, 0]], false, null);
      class Badge2 extends Base {
        render() {
          return t(tmpl, [`new ${this.count}`]);
        }
      }
      define(Badge2, { tag: 'ssr-badge', scoped: false, shadow: true, members: { count: [129, 'count'] } });
    });
    await page.click('ssr-card button');
    await tick();
    assert.equal(await page.evaluate(() => document.querySelector('ssr-badge').shadowRoot.querySelector('em').textContent), 'new 1');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('a signal passed to the template follows it: server value, then bound on load without a render', chromiumOnly, async () => {
  const html = await render('<ssr-live></ssr-live>');
  // Bound parts must be bound on load, so the component doesn't wait (`s-rh`); nothing watches on the server.
  assert.match(html, /<ssr-live class="[^"]*" s-rs="1" s-rh><p class="on" r:n="[\d,]+"><!--\^t\d+-->on<!--\^\d+--><\/p>/);
  assert.equal(globalThis.__ssrLive.watchers, 0);
  const browser = await chromium.launch();
  try {
    const { page, errors, define, tick } = await servePage(browser, html);
    await page.evaluate(() => (window.before = document.querySelector('ssr-live p')));
    await define();
    await tick();
    const state = () =>
      page.evaluate(() => {
        const p = document.querySelector('ssr-live p');
        return { text: p.textContent, cls: p.className, same: p === window.before, watchers: globalThis.__ssrLive.watchers };
      });
    assert.deepEqual(await state(), { text: 'on', cls: 'on', same: true, watchers: 2 });
    await page.evaluate(() => (globalThis.__ssrLive.value = 'off'));
    assert.deepEqual(await state(), { text: 'off', cls: 'off', same: true, watchers: 2 });
    // Removed from the page, it lets go of the signal.
    await page.evaluate(() => document.querySelector('ssr-live').remove());
    assert.equal((await page.evaluate(() => globalThis.__ssrLive.watchers)), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
