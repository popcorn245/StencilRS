// Issue #195 on Ionic: the islands client (islands-client.js, `islands.client` of the engine) against the spike's draft boot (spike/islands/client-boot.mjs),
// both on the production hydrating client build (`IONIC_HYDRATE_CLIENT=1 vite build`, minified, per-component modules), interleaved A/B in Chromium.
//
//   npm run build:hydrate
//   IONIC_HYDRATE_CLIENT=1 IONIC_OUT_DIR=$PWD/dist-hydrate-client node node_modules/vite/bin/vite.js build --config vite.config.ts
//   node bench-islands-client.mjs [rounds=15] [cpu=1]
//
// Variants per page (the same islands; `deferred` are the islands the directive applies to; the others are `load`):
//   spike-all      the spike's boot, every island load
//   spike-static   the spike's boot, deferred islands static (annotations kept: the spike did not strip them)
//   new-all        this client, every island load
//   new-static     this client, deferred islands static (annotations stripped by the engine)
//   new-visible    this client, deferred islands visible (below the fold; scrolled to at the end, the cost then is reported)
// Reported per variant, medians (min-max, n): script time (CDP Performance ScriptDuration), task time, ready (ms from the boot's start until the shell and
// the load islands are ready, and from navigation), JS requested (files, bytes as transferred, gzip of the same files), HTML bytes (raw, gzip).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { stencilEngine } from '../../express.js';
import { HYDRATING_DIR } from './spike/islands/hydrating-client.mjs';
import { HYDRATE, MODES, PAGES, fmt, launch, renderOptions, serve, stats } from './spike/islands/lib.mjs';
import { islandView, writeViews } from './spike/islands/views.mjs';

const rounds = Number(process.argv[2] ?? 15);
const cpu = Number(process.argv[3] ?? 1);
const DEFERRED = { 'kitchen-sink': ['form', 'rest'], 'list-50': ['b'] };
const spikeBoot = readFileSync(fileURLToPath(new URL('./spike/islands/client-boot.mjs', import.meta.url)), 'utf8')
  // the production build's global script is its own module that initializes when imported (the dev build exported `initialize` from runtime.js)
  .replace("const { y: initialize } = await import(`${base}runtime.js`); // Ionic's initialize(), minified name in the build\n  initialize();", "await import('/client/init.js');")
  // and a component module defines its tag when it is evaluated (the dev build's modules exported `defineCustomElement`)
  .replace('.then((m) => m.defineCustomElement())', '')
  .replace('export const boot', 'const boot');
if (spikeBoot.includes('runtime.js') || spikeBoot.includes('defineCustomElement')) throw new Error('the spike boot changed: update the shim');

const dir = writeViews([]);
const viewOf = (name, deferred, directive) => {
  const file = join(dir, `${name}.${directive}.html`);
  writeFileSync(file, islandView(PAGES[name], Object.fromEntries(deferred.map((n) => [n, directive]))));
  return file;
};
const common = { hydrate: HYDRATE, workers: 2, renderOptions: renderOptions(MODES.dsd) };
const manifest = join(HYDRATING_DIR, 'components.json');
const withClient = stencilEngine({ ...common, islands: { client: { base: '/client/', manifest, init: ['init.js'] } } });
const plain = stencilEngine({ ...common, islands: {} });
await Promise.all([withClient.ready, plain.ready]);
const render = (engine, file) => new Promise((ok, no) => engine(file, {}, (e, h) => (e ? no(e) : ok(h))));

const browser = await launch();
for (const pageName of ['kitchen-sink', 'list-50']) {
  const deferred = DEFERRED[pageName];
  const none = viewOf(pageName, [], 'load');
  const stat = viewOf(pageName, deferred, 'static');
  const vis = viewOf(pageName, deferred, 'visible');
  const manifestOf = async (file) => (await withClient.renderIslands(file)).clientManifest();
  const spike = async (file) => {
    const m = await manifestOf(file);
    const config = { base: '/client/components/', shell: m.shell, islands: m.islands.map((i) => ({ name: i.name, client: i.client, tags: i.tags })) };
    const html = await render(plain, file);
    return html.replace('</body>', `<script type="module">${spikeBoot}\nconst r = await boot({ ...${JSON.stringify(config)}, onActivate: (n, t) => (window.__activated = (window.__activated || []).concat([[n, Math.round(t)]])) });\nwindow.__boot = r;</script></body>`);
  };
  const variants = {
    'spike-all': await spike(none),
    'spike-static': await spike(stat),
    'new-all': await render(withClient, none),
    'new-static': await render(withClient, stat),
    'new-visible': await render(withClient, vis),
  };
  const names = Object.keys(variants);
  const { server, origin } = await serve(Object.fromEntries(names.map((v) => [`/p/${v}`, (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(variants[v])])), { clientDir: HYDRATING_DIR });
  const acc = Object.fromEntries(names.map((v) => [v, { script: [], task: [], ready: [], readyAbs: [], bytes: 0, gz: 0, files: 0, scrollScript: [], scrollFiles: 0, activated: null, errors: [] }]));
  for (let i = 0; i < rounds + 1; i++) {
    for (const v of names.map((_, k) => names[(k + i) % names.length])) {
      const ctx = await browser.newContext({ viewport: { width: 414, height: 480 } });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Performance.enable');
      if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      const scripts = new Map();
      cdp.on('Network.responseReceived', (e) => e.type === 'Script' && scripts.set(e.requestId, new URL(e.response.url).pathname));
      const sizes = new Map();
      cdp.on('Network.loadingFinished', (e) => scripts.has(e.requestId) && sizes.set(e.requestId, e.encodedDataLength));
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
      await page.addInitScript(() => {
        document.addEventListener('stencil-islands-ready', (e) => (window.__ready = e.detail.ms, window.__readyAbs = performance.now()));
      });
      await page.goto(`${origin}/p/${v}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready !== undefined || window.__boot, null, { timeout: 20000 }).catch((e) => { console.error(v, errors, e.message); throw e; });
      if (v.startsWith('spike')) await page.evaluate(() => (window.__readyAbs = performance.now()));
      await page.waitForTimeout(300);
      const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
      const m = await metrics();
      const [ready, readyAbs, activated] = await page.evaluate(() => [window.__ready, window.__readyAbs, window.__activated ?? Object.entries(window.stencilIslands?.state ?? {})]);
      const loaded = [...scripts.values()];
      if (i > 0) {
        const a = acc[v];
        a.script.push(m.ScriptDuration * 1000);
        a.task.push(m.TaskDuration * 1000);
        a.ready.push(ready ?? await page.evaluate(() => window.__boot?.ready));
        a.readyAbs.push(readyAbs);
        a.bytes = [...sizes.values()].reduce((s, b) => s + b, 0);
        a.gz = loaded.reduce((s, p) => { try { return s + gzipSync(readFileSync(join(HYDRATING_DIR, p.replace(/^\/client\//, ''))), { level: 9 }).length; } catch { return s; } }, 0);
        a.files = loaded.length;
        a.activated = activated;
        if (v === 'new-visible') {
          await page.evaluate((names) => names.forEach((n) => document.querySelector(`[data-island="${n}"]`)?.scrollIntoView()), deferred);
          await page.waitForFunction((names) => names.every((n) => window.stencilIslands.state[n] === 'ready'), deferred, { timeout: 30000 });
          const m2 = await metrics();
          a.scrollScript.push((m2.ScriptDuration - m.ScriptDuration) * 1000);
          a.scrollFiles = scripts.size - loaded.length;
        }
        if (errors.length) a.errors = errors;
      }
      await ctx.close();
    }
  }
  server.close();
  const htmlSize = (v) => `${variants[v].length} B, gzip ${gzipSync(variants[v], { level: 9 }).length} B`;
  console.log(`\n${pageName} (cpu x${cpu}, ${rounds} interleaved rounds); deferred islands: ${deferred.join(', ')}`);
  for (const v of names) {
    const a = acc[v];
    console.log(
      `  ${v.padEnd(12)} script ${fmt(stats(a.script), 0)} ms  task ${fmt(stats(a.task), 0)} ms  ready ${fmt(stats(a.ready), 0)} ms (from navigation ${fmt(stats(a.readyAbs), 0)})  js ${a.files} files ${(a.bytes / 1024).toFixed(0)} KB (gzip ${(a.gz / 1024).toFixed(0)} KB)  html ${htmlSize(v)}${a.scrollScript.length ? `  | on scroll +${fmt(stats(a.scrollScript), 0)} ms script, +${a.scrollFiles} files` : ''}${a.errors.length ? '  errors ' + a.errors.join(';') : ''}`
    );
  }
}
await browser.close();
await Promise.all([withClient.close(), plain.close()]);
