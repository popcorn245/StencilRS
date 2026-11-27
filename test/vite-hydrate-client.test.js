// `stencilrs({ hydrateClient })`: the browser build that adopts the server's html (docs/vite-plugin.md), its flags with the option
// on and off, the per-component modules and manifest, and (Chromium, when there is one) that a page rendered by `buildHydrate` is
// hydrated in place by those modules.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

import { buildHydrate } from '../ssr.js';
import stencilrs, { hydrateClientOptions, runtimeFlags } from '../vite.js';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/hydrate-client');

test('runtimeFlags: the option off leaves exactly what buildFlags and dev ask for', () => {
  assert.deepEqual(runtimeFlags({}), {});
  assert.deepEqual(runtimeFlags({ buildFlags: { hydrateClientSide: false } }), { hydrateClientSide: false });
  assert.deepEqual(runtimeFlags({ signals: true, buildFlags: { a: true }, dev: true }), { vdomSignals: true, a: true, hotModuleReplacement: true, isDev: true });
});

test('runtimeFlags: hydrateClient turns the runtime\'s client hydration on, over buildFlags', () => {
  assert.deepEqual(runtimeFlags({ hydrateClient: true }), { hydrateClientSide: true });
  assert.deepEqual(runtimeFlags({ hydrateClient: true, buildFlags: { hydrateClientSide: false, slotRelocation: false } }), { hydrateClientSide: true, slotRelocation: false });
});

test('hydrateClientOptions: defaults, the object form, and what it refuses', () => {
  assert.equal(hydrateClientOptions(undefined), false);
  assert.equal(hydrateClientOptions(false), false);
  assert.deepEqual(hydrateClientOptions(true), { split: true, manifest: 'components.json', dir: 'components', tags: {}, collections: [] });
  assert.deepEqual(hydrateClientOptions({ split: false, manifest: false, dir: '/c/' }), { split: false, manifest: false, dir: 'c', tags: {}, collections: [] });
  assert.throws(() => hydrateClientOptions({ splt: true }), /unknown option "splt"/);
  assert.throws(() => hydrateClientOptions('yes'), /boolean or an object/);
  assert.throws(() => stencilrs({ hydrateClient: true, componentExport: 'ssr' }), /cannot be combined with componentExport: 'ssr'/);
});

const bundle = async (options, { entry = 'all.ts' } = {}) => {
  const result = await build({
    root: fixture,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs(options)],
    build: { write: false, minify: false, lib: { entry: join(fixture, entry), formats: ['es'], fileName: 'out' } },
  });
  return new Map([result].flat().flatMap((r) => r.output.map((o) => [o.fileName, o.type === 'chunk' ? o.code : String(o.source)])));
};

test('default build: one bundle, byte for byte the same with and without the option spelled out', async () => {
  const plain = await bundle({});
  const off = await bundle({ hydrateClient: false });
  assert.equal([...plain.keys()].some((f) => f.startsWith('components')), false, 'no per-component module without the option');
  assert.deepEqual([...off], [...plain]);
  assert.doesNotMatch(plain.get('out.js'), /BUILD\.hydrateClientSide\s*=/);
});

test('buildFlags: { hydrateClientSide: false } (the default build\'s way off) is unchanged by this feature', async () => {
  const code = (await bundle({ buildFlags: { hydrateClientSide: false } })).get('out.js');
  assert.match(code, /BUILD\.hydrateClientSide = false;/);
});

test('hydrateClient: the flag, a module per component, and the manifest', async () => {
  const out = await bundle({ hydrateClient: true });
  assert.ok(out.has('components/x-counter.js') && out.has('components/x-note.js'));
  assert.match(out.get('components/x-counter.js'), /BUILD\.hydrateClientSide = true;/);
  assert.match(out.get('components/x-counter.js'), /defineCustomElement\(XCounter, \[/);
  const manifest = JSON.parse(out.get('components.json'));
  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.tags, { 'x-counter': 'components/x-counter.js', 'x-note': 'components/x-note.js' });
  // The chunks a module needs are chunks of this build: nothing external, nothing the module itself is.
  for (const [file, imports] of Object.entries(manifest.imports)) for (const i of imports) assert.ok(out.has(i) && i !== file, `${file} imports ${i}`);
  // the user's own entry still exists and imports the components
  assert.match(out.get('out.js'), /components\/x-counter\.js/);
});

test('hydrateClient: { split: false } is the flag alone, { manifest: false } and { dir } name the output', async () => {
  const flagOnly = await bundle({ hydrateClient: { split: false } });
  assert.equal([...flagOnly.keys()].some((f) => f.startsWith('components')), false);
  assert.match(flagOnly.get('out.js'), /BUILD\.hydrateClientSide = true;/);
  const named = await bundle({ hydrateClient: { manifest: false, dir: 'tags' } });
  assert.ok(named.has('tags/x-counter.js'));
  assert.equal(named.has('components.json'), false);
});

// --- Chromium -------------------------------------------------------------------------------------------------------

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

const PAGE = `<x-counter id="c" data-server="1"><span id="slotted" data-server="1">slotted</span></x-counter>`;

/** The hydrate app of the fixture, and what it renders the page to. */
const renderPage = async () => {
  const { code } = await buildHydrate({ root: fixture, srcDir: 'src', namespace: 'fixture', logLevel: 'silent' });
  const dir = await import('node:fs/promises').then((fs) => fs.mkdtemp(join(process.env.TMPDIR ?? '/tmp', 'hydrate-client-')));
  const file = join(dir, 'index.cjs');
  await import('node:fs/promises').then((fs) => fs.writeFile(file, code));
  const app = createRequire(import.meta.url)(file);
  const result = await app.renderToString(`<!doctype html><html><head></head><body>${PAGE}</body></html>`, { fullDocument: true, serializeShadowRoot: 'declarative-shadow-dom', prettyHtml: false, buildId: 'fixture' });
  return result.html;
};

/** Loads the manifest's modules the way a client loader has to: every module first, `customElements.define` held back, then all defined at once. */
const BOOT = `
const manifest = await (await fetch('/components.json')).json();
const held = [];
const define = customElements.define;
customElements.define = (...args) => void held.push(args);
await Promise.all(Object.values(manifest.tags).map((f) => import('/' + f)));
customElements.define = define;
for (const args of held) customElements.get(args[0]) || define.apply(customElements, args);
window.__booted = true;
`;

const hydrateIn = async (html, files) => {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.route('http://fixture.test/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: html });
      const body = files.get(path.slice(1));
      return body === undefined ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ contentType: path.endsWith('.json') ? 'application/json' : 'text/javascript', body });
    });
    await page.goto('http://fixture.test/');
    // The server's nodes (shadow roots included), before any script runs.
    const marked = await page.evaluate(() => {
      const nodes = [];
      const visit = (root) => {
        for (const el of root.querySelectorAll('*')) {
          nodes.push(el);
          if (el.shadowRoot) visit(el.shadowRoot);
        }
      };
      visit(document.body);
      window.__server = nodes;
      return nodes.length;
    });
    const before = await page.evaluate(() => document.querySelector('x-counter').shadowRoot?.querySelector('button')?.textContent);
    await page.addScriptTag({ type: 'module', content: BOOT });
    await page.waitForFunction(() => window.__booted);
    await page.waitForFunction(() => document.querySelector('x-counter')?.classList.contains('hydrated') && document.querySelector('x-counter').shadowRoot.querySelector('x-note')?.classList.contains('hydrated'), null, { timeout: 10000 });
    await page.waitForTimeout(200);
    const adopted = await page.evaluate(() => window.__server.filter((n) => n.isConnected).length);
    const button = page.locator('x-counter button');
    await button.click();
    await button.click();
    const after = await page.evaluate(() => document.querySelector('x-counter').shadowRoot.querySelector('button').textContent.trim());
    const slotted = await page.evaluate(() => document.querySelector('#slotted').dataset.server);
    return { marked, adopted, before: before?.trim(), after, slotted, errors };
  } finally {
    await browser.close();
  }
};

// @stencil/core 5.0.0-beta.25's client runtime throws "Cannot read properties of undefined (reading 'length')" in `patch` while hydrating
// childless elements; Stencil's own lazy build does the same on its own server render (examples/ui-kit/ssr/smoke.mjs). Anything else is a failure.
const UPSTREAM = /reading 'length'/;

test('Chromium: the hydrating client adopts the hydrate app\'s nodes and the components work', chromiumOnly, { timeout: 120000 }, async () => {
  const html = await renderPage();
  assert.match(html, /<x-counter[^>]*s-id="/, 'the server rendered with hydration ids');
  const files = await bundle({ hydrateClient: true });
  const r = await hydrateIn(html, files);
  assert.equal(r.before, 'count: 0', 'the server rendered the button');
  assert.equal(r.adopted, r.marked, `every server node survived (${r.adopted} of ${r.marked})`);
  assert.equal(r.after, 'count: 2', 'two clicks, two renders');
  assert.equal(r.slotted, '1', 'the slotted light-DOM node is the server\'s');
  assert.deepEqual(r.errors.filter((e) => !UPSTREAM.test(e)), []);
});

test('Chromium: without hydrateClient the same modules throw the server nodes away (the flag is what adopts them)', chromiumOnly, { timeout: 120000 }, async () => {
  const html = await renderPage();
  // `split` still on, the flag off: what the default Ionic config does (`buildFlags: { hydrateClientSide: false }`).
  const files = await bundle({ hydrateClient: true, buildFlags: {} });
  const flagOff = new Map([...files].map(([f, c]) => [f, typeof c === 'string' ? c.replaceAll('BUILD.hydrateClientSide = true;', 'BUILD.hydrateClientSide = false;') : c]));
  const r = await hydrateIn(html, flagOff);
  assert.ok(r.adopted < r.marked, `with hydration compiled out the server's nodes are replaced (${r.adopted} of ${r.marked} kept)`);
  assert.equal(r.after, 'count: 2', 'it still works, it just rendered again');
});
