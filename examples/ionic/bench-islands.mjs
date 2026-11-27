// Issues #191 and #192: the islands engine and its streaming responder against the whole-page render, over HTTP, interleaved A/B (every
// round visits each route once, the order rotating), medians with min-max and n. Starts bench/islands-server.mjs itself.
//   node bench-islands.mjs [workers=2] [rounds=40] [throughputRounds=3] [paintRounds=9]
// Time to first byte, last byte and gzip size per route, then requests/s at concurrency 4, then first contentful paint in Chromium (cold cache,
// 414x800, the page's Ionic stylesheet render-blocking) unthrottled and on a 'Fast 3G' profile whose latency is split into 75 ms before the
// request reaches the server and 75 ms back (a single CDP latency would hide the server's time). `paintRounds=0` skips the browser part.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { fmt, launch, stats } from './spike/islands/lib.mjs';

const [workers = '2', roundsArg = '40', tRoundsArg = '3', pRoundsArg = '9'] = process.argv.slice(2);
const rounds = Number(roundsArg);
const routes = ['full', 'islands', 'inorder', 'perchunk', 'early', 'ooo'];
const pages = ['list-50', 'kitchen-sink'];
const conc = 4;

const server = spawn(process.execPath, [fileURLToPath(new URL('./bench/islands-server.mjs', import.meta.url)), '0', workers], { stdio: ['ignore', 'pipe', 'inherit'] });
const port = await new Promise((ok, no) => {
  server.stdout.on('data', (d) => { const m = /listening (\d+)/.exec(String(d)); if (m) ok(Number(m[1])); });
  server.on('exit', (c) => no(new Error(`server exited ${c}`)));
});

const get = (path, agent) =>
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

console.log(`workers ${workers}, ${rounds} sequential rounds, ${tRoundsArg} throughput rounds of 5 s at concurrency ${conc}; gzip; DSD`);
for (const page of pages) {
  const acc = Object.fromEntries(routes.map((r) => [r, { ttfb: [], ttlb: [], bytes: 0, chunks: 0 }]));
  for (let i = 0; i < rounds + 3; i++) {
    for (const route of routes.map((_, k) => routes[(k + i) % routes.length])) {
      const r = await get(`/${route}/${page}`);
      if (i < 3) continue;
      acc[route].ttfb.push(r.ttfb); acc[route].ttlb.push(r.ttlb); acc[route].bytes = r.bytes; acc[route].chunks = r.chunks;
    }
  }
  for (const r of routes) console.log(`${page.padEnd(13)} ${r.padEnd(8)} ttfb ${fmt(stats(acc[r].ttfb))}  last byte ${fmt(stats(acc[r].ttlb))}  gz ${acc[r].bytes}  chunks ${acc[r].chunks}`);
}

const agent = new http.Agent({ keepAlive: true, maxSockets: conc });
const run = async (path, ms) => {
  let n = 0;
  const end = performance.now() + ms;
  await Promise.all(Array.from({ length: conc }, async () => { while (performance.now() < end) { await get(path, agent); n++; } }));
  return n / (ms / 1000);
};
const troutes = ['full', 'islands', 'inorder', 'ooo'];
for (const page of Number(tRoundsArg) > 0 ? pages : []) {
  const acc = Object.fromEntries(troutes.map((r) => [r, []]));
  for (const r of troutes) await run(`/${r}/${page}`, 1000);
  for (let round = 0; round < Number(tRoundsArg); round++)
    for (const r of troutes.map((_, k) => troutes[(k + round) % troutes.length])) acc[r].push(await run(`/${r}/${page}`, 5000));
  for (const r of troutes) console.log(`${page.padEnd(13)} ${r.padEnd(8)} req/s ${fmt(stats(acc[r]))}`);
}
agent.destroy();

const pRounds = Number(pRoundsArg);
if (pRounds > 0) {
  const profiles = {
    unthrottled: { cdp: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, up: 0 },
    'fast3g (75+75 ms)': { cdp: { offline: false, latency: 75, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }, up: 75 },
  };
  const proutes = ['full', 'inorder', 'early', 'ooo'];
  const browser = await launch();
  const load = async (path, { cdp, up }) => {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 800 } });
    const page = await ctx.newPage();
    const session = await ctx.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', cdp);
    await page.addInitScript(() => {
      window.__fcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    });
    await page.goto(`http://127.0.0.1:${port}${path}${up ? `?up=${up}` : ''}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__fcp > 0, null, { timeout: 30000 });
    const m = await page.evaluate(() => ({ fcp: window.__fcp, responseStart: performance.getEntriesByType('navigation')[0].responseStart }));
    await ctx.close();
    return m;
  };
  for (const [pname, profile] of Object.entries(profiles)) {
    for (const page of pages) {
      const acc = Object.fromEntries(proutes.map((r) => [r, { fcp: [], rs: [] }]));
      for (let i = 0; i < pRounds + 1; i++)
        for (const route of proutes.map((_, k) => proutes[(k + i) % proutes.length])) {
          const m = await load(`/${route}/${page}`, profile);
          if (i === 0) continue; // warm-up round
          acc[route].fcp.push(m.fcp); acc[route].rs.push(m.responseStart);
        }
      for (const r of proutes) console.log(`${pname.padEnd(18)} ${page.padEnd(13)} ${r.padEnd(8)} FCP ${fmt(stats(acc[r].fcp), 0)}  responseStart ${fmt(stats(acc[r].rs), 0)}`);
    }
  }
  await browser.close();
}
server.kill();
