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

test('server: declarative shadow DOM, inlined styles, slots filled, hydration marks', async () => {
  const html = await render(PAGE);
  assert.match(html, /^<style sty-id="ssr-card">\.card\{border:1px solid\}<\/style>/);
  assert.match(html, /<ssr-card heading="Hi" class="sc-ssr-card-h hydrated" s-rs="1">/);
  assert.match(html, /<header class="sc-ssr-card sc-ssr-card-s"><b slot="title" rs-l="1">T<\/b><\/header>/);
  assert.match(html, /<main class="sc-ssr-card sc-ssr-card-s"><!--rs-l:1-->body <i rs-l="1">text<\/i><\/main>/);
  assert.match(html, /<ssr-badge class="sc-ssr-card hydrated" s-rs="2"><template shadowrootmode="open"><style>:host\{color:red\}<\/style><span class="n">0<\/span><\/template><\/ssr-badge>/);
  assert.doesNotMatch(html, /<!---->/); // runtime markers stay out
});

test('server: renders are independent', async () => {
  await render(PAGE);
  const html = await render('<ssr-badge count="3"></ssr-badge>');
  assert.equal(html, '<ssr-badge count="3" class="hydrated" s-rs="1"><template shadowrootmode="open"><style>:host{color:red}</style><span class="n">3</span></template></ssr-badge>');
});

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  // no browser here
}

test('client: hydrates the server markup and takes over', { skip: !chromium && 'playwright not installed' }, async () => {
  const html = await render(PAGE);
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
    // Server markup is on screen before any script runs.
    assert.equal(await page.evaluate(() => document.querySelector('ssr-badge').shadowRoot.querySelector('.n').textContent), '0');
    await page.evaluate(() => Promise.all(['/ssr-badge.js', '/ssr-card.js'].map((f) => import(f))));
    await page.evaluate(() => document.querySelector('ssr-card').componentOnReady());
    const state = await page.evaluate(() => {
      const card = document.querySelector('ssr-card');
      return {
        cards: card.querySelectorAll('.card').length,
        badges: card.querySelectorAll('ssr-badge').length,
        title: card.querySelector('header').innerHTML,
        main: card.querySelector('main').textContent,
        marks: document.querySelectorAll('[s-rs],[rs-l]').length,
        styles: document.querySelectorAll('style[sty-id="ssr-card"]').length,
        shadow: card.querySelector('ssr-badge').shadowRoot.innerHTML,
      };
    });
    assert.deepEqual(state, {
      cards: 1,
      badges: 1,
      title: '<b slot="title">T</b><!--rs-->',
      main: 'body text',
      marks: 0,
      styles: 1,
      shadow: '<span class="n">0<!--rs--></span><!---->',
    });
    // Interactive: the client runtime owns it now.
    await page.click('ssr-card button');
    await page.click('ssr-card button');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 10)));
    assert.equal(await page.evaluate(() => document.querySelector('ssr-badge').shadowRoot.querySelector('.n').textContent), '2');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
