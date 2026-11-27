// Issue #191: the islands engine against the whole-page render, over HTTP, interleaved A/B (every round visits each route once, the
// order rotating), medians with min-max and n. Starts bench/islands-server.mjs itself.
//   node bench-islands.mjs [workers=2] [rounds=40] [throughputRounds=3]
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { fmt, stats } from './spike/islands/lib.mjs';

const [workers = '2', roundsArg = '40', tRoundsArg = '3'] = process.argv.slice(2);
const rounds = Number(roundsArg);
const routes = ['full', 'islands', 'inorder', 'early'];
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
const troutes = ['full', 'islands', 'inorder'];
for (const page of pages) {
  const acc = Object.fromEntries(troutes.map((r) => [r, []]));
  for (const r of troutes) await run(`/${r}/${page}`, 1000);
  for (let round = 0; round < Number(tRoundsArg); round++)
    for (const r of troutes.map((_, k) => troutes[(k + round) % troutes.length])) acc[r].push(await run(`/${r}/${page}`, 5000));
  for (const r of troutes) console.log(`${page.padEnd(13)} ${r.padEnd(8)} req/s ${fmt(stats(acc[r]))}`);
}
agent.destroy();
server.kill();
