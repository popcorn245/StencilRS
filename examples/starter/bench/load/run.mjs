// Page-load bench: the same 500-card page, server-rendered by stencilrs (hydrated in place) and by
// Qwik 1.20.4 (resumed). Fresh browser context per load, no cache. Two profiles: desktop (no
// throttling) and mobile (4x CPU slowdown, 150 ms RTT, 1.6 Mbps down, as Lighthouse's mobile).
//
//   npx vite build --config bench/load/vite.config.ts && npx vite build --ssr --config bench/load/vite.config.ts
//   node bench/load/render.mjs
//   (cd bench/qwik/load && npx vite build && npx vite build --ssr src/entry.ssr.tsx && node render.mjs)
//   node bench/load/run.mjs [runs]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const RUNS = Number(process.argv[2] ?? 10);
const bench = join(import.meta.dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const serve = (dir) =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
      let body;
      try {
        body = readFileSync(path);
      } catch {
        return res.writeHead(404).end();
      }
      // Compressed, as any production server would send it.
      const type = types[extname(path)] ?? 'application/octet-stream';
      if (type === 'application/octet-stream') return res.writeHead(200, { 'content-type': type }).end(body);
      res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip' });
      res.end(gzipSync(body));
    });
    server.listen(0, () => resolve(server));
  });

const PROFILES = {
  desktop: { cpu: 1, net: null },
  mobile: { cpu: 4, net: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } },
};
const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

async function load(browser, url, profile) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  if (profile.net) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', profile.net);
  }
  // Qwik's loader announces itself with `qinit`; stencilrs's bundle sets __interactive itself.
  await page.addInitScript(() => {
    document.addEventListener('qinit', () => (window.__interactive ??= performance.now()));
    // Total blocking time: the part of each long task (> 50 ms) past 50 ms.
    window.__tbt = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__tbt += Math.max(0, e.duration - 50);
    }).observe({ type: 'longtask', buffered: true });
  });
  const scripts = [];
  let phase = 'load';
  page.on('response', async (r) => {
    if (r.request().resourceType() !== 'script') return;
    try {
      const body = await r.body();
      scripts.push({ phase, raw: body.length, gz: gzipSync(body).length });
    } catch {}
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__interactive, null, { timeout: 60000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  const m = await page.evaluate(() => ({
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    interactive: window.__interactive,
    tbt: window.__tbt,
  }));
  const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  m.script = metrics.ScriptDuration * 1000; // main-thread JS during load, ms (already slowed by the CPU rate)
  m.loadJs = scripts.filter((s) => s.phase === 'load').reduce((n, s) => n + s.gz, 0);

  // A real click on a card deep in the page, then another card (warm), then the header counter.
  const click = async (selector) => {
    const box = await page.evaluate((selector) => {
      const b = document.querySelectorAll(selector.q)[selector.i];
      b.scrollIntoView({ block: 'center' });
      window.__t = null;
      window.__start = null;
      document.addEventListener('click', (e) => (window.__start ??= e.timeStamp), { capture: true, once: true });
      new MutationObserver((_, mo) => {
        window.__t = performance.now();
        mo.disconnect();
      }).observe(b, { subtree: true, characterData: true, childList: true });
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, selector);
    phase = 'click';
    await page.mouse.click(box.x, box.y);
    await page.waitForFunction(() => window.__t, null, { timeout: 60000 });
    return page.evaluate(() => window.__t - window.__start);
  };
  m.firstClick = await click({ q: 'button.like', i: 249 });
  m.secondClick = await click({ q: 'button.like', i: 250 });
  m.counterClick = await click({ q: '#count', i: 0 });
  m.clickJs = scripts.filter((s) => s.phase === 'click').reduce((n, s) => n + s.gz, 0);
  m.htmlGz = gzipSync(readFileSync(join(dirs[url], 'index.html'))).length;
  await context.close();
  return m;
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const roots = { stencilrs: join(bench, 'dist-load-stencilrs'), qwik: join(bench, 'dist-load-qwik/client') };
const sites = {};
const dirs = {};
for (const [name, dir] of Object.entries(roots)) {
  sites[name] = await serve(dir);
  dirs[`http://localhost:${sites[name].address().port}/`] = dir;
}
const out = {};
for (const [pname, profile] of Object.entries(PROFILES)) {
  for (const [name, server] of Object.entries(sites)) {
    const runs = [];
    for (let i = 0; i < RUNS + 1; i++) {
      const m = await load(browser, `http://localhost:${server.address().port}/`, profile);
      if (i) runs.push(m); // first load warms the server and disk
    }
    out[`${pname}/${name}`] = Object.fromEntries(Object.keys(runs[0]).map((k) => [k, median(runs.map((r) => r[k]))]));
  }
}
await browser.close();
for (const s of Object.values(sites)) s.close();

const rows = [
  ['HTML (KB gzip)', (m) => (m.htmlGz / 1024).toFixed(1)],
  ['JS before interactive (KB gzip)', (m) => (m.loadJs / 1024).toFixed(1)],
  ['JS fetched on first clicks (KB gzip)', (m) => (m.clickJs / 1024).toFixed(1)],
  ['First contentful paint (ms)', (m) => m.fcp.toFixed(0)],
  ['Interactive (ms)', (m) => m.interactive.toFixed(0)],
  ['Main-thread JS during load (ms)', (m) => m.script.toFixed(0)],
  ['Total blocking time (ms)', (m) => m.tbt.toFixed(0)],
  ['First click on a card → DOM (ms)', (m) => m.firstClick.toFixed(1)],
  ['Next click, another card (ms)', (m) => m.secondClick.toFixed(1)],
  ['Click on the header counter (ms)', (m) => m.counterClick.toFixed(1)],
];
for (const p of Object.keys(PROFILES)) {
  console.log(`\n### ${p} (median of ${RUNS} loads)\n\n| | stencilrs | Qwik |\n|---|---:|---:|`);
  for (const [label, f] of rows) console.log(`| ${label} | ${f(out[`${p}/stencilrs`])} | ${f(out[`${p}/qwik`])} |`);
}
