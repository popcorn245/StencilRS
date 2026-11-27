// Issues #191, #192, #193 and #196: the islands engine, its streaming responder and the per-island cache (the `cached` route: the static islands
// served from the per-island cache) against the whole-page render, over HTTP, interleaved A/B (every round visits each route once, the order
// rotating), medians with min-max and n. Starts bench/islands-server.mjs itself.
//   node bench-islands.mjs [workers=2] [rounds=40] [throughputRounds=3] [paintRounds=9]
//   BENCH_MODES=dsd,scoped node bench-islands.mjs ...   (#206) one server per serialization, every route of both in the same interleaved rounds, as `dsd:full`, `scoped:islands`, ...
// Time to first byte, last byte and gzip size per route, then requests/s at concurrency 4, then first and largest contentful paint (FCP, LCP) in Chromium (every route: full, islands, in-order, early head, out-of-order, cached) (cold cache,
// 414x800, the page's Ionic stylesheet render-blocking) unthrottled and on a 'Fast 3G' profile whose latency is split into 75 ms before the
// request reaches the server and 75 ms back (a single CDP latency would hide the server's time). `paintRounds=0` skips the browser part.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { fmt, launch, stats } from './spike/islands/lib.mjs';

const [workers = '2', roundsArg = '40', tRoundsArg = '3', pRoundsArg = '9'] = process.argv.slice(2);
const rounds = Number(roundsArg);
const modes = (process.env.BENCH_MODES ?? 'dsd').split(',');
const label = (mode, route) => (modes.length === 1 ? route : `${mode}:${route}`);
const baseRoutes = ['full', 'islands', 'cached', 'inorder', 'perchunk', 'early', 'ooo'];
const withModes = (list) => modes.flatMap((m) => list.map((r) => label(m, r)));
const routes = withModes(baseRoutes);
const pages = ['list-50', 'kitchen-sink'];
const conc = 4;

const servers = [];
const ports = {};
for (const mode of modes) {
  const server = spawn(process.execPath, [fileURLToPath(new URL('./bench/islands-server.mjs', import.meta.url)), '0', workers, mode], { stdio: ['ignore', 'pipe', 'inherit'] });
  servers.push(server);
  ports[mode] = await new Promise((ok, no) => {
    server.stdout.on('data', (d) => { const m = /listening (\d+)/.exec(String(d)); if (m) ok(Number(m[1])); });
    server.on('exit', (c) => no(new Error(`server exited ${c}`)));
  });
}
const port = ports[modes[0]];
/** `dsd:islands` -> where it is served: the server of its mode, the route */
const at = (id) => { const [mode, route] = id.includes(':') ? id.split(':') : [modes[0], id]; return { port: ports[mode], route }; };

const get = (path, agent, port = ports[modes[0]]) =>
  new Promise((ok, no) => {
    const t0 = performance.now();
    let first = null;
    let bytes = 0;
    let chunks = 0;
    http.get({ host: '127.0.0.1', port, path, agent, headers: { 'accept-encoding': 'gzip' } }, (res) => {
      res.on('data', (d) => { first ??= performance.now() - t0; bytes += d.length; chunks++; });
      res.on('end', () => ok({ ttfb: first, ttlb: performance.now() - t0, bytes, chunks }));
    }).on('error', no);
  });

console.log(`workers ${workers}, ${rounds} sequential rounds, ${tRoundsArg} throughput rounds of 5 s at concurrency ${conc}; gzip; ${modes.join(' and ')}`);
for (const page of pages) {
  const acc = Object.fromEntries(routes.map((r) => [r, { ttfb: [], ttlb: [], bytes: 0, chunks: 0 }]));
  for (let i = 0; i < rounds + 3; i++) {
    for (const route of routes.map((_, k) => routes[(k + i) % routes.length])) {
      const t = at(route);
      const r = await get(`/${t.route}/${page}`, undefined, t.port);
      if (i < 3) continue;
      acc[route].ttfb.push(r.ttfb); acc[route].ttlb.push(r.ttlb); acc[route].bytes = r.bytes; acc[route].chunks = r.chunks;
    }
  }
  for (const r of routes) console.log(`${page.padEnd(13)} ${r.padEnd(16)} ttfb ${fmt(stats(acc[r].ttfb))}  last byte ${fmt(stats(acc[r].ttlb))}  gz ${acc[r].bytes}  chunks ${acc[r].chunks}`);
}

const agent = new http.Agent({ keepAlive: true, maxSockets: conc });
const run = async (id, page, ms) => {
  const t = at(id);
  const path = `/${t.route}/${page}`;
  let n = 0;
  const end = performance.now() + ms;
  await Promise.all(Array.from({ length: conc }, async () => { while (performance.now() < end) { await get(path, agent, t.port); n++; } }));
  return n / (ms / 1000);
};
const troutes = withModes(['full', 'islands', 'cached', 'inorder', 'early', 'ooo']);
for (const page of Number(tRoundsArg) > 0 ? pages : []) {
  const acc = Object.fromEntries(troutes.map((r) => [r, []]));
  for (const r of troutes) await run(r, page, 1000);
  for (let round = 0; round < Number(tRoundsArg); round++)
    for (const r of troutes.map((_, k) => troutes[(k + round) % troutes.length])) acc[r].push(await run(r, page, 5000));
  for (const r of troutes) console.log(`${page.padEnd(13)} ${r.padEnd(16)} req/s ${fmt(stats(acc[r]))}`);
}
agent.destroy();

const pRounds = Number(pRoundsArg);
if (pRounds > 0) {
  const profiles = {
    unthrottled: { cdp: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, up: 0 },
    'fast3g (75+75 ms)': { cdp: { offline: false, latency: 75, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }, up: 75 },
  };
  const proutes = withModes(['full', 'islands', 'inorder', 'early', 'ooo', 'cached']);
  const browser = await launch();
  const load = async (id, pageName, { cdp, up }) => {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 800 } });
    const page = await ctx.newPage();
    const session = await ctx.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', cdp);
    await page.addInitScript(() => {
      window.__fcp = 0;
      window.__lcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const t = at(id);
    await page.goto(`http://127.0.0.1:${t.port}/${t.route}/${pageName}${up ? `?up=${up}` : ''}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__fcp > 0, null, { timeout: 30000 });
    await page.waitForTimeout(150); // the last largest-contentful-paint candidate is in by now (the page has no client script)
    const m = await page.evaluate(() => ({ fcp: window.__fcp, lcp: window.__lcp, responseStart: performance.getEntriesByType('navigation')[0].responseStart }));
    await ctx.close();
    return m;
  };
  for (const [pname, profile] of Object.entries(profiles)) {
    for (const page of pages) {
      const acc = Object.fromEntries(proutes.map((r) => [r, { fcp: [], lcp: [], rs: [] }]));
      for (let i = 0; i < pRounds + 1; i++)
        for (const route of proutes.map((_, k) => proutes[(k + i) % proutes.length])) {
          const m = await load(route, page, profile);
          if (i === 0) continue; // warm-up round
          acc[route].fcp.push(m.fcp); acc[route].lcp.push(m.lcp); acc[route].rs.push(m.responseStart);
        }
      for (const r of proutes) console.log(`${pname.padEnd(18)} ${page.padEnd(13)} ${r.padEnd(16)} FCP ${fmt(stats(acc[r].fcp), 0)}  LCP ${fmt(stats(acc[r].lcp), 0)}  responseStart ${fmt(stats(acc[r].rs), 0)}`);
    }
  }
  await browser.close();
}
for (const s of servers) s.kill();
