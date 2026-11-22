// The stencilrs-built Ionic hydrate app against Stencil 5's own (issue #128).
//
//   node check/ssr-parity.mjs            (npm run check:ssr)
//
//   build        dist/hydrate-stencilrs/index.js from stencilrs' output (`buildHydrate`, scripts/build-hydrate.mjs) and
//                dist/hydrate-stencil/index.js from Stencil's `ssr` output target (`npm run build:ssr`), when missing
//   parity       the bench pages (ssr-pages.mjs) in both shadow modes, `renderToString` of each app: the HTML must be
//                byte-identical. Also with `fastSerializer: false` (Stencil's own serializer), so the two sides differ only
//                in the component build.
//   components   every tag of the app (the 94 of docs.json, the internal ion-select-popover and ion-icon) is registered
//   browser      one page rendered by the stencilrs app, loaded in Chromium: its content is there with JavaScript off,
//                then the client bundle (dist-stencilrs/, `npm run build:stencilrs`) adopts the server's elements instead
//                of re-rendering them. Skipped, not failed, without a Chromium (IONIC_REQUIRE_BROWSER=1 makes that an
//                error).
// Exits 1 when a check fails.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildHydrate } from '@popcorn245/stencilrs/ssr';

import { ionicHydrateOptions } from '../scripts/hydrate-options.mjs';
import { root } from '../scripts/paths.mjs';
import { MODES, PAGES, renderOptions } from '../ssr-pages.mjs';

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
};
const load = (file) => import(pathToFileURL(file).href);

const stencilrsFile = join(root, 'dist/hydrate-stencilrs/index.js');
const stencilFile = join(root, 'dist/hydrate-stencil/index.js');
console.log('== build');
if (!existsSync(join(root, 'migrated/stencil.config.ts'))) {
  console.error('migrated/ is missing: run npm run fetch && npm run migrate');
  process.exit(1);
}
const started = performance.now();
const built = await buildHydrate({ ...ionicHydrateOptions(root), outDir: join(root, 'dist/hydrate-stencilrs') });
check(statSync(stencilrsFile).size > 1e6, `dist/hydrate-stencilrs/index.js: ${built.components.length} components, ${((performance.now() - started) / 1000).toFixed(1)} s`);
if (!existsSync(stencilFile)) {
  const run = spawnSync(process.execPath, [join(root, 'scripts/build.mjs'), 'ssr'], { cwd: root, encoding: 'utf8' });
  check(run.status === 0 && existsSync(stencilFile), `Stencil built its own hydrate app (npm run build:ssr)${run.status ? `: ${(run.stdout + run.stderr).slice(-500)}` : ''}`);
}

console.log('\n== parity: renderToString, byte for byte');
const slowDir = mkdtempSync(join(tmpdir(), 'ionic-hydrate-'));
const slow = await buildHydrate({ ...ionicHydrateOptions(root), outDir: slowDir, fastSerializer: false });
const apps = { stencilrs: await load(stencilrsFile), 'stencilrs (Stencil serializer)': await load(slow.file), stencil: await load(stencilFile) };
rmSync(slowDir, { recursive: true, force: true });
for (const [page, html] of Object.entries(PAGES)) {
  for (const mode of MODES) {
    const results = {};
    for (const [name, app] of Object.entries(apps)) {
      const r = await app.renderToString(html, renderOptions(mode));
      results[name] = r;
      if (r.diagnostics.length && name === 'stencil') console.log(`       (Stencil's own render reports ${r.diagnostics.length} diagnostic(s): ${r.diagnostics[0].messageText})`);
    }
    const ref = results.stencil;
    for (const name of ['stencilrs', 'stencilrs (Stencil serializer)']) {
      const r = results[name];
      let at = -1;
      if (r.html !== ref.html) {
        at = [...r.html].findIndex((c, i) => c !== ref.html[i]);
        if (at < 0) at = Math.min(r.html.length, ref.html.length);
      }
      check(r.html === ref.html && r.diagnostics.length === ref.diagnostics.length && r.hydratedCount === ref.hydratedCount, `${page} / ${mode} / ${name}: ${r.html.length} bytes, ${r.html === ref.html ? 'identical' : `first difference at ${at}: ${JSON.stringify(r.html.slice(at - 40, at + 60))} vs ${JSON.stringify(ref.html.slice(at - 40, at + 60))}`}`);
    }
  }
}

console.log('\n== every component registered');
{
  const docs = existsSync(join(root, 'dist-stencil/docs.json')) ? JSON.parse(readFileSync(join(root, 'dist-stencil/docs.json'), 'utf8')).components.map((c) => c.tag) : null;
  const tags = [...(docs ?? []), 'ion-select-popover', 'ion-icon'];
  check(built.components.length === (docs ? tags.length : built.components.length) && (docs ? tags.every((t) => built.components.includes(t)) : true), `${built.components.length} components${docs ? `: the ${docs.length} tags of docs.json, ion-select-popover and ion-icon` : ' (dist-stencil/docs.json is missing: run npm run build:stencil to compare the list)'}`);
}

console.log('\n== browser: hydration in Chromium');
const chromiumPath = [process.env.CHROME_PATH, process.env.STENCILRS_CHROMIUM, join(process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers', 'chromium')].find((p) => p && existsSync(p));
const client = join(root, 'dist-stencilrs');
if (!existsSync(join(client, 'ionic.js'))) {
  console.log('  - skipped: dist-stencilrs/ionic.js is missing (npm run build:stencilrs)');
} else {
  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch({ ...(chromiumPath ? { executablePath: chromiumPath } : {}), args: ['--no-sandbox'] });
  } catch (err) {
    if (process.env.IONIC_REQUIRE_BROWSER) throw err;
    console.log(`  - skipped: no Chromium (${String(err.message).split('\n')[0]})`);
  }
  if (browser) {
    const html = (await apps.stencilrs.renderToString(PAGES['kitchen-sink'], renderOptions('declarative-shadow-dom'))).html
      // the client bundle and Ionic's global stylesheets, as the page would link them
      .replace('</head>', '<link rel="stylesheet" href="/build/css/core.css"><script type="module" src="/build/ionic.js"></script></head>');
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' };
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path === '/') return void res.writeHead(200, { 'content-type': 'text/html' }).end(html);
      const file = join(client, path.replace(/^\/build\//, ''));
      if (!file.startsWith(client) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${server.address().port}/`;
    try {
      // JavaScript off: what a crawler or a slow network shows first.
      const plain = await browser.newContext({ javaScriptEnabled: false });
      const noJs = await plain.newPage();
      await noJs.goto(url);
      const text = await noJs.evaluate(() => ({
        body: document.body.innerText,
        shadow: document.querySelector('ion-button')?.shadowRoot?.querySelector('button')?.getAttribute('type'),
      }));
      await plain.close();
      check(text.body.includes('Card title') && text.body.includes('BLOCK') && text.shadow === 'button', 'the server render shows its content with JavaScript off, declarative shadow roots included');

      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
      // The nodes the server sent, remembered before the client loads (the module script waits for the document).
      await page.route('**/build/ionic.js', async (route) => {
        await new Promise((r) => setTimeout(r, 300));
        await route.continue();
      });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        window.__server = [];
        const visit = (root) => {
          for (const el of root.querySelectorAll('*')) {
            if (el.localName === 'script' || el.localName === 'style' || el.localName === 'link') continue;
            window.__server.push(el);
            if (el.shadowRoot) visit(el.shadowRoot);
          }
        };
        visit(document);
      });
      await page.waitForFunction(() => customElements.get('ion-button') && customElements.get('ion-toggle') && customElements.get('ion-icon'), null, { timeout: 30000 });
      await page.waitForTimeout(1500); // the first, hydrating render of every component
      const state = await page.evaluate(() => {
        const tags = [...new Set([...document.querySelectorAll('*')].map((e) => e.localName).filter((t) => t.startsWith('ion-')))];
        const alive = window.__server.filter((el) => el.isConnected).length;
        return { total: window.__server.length, alive, undefinedTags: tags.filter((t) => !customElements.get(t)), hydrated: document.querySelectorAll('.hydrated').length, tags: tags.length };
      });
      check(state.undefinedTags.length === 0, `every one of the page's ${state.tags} ion- tags is defined${state.undefinedTags.length ? `: ${state.undefinedTags.join(', ')}` : ''}`);
      check(state.alive / state.total > 0.97, `the server's elements are still the page's (${state.alive} of ${state.total} kept)`);
      const toggled = await page.evaluate(async () => {
        const t = document.querySelector('ion-toggle');
        const before = t.checked;
        t.shadowRoot.querySelector('input').click();
        await new Promise((r) => setTimeout(r, 200));
        return { before, after: t.checked };
      });
      check(toggled.before !== toggled.after, `the hydrated ion-toggle works: click turns checked ${toggled.before} into ${toggled.after}`);
      // Ionic's own warnings for a bare element ("must be used inside ion-content") are console warnings, not errors.
      check(errors.length === 0, `no page or console error${errors.length ? `: ${errors[0]}` : ''}`);
    } finally {
      await browser.close();
      server.close();
    }
  }
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nSSR parity check passed');
process.exit(failures.length ? 1 : 0);
