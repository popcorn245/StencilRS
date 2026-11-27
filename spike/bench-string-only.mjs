// The string renderer alone (for --cpu-prof): node spike/bench-string-only.mjs [n]
import { createStringRenderer } from './runtime-string.js';
const bench = new URL('../examples/starter/bench/', import.meta.url);
const render = await createStringRenderer(() => import(new URL('dist-load-string-server/entry-server.js', bench)));
const n = Number(process.argv[2] ?? 300);
for (let i = 0; i < 20; i++) render.sync('<load-app></load-app>');
const ts = [];
for (let i = 0; i < n; i++) {
  const s = performance.now();
  render.sync('<load-app></load-app>');
  ts.push(performance.now() - s);
}
ts.sort((a, b) => a - b);
console.log(JSON.stringify({ n, median: +ts[n >> 1].toFixed(2), min: +ts[0].toFixed(2), p90: +ts[Math.floor(n * 0.9)].toFixed(2) }));
