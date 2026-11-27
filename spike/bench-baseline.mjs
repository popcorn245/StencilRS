// Baseline: happy-dom server renderer on the 500-card page. Cold first render + n warm renders.
//   node spike/bench-baseline.mjs [n]      (needs happy-dom resolvable: run with NODE_PATH or from examples/starter)
import { createRenderer } from '../runtime-server.js';
import { gzipSync } from 'node:zlib';
const N = Number(process.argv[2] ?? 30);
const t0 = performance.now();
const render = await createRenderer(() => import('../examples/starter/bench/dist-load-stencilrs-server/entry-server.js'));
const t1 = performance.now();
const a = performance.now();
let html = await render('<load-app></load-app>');
const cold = performance.now() - a;
const ts = [];
for (let i = 0; i < N; i++) {
  const s = performance.now();
  html = await render('<load-app></load-app>');
  ts.push(performance.now() - s);
}
ts.sort((x, y) => x - y);
console.log(JSON.stringify({ setupMs: +(t1 - t0).toFixed(1), coldMs: +cold.toFixed(1), median: +ts[ts.length >> 1].toFixed(1), min: +ts[0].toFixed(1), max: +ts.at(-1).toFixed(1), bytes: html.length, gz: gzipSync(html).length }));
process.exit(0);
