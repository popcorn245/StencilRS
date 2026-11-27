// A build with `runtimeFeatures` gated (the default, 'auto') hydrates server html in Chromium, and resumes it, as the whole runtime does:
// the page is rendered by runtime-server.js (happy-dom, this process), the client is a production Vite build of the same components.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { build } from 'vite';

import { transpile } from '../index.js';
import { createRenderer } from '../runtime-server.js';
import stencilrs from '../vite.js';

const fixture = join(import.meta.dirname, 'fixtures/runtime-features');
const RUNTIME = pathToFileURL(join(import.meta.dirname, '../runtime.js')).href;

// The server side: the fixture components compiled for the runtime in this process.
const dir = mkdtempSync(join(tmpdir(), 'rs-features-ssr-'));
const modules = ['rf-counter', 'rf-panel', 'rf-light'].map((tag) => {
  const file = join(dir, `${tag}.mjs`);
  const { code, diagnostics } = transpile(readFileSync(join(fixture, `src/${tag}.tsx`), 'utf8'), { file: `${tag}.tsx`, componentExport: 'stencilrs' });
  assert.deepEqual(diagnostics.filter((d) => d.level === 'error'), []);
  writeFileSync(file, code.replaceAll('"@popcorn245/stencilrs/runtime"', JSON.stringify(RUNTIME)));
  return pathToFileURL(file).href;
});
const render = await createRenderer(() => Promise.all(modules.map((m) => import(m))));

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  // no browser here
}
const chromiumOnly = { skip: !chromium && 'playwright not installed', timeout: 120000 };

/** The client: the fixture's components in a production browser build (default runtimeFeatures), as `/out.js`. */
const client = async (entry, options = {}, { minify = true } = {}) => {
  const result = await build({
    root: fixture,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs({ runtime: 'stencilrs', ...options })],
    build: { write: false, minify, lib: { entry: join(fixture, entry), formats: ['es'], fileName: 'out' } },
  });
  return [result].flat().flatMap((r) => r.output).filter((o) => o.type === 'chunk').map((o) => o.code).join('\n');
};

const SHADOW_PAGE = '<rf-panel><b slot="title">T</b>body text</rf-panel><rf-counter label="solo"></rf-counter>';
const LIGHT_PAGE = '<rf-light><i>inside</i> and text</rf-light>';

/** Loads `html` with the client bundle in Chromium and returns what the page looks like before the script, after it, and after two clicks. */
const visit = async (html, js, { clicks = 'rf-counter' } = {}) => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
    await page.route('http://rf.test/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head></head><body>${html}<script type="module" src="/out.js"></script></body></html>` });
      return path === '/out.js' ? route.fulfill({ contentType: 'text/javascript', body: js }) : route.fulfill({ status: 404, body: '' });
    });
    // The server's nodes (not its <style> tags: a shadow root's give way to an adopted sheet), before the client script runs: the page waits for the module's load by holding `/out.js` back.
    let release;
    const held = new Promise((r) => (release = r));
    await page.route('http://rf.test/out.js', async (route) => {
      await held;
      return route.fulfill({ contentType: 'text/javascript', body: js });
    });
    await page.goto('http://rf.test/', { waitUntil: 'commit' });
    await page.waitForSelector(clicks, { state: 'attached' });
    const walk = `(() => { const out = []; const visit = (root) => { for (const el of root.querySelectorAll('*')) { if (el.localName !== 'style') out.push(el); if (el.shadowRoot) visit(el.shadowRoot); } }; visit(document.body); return out; })()`;
    const before = await page.evaluate(`(window.__server = ${walk}).length`);
    release();
    await page.waitForFunction(() => customElements.get('rf-counter') || customElements.get('rf-light'));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));
    const state = await page.evaluate(`({
      kept: window.__server.filter((n) => n.isConnected).length,
      now: ${walk}.length,
      waiting: [...document.querySelectorAll('rf-panel, rf-counter, rf-light')].map((e) => e.localName + ':' + (e.__lazy ? 'waiting' : 'awake')),
      marks: document.querySelectorAll('[r\\\\:n],[r\\\\:l],[r\\\\:e]').length,
    })`);
    return { page, browser, before, state, errors };
  } catch (e) {
    await browser.close();
    throw e;
  }
};

const withPage = async (html, js, fn, options) => {
  const v = await visit(html, js, options);
  try {
    return await fn(v);
  } finally {
    await v.browser.close();
  }
};

/** What `rf-counter solo` shows. */
const solo = (page) => page.evaluate(() => {
  const c = document.querySelector('body > rf-counter');
  return { text: c.shadowRoot.querySelector('button').textContent.trim(), on: [...c.shadowRoot.querySelectorAll('li')].map((li) => li.className) };
});

test('default build (auto), resumable html: waits, then wakes on a click, keeping the server\'s nodes', chromiumOnly, async () => {
  const js = await client('shadow.ts');
  const readable = await client('shadow.ts', {}, { minify: false });
  assert.ok(readable.includes('function hydrateEl') && readable.includes('function resumeEl') && !readable.includes('SlotPart ='), 'sanity: hydration and resuming are in this build, the light-DOM half is not');
  const html = await render(SHADOW_PAGE);
  assert.match(html, /<script type="rs\/state"/);
  await withPage(html, js, async ({ page, state, before, errors }) => {
    assert.equal(state.waiting.length, 2); // the panel and the solo counter; the panel's own counter is in its shadow root
    // Everything waits: nothing hydrated on load, and every server node is still there.
    assert.equal(state.waiting.filter((w) => w.endsWith(':waiting')).length, state.waiting.length);
    assert.equal(state.kept, before);
    assert.equal((await solo(page)).text, 'solo: 0');
    const button = await page.evaluateHandle(() => document.querySelector('body > rf-counter').shadowRoot.querySelector('button'));
    await page.click('body > rf-counter button');
    await page.click('body > rf-counter button');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 30)));
    assert.deepEqual(await solo(page), { text: 'solo: 2', on: ['', '', 'on'] });
    assert.equal(await page.evaluate((b) => document.querySelector('body > rf-counter').shadowRoot.querySelector('button') === b, button), true, 'the server\'s button, not a new one');
    // The panel and its inner counter are untouched: still waiting.
    assert.deepEqual(await page.evaluate(() => [document.querySelector('rf-panel').__lazy, document.querySelector('rf-panel').shadowRoot.querySelector('rf-counter').__lazy].map(Boolean)), [true, true]);
    assert.deepEqual(errors, []);
  });
});

test('default build (auto), non-resumable html: every component hydrates on load, in place', chromiumOnly, async () => {
  const js = await client('shadow.ts');
  const html = await render(SHADOW_PAGE, { resumable: false });
  assert.doesNotMatch(html, /rs\/state/);
  await withPage(html, js, async ({ page, state, before, errors }) => {
    assert.equal(state.waiting.every((w) => w.endsWith(':awake')), true, state.waiting.join());
    assert.equal(state.kept, before, 'every server node survived');
    assert.equal(state.marks, 0, 'the claim marks are gone');
    await page.click('body > rf-counter button');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 30)));
    assert.deepEqual(await solo(page), { text: 'solo: 1', on: ['', 'on', ''] });
    // a slotted node of the panel is the server's
    assert.equal(await page.evaluate(() => document.querySelector('rf-panel b').isConnected && window.__server.includes(document.querySelector('rf-panel b'))), true);
    assert.deepEqual(errors, []);
  });
});

test('build with resume: false, non-resumable html', chromiumOnly, async () => {
  const features = { server: false, hot: false, light: false, signals: false, vnode: false, resume: false };
  const js = await client('shadow.ts', { runtimeFeatures: features });
  const readable = await client('shadow.ts', { runtimeFeatures: features }, { minify: false });
  assert.ok(!readable.includes('resumeEl') && readable.includes('function hydrateEl'));
  await withPage(await render(SHADOW_PAGE, { resumable: false }), js, async ({ page, state, before, errors }) => {
    assert.equal(state.kept, before);
    await page.click('body > rf-counter button');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 30)));
    assert.deepEqual(await solo(page), { text: 'solo: 1', on: ['', 'on', ''] });
    assert.deepEqual(errors, []);
  });
});

test('a light-DOM component on the gated build: the plugin turns light on, and the slotted nodes stay the server\'s', chromiumOnly, async () => {
  const js = await client('all.ts');
  assert.ok((await client('all.ts', {}, { minify: false })).includes('SlotPart ='), 'auto found the scoped component');
  for (const resumable of [false, true]) {
    await withPage(await render(LIGHT_PAGE, { resumable }), js, async ({ page, state, before, errors }) => {
      assert.equal(state.kept, before, `resumable: ${resumable}`);
      if (resumable) await page.evaluate(() => document.querySelector('rf-light').componentOnReady());
      assert.equal(await page.evaluate(() => document.querySelector('rf-light').textContent), 'inside and text');
      assert.equal(await page.evaluate(() => document.querySelector('rf-light i').isConnected && window.__server.includes(document.querySelector('rf-light i'))), true);
      assert.deepEqual(errors, []);
    }, { clicks: 'rf-light' });
  }
});

test('gated and whole-runtime builds hydrate the same page to the same result', chromiumOnly, async () => {
  const gated = await client('shadow.ts');
  const whole = await client('shadow.ts', { runtimeFeatures: false });
  assert.ok(whole.length > gated.length);
  const html = await render(SHADOW_PAGE, { resumable: false });
  const results = [];
  for (const js of [gated, whole]) {
    await withPage(html, js, async ({ page, state, before }) => {
      await page.click('body > rf-counter button');
      await page.click('body > rf-counter button');
      await page.evaluate(() => new Promise((r) => setTimeout(r, 30)));
      results.push({ kept: state.kept === before, marks: state.marks, shown: await solo(page), html: await page.evaluate(() => document.body.innerHTML.replace(/<script[^]*$/, '')) });
    });
  }
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[0].kept, true);
});

test('a build without hydration on a server-rendered page says so (never a silent second render)', chromiumOnly, async () => {
  const js = await client('shadow.ts', { runtimeFeatures: 'client' });
  assert.ok(!(await client('shadow.ts', { runtimeFeatures: 'client' }, { minify: false })).includes('function hydrateEl'));
  await withPage(await render(SHADOW_PAGE, { resumable: false }), js, async ({ errors }) => {
    assert.equal(errors.filter((e) => /server-rendered page, build without hydration/.test(e)).length, 1, 'once for the page, not once per component');
  });
});
