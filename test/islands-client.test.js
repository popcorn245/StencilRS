// Client directives (issue #195): `client="load | idle | visible | static | none"` on `<stencil-island>`, the boot configuration the engine writes
// (`islands.client`), the `connectedCallback` gate, and what a static island drops. The Chromium checks hydrate a page rendered by the engine with the
// per-component modules of a `hydrateClient: { islands: true }` build and look at what loads, what hydrates and when.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { gzipSync } from 'node:zlib';

import { build } from 'vite';

import { stencilEngine } from '../express.js';
import { stripAnnotations } from '../express-islands.js';
import { bootConfig, bootTag, insertBeforeBodyEnd, normalizeClient } from '../islands-manifest.js';
import stencilrs from '../vite.js';
import { buildFixture } from './fixtures/islands/setup.mjs';
import { root } from './fixtures/islands/build.mjs';

// --- the pure pieces -------------------------------------------------------------------------------------------------

test('stripAnnotations: drops the hydration annotations and nothing else', () => {
  const html = '<!--r.12--><isl-counter s-id="12" c-id="1.0.0.0" s-mode="md" class="hydrated" sty-id="x"><!--o.1.2.3--><!--t.1.2--> text <!-- keep --></isl-counter><p s-sn>x</p><p s-sn="">y</p>';
  assert.equal(stripAnnotations(html), '<isl-counter class="hydrated" sty-id="x"> text <!-- keep --></isl-counter><p s-sn>x</p><p>y</p>');
});

const components = { version: 1, tags: { 'x-a': 'components/x-a.js', 'x-b': 'components/x-b.js', 'x-c': 'components/x-c.js' }, imports: { 'components/x-a.js': ['runtime-1.js'], 'components/x-b.js': ['runtime-1.js', 'util-2.js'] } };
const client = normalizeClient({ base: '/c', manifest: components, init: ['init.js'] });

test('bootConfig: the module of every tag, none for static and none, and the tags the build has no module for', () => {
  const config = bootConfig(
    { shell: ['x-a'], islands: [{ name: 'f', client: 'visible', tags: ['x-b', 'x-a'] }, { name: 's', client: 'static', tags: ['x-c'] }, { name: 'n', client: 'none', tags: ['x-c'] }, { name: 'u', client: 'load', tags: ['x-zzz'] }] },
    client
  );
  assert.deepEqual(config, {
    base: '/c/',
    init: ['init.js'],
    shell: ['components/x-a.js'],
    islands: [{ name: 'f', client: 'visible', files: ['components/x-b.js', 'components/x-a.js'] }, { name: 's', client: 'static', files: [] }, { name: 'n', client: 'none', files: [] }, { name: 'u', client: 'load', files: [] }],
    missing: ['x-zzz'],
  });
});

test('bootTag: preloads the eager modules and what they import, the manifest as JSON that cannot close its script, the boot script', () => {
  const config = bootConfig({ shell: ['x-a'], islands: [{ name: '</script><b>&', client: 'load', tags: ['x-b'] }, { name: 'v', client: 'visible', tags: ['x-c'] }] }, client);
  const tag = bootTag(config, client);
  assert.deepEqual([...tag.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]), ['/c/init.js', '/c/components/x-a.js', '/c/runtime-1.js', '/c/components/x-b.js', '/c/util-2.js']);
  const json = /<script type="application\/json" id="stencil-islands">(.*?)<\/script>/s.exec(tag)[1];
  assert.doesNotMatch(json, /[<>&]/);
  assert.equal(JSON.parse(json).islands[0].name, '</script><b>&');
  assert.match(tag, /<script type="module" src="\/c\/islands\.js"><\/script>$/);
  assert.doesNotMatch(bootTag(config, { ...client, preload: false, script: false }), /modulepreload|type="module"/);
});

test('insertBeforeBodyEnd, and the options islands.client refuses', () => {
  assert.equal(insertBeforeBodyEnd('<body><p>a</p></BODY></html>', '<s>'), '<body><p>a</p><s></BODY></html>');
  assert.equal(insertBeforeBodyEnd('<p>a</p>', '<s>'), '<p>a</p><s>');
  assert.throws(() => normalizeClient({ manifest: components, scripts: 1 }), /unknown `islands.client` option `scripts`/);
  assert.throws(() => normalizeClient({}), /components\.json of a hydrateClient build/);
  assert.throws(() => normalizeClient(false), /must be true or/);
  assert.throws(() => stencilEngine({ hydrate: './x.js', islands: { client: { manifest: components, bogus: 1 } } }), /unknown `islands.client` option `bogus`/);
});

// --- the fixture: a client build with per-component modules, the hydrate app, and a page ---------------------------------

const fixtureClient = async () => {
  const entry = join(mkdtempSync(join(tmpdir(), 'stencilrs-islands-entry-')), 'all.mjs');
  const src = join(root, 'src');
  writeFileSync(entry, readdirSync(src).filter((f) => f.endsWith('.tsx')).map((f) => `import ${JSON.stringify(join(src, f))};`).join('\n') + '\n');
  const result = await build({ root, configFile: false, logLevel: 'silent', plugins: [stencilrs({ hydrateClient: { islands: true } })], build: { write: false, lib: { entry, formats: ['es'], fileName: 'all' } } });
  return new Map([result].flat().flatMap((r) => r.output.map((o) => [o.fileName, o.type === 'chunk' ? o.code : String(o.source)])));
};

const files = await fixtureClient();
const built = await buildFixture();
const manifest = JSON.parse(files.get('components.json'));

const VIEW = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>islands client</title></head>
<body>
<h1>Directives</h1>
<stencil-island name="a" client="load"><section><isl-counter label="A" count="1"></isl-counter><isl-tabs><isl-tab>one</isl-tab><isl-tab>two</isl-tab></isl-tabs></section></stencil-island>
<stencil-island name="i" client="idle"><p><isl-tag>idle</isl-tag></p></stencil-island>
<stencil-island name="s" client="static"><div id="s"><isl-counter label="S" count="7"><isl-tag>static</isl-tag></isl-counter><isl-stamp text="stamp"></isl-stamp></div></stencil-island>
<stencil-island name="n" client="none"><div id="n"><isl-counter label="N" count="9"></isl-counter></div></stencil-island>
<div style="height: 3000px">spacer</div>
<stencil-island name="v" client="visible"><div id="v"><isl-note text="visible"></isl-note></div></stencil-island>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'stencilrs-islands-client-'));
const view = join(dir, 'page.html');
writeFileSync(view, VIEW);
const engine = stencilEngine({ hydrate: built.hydrate, workers: 0, renderOptions: { buildId: 'b', prettyHtml: false }, islands: { client: { base: '/', manifest } } });
await engine.ready;
after(() => engine.close());
const render = () => new Promise((ok, no) => engine(view, {}, (e, h) => (e ? no(e) : ok(h))));
const html = await render();
const config = JSON.parse(/id="stencil-islands">(.*?)<\/script>/s.exec(html)[1]);

test('the engine writes the boot configuration before </body>, from what each part rendered', () => {
  assert.match(html, /<script type="module" src="\/islands\.js"><\/script><\/body>/);
  const byName = Object.fromEntries(config.islands.map((i) => [i.name, i]));
  assert.deepEqual(config.shell, []);
  assert.deepEqual(byName.a.files.sort(), ['components/isl-counter.js', 'components/isl-tab.js', 'components/isl-tabs.js']);
  assert.deepEqual(byName.i.files, ['components/isl-tag.js']);
  assert.deepEqual(byName.v.files, ['components/isl-note.js']);
  assert.deepEqual([byName.s.files, byName.n.files], [[], []], 'nothing of a static or none island is loaded');
  assert.deepEqual(config.islands.map((i) => i.client), ['load', 'idle', 'static', 'none', 'visible']);
  for (const f of config.islands.flatMap((i) => i.files)) assert.ok(files.has(f), `${f} is in the build`);
  assert.equal(config.missing, undefined);
  assert.equal((html.match(/rel="modulepreload"/g) ?? []).length >= 3, true, 'the load island\'s modules are preloaded');
  assert.doesNotMatch(html, /modulepreload" href="\/components\/isl-note/, 'the visible island\'s are not');
});

test('a static or none island loses its hydration annotations, the others keep theirs', () => {
  const island = (name) => new RegExp(`<div data-island="${name}"[^>]*>[\\s\\S]*?(?= <div |</body>)`).exec(html)?.[0] ?? '';
  for (const name of ['s', 'n']) assert.doesNotMatch(island(name), /\b(?:s-id|c-id|s-sn)=|<!--[rostc]\./, `island ${name}`);
  assert.match(island('s'), /<isl-counter[^>]*>\s*<template shadowrootmode="open">/, 'its shadow roots are still there');
  assert.match(island('v'), /s-id="/);
  assert.match(html, /<div data-island="s" data-client="static" id="s">/);
  assert.match(html, /<isl-counter label="A"[^>]*s-id="\d+"/, 'the load island\'s host still has its id');
});

test('without islands.client the page is what it was: annotations on every island, no boot', async () => {
  const plain = stencilEngine({ hydrate: built.hydrate, workers: 0, renderOptions: { buildId: 'b', prettyHtml: false }, islands: {} });
  const out = await new Promise((ok, no) => plain(view, {}, (e, h) => (e ? no(e) : ok(h))));
  await plain.close();
  assert.doesNotMatch(out, /stencil-islands|modulepreload/);
  assert.match(out, /<div data-island="s" data-client="static" id="s"><isl-counter[^>]* s-id="/, 'the static island keeps its annotations without a client that honors the directive');
});

test('page.clientManifest() and bootTag() on renderIslands', async () => {
  const page = await engine.renderIslands(view);
  const m = await page.clientManifest();
  assert.deepEqual(m.islands.map((i) => [i.name, i.tags]), [['a', ['isl-counter', 'isl-tab', 'isl-tabs']], ['i', ['isl-tag']], ['s', ['isl-counter', 'isl-stamp', 'isl-tag']], ['n', ['isl-counter']], ['v', ['isl-note']]]);
  assert.match(await page.bootTag(), /^<link rel="modulepreload"/);
});

test('engine.stream writes the same boot before </body> in the closing chunk, in order and out of order, and strips static islands too', async () => {
  const bootOf = (page) => /<link rel="modulepreload"[\s\S]*<\/script>(?=<\/body>)/.exec(page)?.[0];
  for (const mode of ['in-order', 'out-of-order']) {
    const chunks = [];
    for await (const c of engine.stream(view, {}, { mode })) chunks.push(c);
    const page = chunks.join('');
    assert.equal((page.match(/id="stencil-islands"/g) ?? []).length, 1, mode);
    assert.equal(bootOf(page), bootOf(html), `${mode}: the boot equals the one res.render writes`);
    assert.match(chunks.at(-1), /<script type="module" src="\/islands\.js"><\/script><\/body>/, `${mode}: in the chunk that closes the page`);
    assert.match(page, /<div data-island="s" data-client="static" id="s"><isl-counter(?![^>]* s-id=)/, `${mode}: the static island has no annotations`);
  }
});

test('the boot script is about 1.5 KB gzipped', () => {
  const boot = files.get('islands.js');
  assert.ok(boot, 'hydrateClient.islands emits islands.js');
  const gz = gzipSync(boot, { level: 9 }).length;
  assert.ok(gz < 1800, `islands.js is ${gz} B gzipped`);
  assert.equal(files.has('islands.js') && !readdirSync(root).includes('islands.js'), true);
  assert.equal([...files.keys()].some((f) => f === 'islands.js'), true);
});

// --- Chromium ---------------------------------------------------------------------------------------------------------

const chromiumPath = () => {
  const candidates = [process.env.STENCILRS_CHROMIUM, join(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers', 'chromium')];
  try {
    candidates.push(createRequire(import.meta.url)('playwright').chromium.executablePath());
  } catch {
    return null;
  }
  return candidates.find((c) => c && existsSync(c)) ?? null;
};
const executablePath = chromiumPath();
const chromiumOnly = { skip: !executablePath && 'no Chromium (playwright or its browser is not installed)' };
const UPSTREAM = /reading 'length'/; // @stencil/core 5.0.0-beta.25's client, on its own too (docs/vite-plugin.md)

const open = async (browser, pageHtml, { served = files } = {}) => {
  const page = await browser.newPage({ viewport: { width: 600, height: 500 } });
  const errors = [];
  const requested = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
  await page.route('http://isl.test/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: pageHtml });
    requested.push(path.slice(1));
    const body = served.get(path.slice(1));
    return body === undefined ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: 'text/javascript', body });
  });
  return { page, errors, requested };
};

const probe = () => {
  const nodes = [];
  for (const el of document.querySelectorAll('[data-island]')) nodes.push(el);
  window.__server = nodes;
  window.__events = [];
  for (const type of ['stencil-island-ready', 'stencil-island-error', 'stencil-islands-ready']) document.addEventListener(type, (e) => window.__events.push([type, e.detail?.name ?? null]));
};

test('Chromium: every directive, per instance', { ...chromiumOnly, timeout: 120_000 }, async () => {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const { page, errors, requested } = await open(browser, html.replace('<script type="module" src="/islands.js"></script>', ''));
    // the events are listened to before the boot script runs: it is added by hand, after the page has loaded and `probe` has run
    await page.goto('http://isl.test/');
    await page.evaluate(probe);
    // Stencil's server html already says `hydrated` on every host. What tells the client has taken a host over: the tag is defined (`componentOnReady`) and the
    // runtime has consumed the host's `s-id` (the static islands have none: the engine dropped them).
    const defined = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => typeof e.componentOnReady === 'function'), sel);
    const adopted = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => typeof e.componentOnReady === 'function' && !e.hasAttribute('s-id')), sel);
    assert.equal((await defined('isl-counter, isl-tag, isl-note, isl-stamp, isl-tabs')).some(Boolean), false, 'no component code has run');
    await page.addScriptTag({ type: 'module', url: '/islands.js' });
    await page.waitForFunction(() => window.stencilIslands?.state.a === 'ready' && window.__events.some(([t]) => t === 'stencil-islands-ready'), null, { timeout: 15_000 });

    // load: hydrated, adopted (the server's nodes are still the page's), working; the tabs set their children's props (one synchronous define pass)
    const cell = (sel) => page.evaluate((s) => document.querySelector(s).shadowRoot.querySelector('button').textContent.trim(), sel);
    assert.equal(await cell('[data-island="a"] isl-counter'), 'A: 1');
    await page.locator('[data-island="a"] isl-counter button').click();
    // the click re-renders on the next frame: wait for it rather than read at once (a fast machine reads before the render)
    await page.waitForFunction(() => document.querySelector('[data-island="a"] isl-counter').shadowRoot.querySelector('button').textContent.trim() !== 'A: 1', null, { timeout: 5_000 }).catch(() => {});
    assert.equal(await cell('[data-island="a"] isl-counter'), 'A: 2');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('isl-tab')].map((t) => t.active)), [true, false], 'isl-tabs reached its isl-tab children');
    assert.equal(await page.evaluate(() => window.__server.every((n) => n.isConnected)), true, 'every island root is the server\'s');

    // idle: arrives by itself
    await page.waitForFunction(() => window.stencilIslands.state.i === 'ready', null, { timeout: 15_000 });
    assert.deepEqual(await adopted('[data-island="i"] isl-tag'), [true]);
    assert.deepEqual(await adopted('[data-island="a"] isl-counter, [data-island="a"] isl-tabs, [data-island="a"] isl-tab'), [true, true, true, true]);

    // static and none: the same tags are defined and hydrated elsewhere on the page, these instances are never connected
    const inert = await page.evaluate(() => Promise.all([...document.querySelectorAll('[data-island="s"] *, [data-island="n"] *')].filter((e) => e.localName.startsWith('isl-')).map(async (e) => [e.localName, typeof e.componentOnReady === 'function' && (await Promise.race([e.componentOnReady().then(() => 'ready'), new Promise((r) => setTimeout(() => r('never'), 300))]))])));
    assert.deepEqual(inert, [['isl-counter', 'never'], ['isl-tag', 'never'], ['isl-stamp', false], ['isl-counter', 'never']], 'upgraded where the tag is defined, never connected; the tag only they use is not even defined');
    await page.locator('#s isl-counter').evaluate((c) => c.shadowRoot.querySelector('button').click());
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // a re-render, if any, has happened
    await page.waitForTimeout(100);
    assert.equal(await cell('#s isl-counter'), 'S: 7', 'the static instance is the server\'s html: a click does nothing');
    assert.equal(await cell('#n isl-counter'), 'N: 9');
    assert.equal(await page.evaluate(() => window.stencilIslands.state.s + '/' + window.stencilIslands.state.n), 'static/undefined');

    // visible: not loaded while it is below the fold
    assert.equal(requested.some((f) => f.includes('isl-note')), false, 'the visible island\'s module has not been requested');
    assert.equal(await page.evaluate(() => window.stencilIslands.state.v), 'pending');
    assert.deepEqual(await defined('#v isl-note'), [false]);
    assert.equal(requested.some((f) => f.includes('isl-stamp')), false, 'a tag only a static island uses is never requested');
    await page.locator('#v').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.stencilIslands.state.v === 'ready', null, { timeout: 15_000 });
    assert.deepEqual(await adopted('#v isl-note'), [true]);
    assert.equal(requested.some((f) => f.includes('isl-note')), true);
    assert.equal(requested.some((f) => f.includes('isl-stamp')), false);

    const events = await page.evaluate(() => window.__events);
    assert.deepEqual(events.filter(([t]) => t === 'stencil-island-ready').map(([, n]) => n).sort(), ['a', 'i', 'v']);
    assert.equal(events.some(([t]) => t === 'stencil-island-error'), false);
    assert.deepEqual(errors.filter((e) => !UPSTREAM.test(e)), []);
  } finally {
    await browser.close();
  }
});

test('Chromium: a module that does not load leaves its island as the server wrote it, and the page working', { ...chromiumOnly, timeout: 120_000 }, async () => {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const served = new Map([...files].filter(([f]) => !f.includes('isl-tag')));
    const { page } = await open(browser, html.replace('<script type="module" src="/islands.js"></script>', ''), { served });
    await page.goto('http://isl.test/');
    await page.evaluate(probe);
    await page.addScriptTag({ type: 'module', url: '/islands.js' });
    await page.waitForFunction(() => window.stencilIslands?.state.i === 'error' && window.stencilIslands.state.a === 'ready', null, { timeout: 15_000 });
    assert.equal(await page.evaluate(() => window.__events.some(([t, n]) => t === 'stencil-island-error' && n === 'i')), true);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-island="i"] isl-tag')].map((e) => typeof e.componentOnReady === 'function' || !e.hasAttribute('s-id'))), [false]);
    await page.locator('#v').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.stencilIslands.state.v === 'ready', null, { timeout: 15_000 });
  } finally {
    await browser.close();
  }
});
