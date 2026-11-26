// Q5, server side under load: requests per second and latency at a fixed concurrency, routes interleaved (3 rounds of 5 s each).
//   node spike/islands/measure-throughput.mjs <port> [concurrency=4]
import http from 'node:http';

import { fmt, stats } from './lib.mjs';

const [port, concArg = '4'] = process.argv.slice(2);
const conc = Number(concArg);
const agent = new http.Agent({ keepAlive: true, maxSockets: conc });
const routes = ['full', 'noisl', 'inorder', 'ooo'];
const pages = ['list-50', 'kitchen-sink'];
const once = (path) => new Promise((ok, fail) => { const t0 = performance.now(); http.get({ host: '127.0.0.1', port, path, agent, headers: { 'accept-encoding': 'gzip' } }, (res) => { res.resume(); res.on('end', () => ok(performance.now() - t0)); }).on('error', fail); });
const run = async (path, ms) => {
  const lat = [];
  const end = performance.now() + ms;
  await Promise.all(Array.from({ length: conc }, async () => { while (performance.now() < end) lat.push(await once(path)); }));
  return { rps: lat.length / (ms / 1000), lat };
};
for (const page of pages) {
  const acc = Object.fromEntries(routes.map((r) => [r, { rps: [], lat: [] }]));
  for (const r of routes) await run(`/${r}/${page}`, 1000); // warm
  for (let round = 0; round < 3; round++)
    for (const r of routes.map((_, k) => routes[(k + round) % routes.length])) {
      const x = await run(`/${r}/${page}`, 5000);
      acc[r].rps.push(x.rps);
      acc[r].lat.push(...x.lat);
    }
  for (const r of routes) console.log(`${page.padEnd(13)} ${r.padEnd(8)} rps ${fmt(stats(acc[r].rps))}  latency ms ${fmt(stats(acc[r].lat))}`);
}
agent.destroy();
