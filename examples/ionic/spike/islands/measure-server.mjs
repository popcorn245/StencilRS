// Q5, server side: time to first byte and to last byte per route, interleaved rounds (each round visits every route once, the order
// rotating), one request at a time, gzip on. A first byte here is the first body chunk after the headers.
//   node spike/islands/server.mjs 4177 2 dsd &   node spike/islands/measure-server.mjs 4177 [rounds=25]
import http from 'node:http';

import { PAGES, fmt, stats } from './lib.mjs';

const [port, roundsArg = '25'] = process.argv.slice(2);
const rounds = Number(roundsArg);
const routes = ['full', 'noisl', 'inorder', 'early', 'ooo'];

const get = (path) =>
  new Promise((resolve, reject) => {
    const t0 = performance.now();
    let first = null;
    let bytes = 0;
    let chunks = 0;
    http.get({ host: '127.0.0.1', port, path, headers: { 'accept-encoding': 'gzip' } }, (res) => {
      res.on('data', (d) => { first ??= performance.now() - t0; bytes += d.length; chunks++; });
      res.on('end', () => resolve({ ttfb: first, ttlb: performance.now() - t0, bytes, chunks }));
    }).on('error', reject);
  });

const out = [];
for (const pageName of Object.keys(PAGES).filter((p) => p !== 'stress')) {
  const acc = Object.fromEntries(routes.map((r) => [r, { ttfb: [], ttlb: [], bytes: 0, chunks: 0 }]));
  for (let i = 0; i < rounds + 3; i++) {
    const order = routes.map((_, k) => routes[(k + i) % routes.length]);
    for (const route of order) {
      const r = await get(`/${route}/${pageName}`);
      if (i < 3) continue; // warm-up rounds
      acc[route].ttfb.push(r.ttfb);
      acc[route].ttlb.push(r.ttlb);
      acc[route].bytes = r.bytes;
      acc[route].chunks = r.chunks;
    }
  }
  for (const route of routes) out.push({ page: pageName, route, ttfb: stats(acc[route].ttfb), ttlb: stats(acc[route].ttlb), gzBytes: acc[route].bytes, chunks: acc[route].chunks });
}
for (const r of out) console.log(`${r.page.padEnd(13)} ${r.route.padEnd(8)} ttfb ${fmt(r.ttfb)}  ttlb ${fmt(r.ttlb)}  gz ${r.gzBytes}  chunks ${r.chunks}`);
console.log(JSON.stringify(out));
