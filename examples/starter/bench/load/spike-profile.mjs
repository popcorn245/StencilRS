// Spike (docs/spike-lazy-define.md): CPU-profile loads of the stencilrs page (unminified build) and
// sum the time under each function. usage: node spike-profile.mjs <dist dir> [runs] [cpuRate]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const dir = process.argv[2], RUNS = Number(process.argv[3] ?? 5), RATE = Number(process.argv[4] ?? 1);
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  try {
    const p = join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'text/plain' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
await new Promise((r) => server.on('listening', r));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const agg = [];
for (let i = 0; i < RUNS + 1; i++) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  const { profile } = await cdp.send('Profiler.stop');
  await ctx.close();
  if (!i) continue;
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  profile.samples.forEach((id, k) => self.set(id, (self.get(id) ?? 0) + (profile.timeDeltas[k] ?? 0)));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const totals = {};
  const selfBy = {};
  for (const [id, t] of self) {
    const key = byId.get(id).callFrame.functionName || '(anon)';
    selfBy[key] = (selfBy[key] ?? 0) + t;
    const seen = new Set();
    for (let c = id; c; c = parent.get(c)) {
      const f = byId.get(c).callFrame.functionName || '(anon)';
      if (seen.has(f)) continue;
      seen.add(f);
      totals[f] = (totals[f] ?? 0) + t;
    }
  }
  agg.push({ totals, selfBy });
}
const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
const names = new Set(agg.flatMap((a) => Object.keys(a.totals)));
const rows = [...names].map((n) => [n, med(agg.map((a) => (a.totals[n] ?? 0) / 1000)), med(agg.map((a) => (a.selfBy[n] ?? 0) / 1000))]);
rows.sort((a, b) => b[1] - a[1]);
console.log('function | inclusive ms (median) | self ms');
for (const [n, t, s] of rows.slice(0, 32)) console.log(`${n.padEnd(34)} ${t.toFixed(2).padStart(8)} ${s.toFixed(2).padStart(8)}`);
await browser.close();
server.close();
