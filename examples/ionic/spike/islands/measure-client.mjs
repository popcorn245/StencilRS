// Q5, client side: what it costs the browser to hydrate a page when (all) every island hydrates at boot, (static) some islands are
// never hydrated and their components' code is never loaded, (visible) those islands hydrate when they scroll into view.
// The page is the same server HTML in all three; only the island directive (data-client) and the boot script differ.
//   node spike/islands/measure-client.mjs [rounds=7] [cpu=1]
import { assemble, openPool } from './assemble.mjs';
import { tagRoots } from './islands.mjs';
import { PAGES, MODES, launch, serve, stats, fmt } from './lib.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rounds = Number(process.argv[2] ?? 7);
const cpu = Number(process.argv[3] ?? 1);
const bootSource = readFileSync(fileURLToPath(new URL('./client-boot.mjs', import.meta.url)), 'utf8');

const SETS = { 'kitchen-sink': ['form', 'rest'], 'list-50': ['b'] };
const pool = await openPool(2);

/** The page with `data-island` roots, and the tags each island and the shell need (from the render results). */
const build = async (pageName) => {
  const page = PAGES[pageName];
  const opts = { prettyHtml: false, serializeShadowRoot: MODES.dsd, buildId: 'islands-spike' };
  const shell = await pool.render(page.template, { ...opts, fullDocument: true, idBase: 0 });
  const names = Object.keys(page.islands);
  const results = await Promise.all(names.map((n, i) => pool.render(page.islands[n], { ...opts, fullDocument: false, idBase: (i + 1) * 1000 })));
  const tagsOf = (r) => [...new Set(r.components)];
  const islandTags = Object.fromEntries(names.map((n, i) => [n, tagsOf(results[i])]));
  const shellTags = tagsOf(shell).filter((t) => !Object.values(islandTags).some((l) => l.includes(t)) || true);
  return { page, shell, results, names, islandTags, shellTags };
};

const assembleVariant = (b, variant, deferred) => {
  const { cutShell, styleDeduper } = b.helpers;
  const segs = cutShell(b.shell.html, b.names);
  const dedupe = styleDeduper(b.shell);
  let html = segs[0];
  b.names.forEach((n, i) => {
    const client = deferred.includes(n) ? variant : 'load';
    html += dedupe(b.results[i].styles) + tagRoots(b.results[i].html, ` data-island="${n}" data-client="${client}"`) + segs[i + 1];
  });
  const config = { base: '/client/components/', shell: b.shellTags, islands: b.names.map((n) => ({ name: n, client: deferred.includes(n) ? variant : 'load', tags: b.islandTags[n] })) };
  return html.replace('</body>', `<script type="module">${bootSource.replace('export const boot', 'const boot')}\nconst r = await boot({ ...${JSON.stringify(config)}, onActivate: (n, t) => (window.__activated = (window.__activated || []).concat([[n, Math.round(t)]])) });\nwindow.__boot = r;</script></body>`);
};

const browser = await launch();
for (const pageName of ['kitchen-sink', 'list-50']) {
  const b = await build(pageName);
  b.helpers = await import('./stream.mjs');
  const deferred = SETS[pageName];
  const variants = ['all', 'static', 'visible'];
  const pages = Object.fromEntries(variants.map((v) => [v, assembleVariant(b, v === 'all' ? 'load' : v, v === 'all' ? [] : deferred)]));
  const { server, origin } = await serve(Object.fromEntries(variants.map((v) => [`/p/${v}`, (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(pages[v])])));
  const acc = Object.fromEntries(variants.map((v) => [v, { script: [], task: [], layout: [], style: [], ready: [], jsBytes: 0, jsFiles: 0, activated: null, nodes: [], heap: [], afterScrollScript: [], afterScrollFiles: 0 }]));
  for (let i = 0; i < rounds + 1; i++)
    for (const v of variants.map((_, k) => variants[(k + i) % variants.length])) {
      const ctx = await browser.newContext({ viewport: { width: 414, height: 480 } });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Performance.enable');
      if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      const scripts = new Map();
      cdp.on('Network.responseReceived', (e) => e.type === 'Script' && scripts.set(e.requestId, e.response.url));
      let bytes = 0;
      cdp.on('Network.loadingFinished', (e) => scripts.has(e.requestId) && (bytes += e.encodedDataLength));
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
      await page.goto(`${origin}/p/${v}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__boot, null, { timeout: 60000 });
      await page.waitForTimeout(300);
      const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
      const ready = await page.evaluate(() => window.__ready);
      const act = await page.evaluate(() => window.__activated);
      const files = scripts.size;
      if (i > 0) {
        const a = acc[v];
        a.script.push(m.ScriptDuration * 1000); a.task.push(m.TaskDuration * 1000); a.layout.push(m.LayoutDuration * 1000); a.style.push(m.RecalcStyleDuration * 1000);
        a.ready.push(ready); a.jsBytes = bytes; a.jsFiles = files; a.activated = act; a.nodes.push(m.Nodes); a.heap.push(m.JSHeapUsedSize / 1e6);
      }
      if (i > 0 && v === 'visible') {
        // scroll the deferred islands into view: the work (and the code) comes then
        const before = m.ScriptDuration;
        await page.evaluate((names) => names.forEach((n) => document.querySelector(`[data-island="${n}"]`)?.scrollIntoView()), deferred);
        await page.waitForTimeout(800);
        const m2 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
        acc[v].afterScrollScript.push((m2.ScriptDuration - before) * 1000);
        acc[v].afterScrollFiles = scripts.size - files;
        acc[v].activatedAfter = await page.evaluate(() => window.__activated);
      }
      if (errors.length) acc[v].errors = errors;
      await ctx.close();
    }
  server.close();
  console.log(`\n${pageName} (cpu x${cpu}); deferred islands: ${deferred.join(', ')}`);
  for (const v of variants) {
    const a = acc[v];
    console.log(`  ${v.padEnd(8)} script ${fmt(stats(a.script), 0)} ms  task ${fmt(stats(a.task), 0)} ms  ready ${fmt(stats(a.ready), 0)} ms  js ${a.jsFiles} files ${(a.jsBytes / 1024).toFixed(0)} KB  nodes ${stats(a.nodes).med}  heap ${stats(a.heap).med.toFixed(1)} MB  activated ${JSON.stringify(a.activated)}${a.afterScrollScript.length ? `  | on scroll: +${fmt(stats(a.afterScrollScript), 0)} ms script, +${a.afterScrollFiles} files, activated ${JSON.stringify(a.activatedAfter)}` : ''}${a.errors ? '  errors ' + a.errors.join(';') : ''}`);
  }
}
await browser.close();
await pool.close();
