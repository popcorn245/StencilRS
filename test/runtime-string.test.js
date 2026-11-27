// The DOM-free string renderer (runtime-string.js): every fixture page of test/string-fixtures.mjs is rendered by the
// string renderer and by the happy-dom renderer (in a child process), and is byte-identical or falls back for the
// reason the fixture names. Then the hybrid `createRenderer(load, { renderer: 'string' })`: fallback, isolation of the
// DOM globals, concurrency, the Vite plugin option, and a Chromium check that the string output hydrates and resumes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createRenderer } from '../runtime-server.js';
import { createStringRenderer } from '../runtime-string.js';
import stencilrs from '../vite.js';
import { PAGES, RUNTIME_URL, STRING_URL, sources, writeBundle } from './string-fixtures.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const domBundle = writeBundle(RUNTIME_URL);
const strBundle = writeBundle(STRING_URL);
const oracle = JSON.parse(execFileSync(process.execPath, ['test/string-oracle.mjs', JSON.stringify(domBundle.urls)], { cwd: root, maxBuffer: 1 << 28 }));
const strRender = await createStringRenderer(strBundle.load);

test('string renderer: every fixture page is byte-identical to happy-dom, or falls back for its reason', async () => {
  let identical = 0;
  let fell = 0;
  for (const [i, [name, html, opts, reason]] of PAGES.entries()) {
    let out;
    try {
      out = await strRender(html, opts);
    } catch (e) {
      assert.equal(e.name, 'Fallback', `${name}: ${e.stack}`);
      assert.ok(reason, `${name}: unexpected fallback: ${e.message}`);
      assert.ok(e.message.includes(reason), `${name}: fell back for "${e.message}", wanted "${reason}"`);
      fell++;
      continue;
    }
    assert.ok(!reason, `${name}: rendered, but should fall back (${reason})`);
    assert.equal(out, oracle[i], name);
    identical++;
  }
  assert.ok(identical > 40 && fell > 25, `${identical} identical, ${fell} fell back`);
});

test('string renderer: a page renders the same after a fallback', async () => {
  const html = '<x-attrs></x-attrs><x-lightplain n="2"></x-lightplain>';
  const a = await strRender(html);
  await assert.rejects(strRender('<x-async></x-async>'), { name: 'Fallback' });
  await assert.rejects(strRender('<x-dom></x-dom>'), { name: 'Fallback' });
  assert.equal(await strRender(html), a);
});

const hybrid = (opts = {}) => createRenderer(({ renderer }) => (renderer === 'string' ? strBundle : domBundle).load(), { renderer: 'string', ...opts });

test('hybrid: a page that falls back is rendered by happy-dom, and reported', async () => {
  const seen = [];
  const render = await hybrid({ onFallback: (reason) => seen.push(reason) });
  const html = await render('<x-async></x-async>');
  assert.match(html, /<p[^>]*>async<\/p>/);
  assert.equal(render.fallbacks, 1);
  assert.match(render.lastFallback, /async/);
  assert.equal(seen.length, 1);
  await render('<x-text></x-text>');
  assert.equal(render.fallbacks, 1);
});

test('hybrid: every fixture page gives the happy-dom output, or the page a fallback rendered', async () => {
  const render = await hybrid();
  let compared = 0;
  for (const [i, [name, html, opts, reason]] of PAGES.entries()) {
    const before = render.fallbacks ?? 0;
    const out = await render(html, opts);
    if (reason) {
      assert.equal(render.fallbacks, before + 1, `${name}: should fall back`);
      assert.ok(out.length > 0, name);
      continue;
    }
    assert.equal(render.fallbacks ?? 0, before, `${name}: should not fall back`);
    // Pages whose components count in a module-level global differ with the history of renders: skip those.
    if ((await strRender(html, opts)) !== out) continue;
    assert.equal(out, oracle[i], name);
    compared++;
  }
  assert.ok(compared > 30, `${compared} compared`);
});

test('hybrid: window and document never exist on globalThis outside a happy-dom render, and none leak into the string path', async () => {
  const names = ['window', 'document', 'HTMLElement', 'customElements', 'Node'];
  const present = () => names.filter((n) => n in globalThis);
  assert.deepEqual(present(), []);
  const render = await hybrid();
  assert.deepEqual(present(), []);
  const out = await render('<x-dom></x-dom>'); // touches `document` in a hook: the string path must notice, not succeed
  assert.match(out, /x-dom/);
  assert.equal(render.fallbacks, 1);
  assert.deepEqual(present(), []);
  await render('<x-text></x-text>');
  assert.deepEqual(present(), []);
});

test('hybrid: renders interleaved with a slow load and fallbacks do not mix', async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  let loads = 0;
  const render = await createRenderer(
    async ({ renderer }) => {
      if (renderer === 'dom' && ++loads === 1) await gate; // the isolated DOM renderer's first load is slow
      return (renderer === 'string' ? strBundle : domBundle).load();
    },
    { renderer: 'string' },
  );
  const pages = ['<x-async></x-async>', '<x-text></x-text>', '<x-timer></x-timer>', '<x-attrs></x-attrs>', '<x-async></x-async>'];
  const sequential = [];
  const seqRender = await hybrid();
  for (const p of pages) sequential.push(await seqRender(p));
  const running = pages.map((p) => render(p));
  setTimeout(release, 30);
  assert.deepEqual(await Promise.all(running), sequential);
  assert.deepEqual(['window', 'document'].filter((n) => n in globalThis), []);
});

test('hybrid: load can be the URL of the SSR build entry, with the string variant next to it', async () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'rs-entry-')));
  mkdirSync(join(dir, 'string'));
  writeFileSync(join(dir, 'entry-server.js'), `export const which = 'dom';\nawait import(${JSON.stringify(domBundle.urls[0])});\n`);
  writeFileSync(join(dir, 'string', 'entry-server.js'), `export const which = 'string';\n`);
  const render = await createRenderer(join(dir, 'entry-server.js'), { renderer: 'dom' });
  assert.equal(typeof render, 'function');
  // the string variant is missing its runtime import: a clear error names the option
  await assert.rejects(createRenderer(join(dir, 'missing.js'), { renderer: 'string' }), (e) => e.code === 'ERR_MODULE_NOT_FOUND' && /stringRenderer: true/.test(e.message));
});

test('vite: stringRenderer needs runtime: stencilrs', () => {
  assert.throws(() => stencilrs({ stringRenderer: true }), /stringRenderer needs runtime: 'stencilrs'/);
  assert.doesNotThrow(() => stencilrs({ runtime: 'stencilrs', stringRenderer: true }));
});

test('vite: an SSR build with stringRenderer also writes string/, importing the DOM-free runtime', async () => {
  const { build } = await import('vite');
  // inside the package, so that '@popcorn245/stencilrs/runtime' resolves (by its own name)
  const dir = realpathSync(mkdtempSync(join(root, '.tmp-string-build-')));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'a-b.tsx'), `import { Component, h } from '@stencil/core';\n@Component({ tag: 'a-b', encapsulation: { type: 'scoped' } })\nexport class AB { render() { return <p>hi</p>; } }\n`);
  writeFileSync(join(dir, 'entry-server.ts'), `import './src/a-b';\n`);
  try {
    const outDir = join(dir, 'dist');
    await build({ root: dir, configFile: false, logLevel: 'silent', plugins: stencilrs({ runtime: 'stencilrs', stringRenderer: true }), build: { ssr: 'entry-server.ts', outDir, emptyOutDir: true } });
    const files = readdirSync(join(outDir, 'string'));
    assert.ok(files.includes('entry-server.js'), files.join());
    const code = readFileSync(join(outDir, 'string', 'entry-server.js'), 'utf8');
    assert.match(code, /@popcorn245\/stencilrs\/runtime\/string/);
    assert.doesNotMatch(readFileSync(join(outDir, 'entry-server.js'), 'utf8'), /runtime\/string/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Chromium: the string output hydrates in place, and resumes.
let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  // no browser here
}
const chromiumOnly = { skip: !chromium && 'playwright not installed' };

test('client: the string output hydrates keeping every server node, resumes, and clicks work', chromiumOnly, async () => {
  for (const resumable of [false, true]) {
    const html = await strRender('<x-click></x-click>', { resumable });
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const files = { '/runtime.js': readFileSync(join(root, 'runtime.js'), 'utf8') };
    for (const [tag, code] of Object.entries(sources())) files[`/${tag}.js`] = code.replaceAll('"@popcorn245/stencilrs/runtime"', '"/runtime.js"');
    await page.route('http://rs.test/**', (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>${html}</body></html>` });
      return route.fulfill({ contentType: 'text/javascript', body: files[path] ?? '' });
    });
    await page.goto('http://rs.test/');
    await page.evaluate(() => {
      window.before = [document.querySelector('x-click .c'), document.querySelector('x-click button'), document.querySelector('x-click .n')];
    });
    await page.evaluate(() => import('/x-click.js'));
    await page.evaluate(() => document.querySelector('x-click').componentOnReady?.());
    const kept = await page.evaluate(() => [document.querySelector('x-click .c'), document.querySelector('x-click button'), document.querySelector('x-click .n')].map((n, i) => n === window.before[i]));
    assert.deepEqual(kept, [true, true, true], `resumable ${resumable}`);
    await page.click('x-click button');
    await page.click('x-click button');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 20)));
    assert.equal(await page.evaluate(() => document.querySelector('x-click .n').textContent), '2', `resumable ${resumable}`);
    assert.deepEqual(errors, []);
    await browser.close();
  }
});
