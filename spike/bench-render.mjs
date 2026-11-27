// stencilrs: happy-dom renderer vs string renderer on the 500-card page, interleaved in one process.
//   node spike/bench-render.mjs [n=50]      cold: node spike/bench-render.mjs cold string|dom
import { createStringRenderer } from './runtime-string.js';
import { createRenderer } from '../runtime-server.js';
import { gzipSync } from 'node:zlib';

const bench = new URL('../examples/starter/bench/', import.meta.url);
const loadString = () => import(new URL('dist-load-string-server/entry-server.js', bench));
const loadDom = () => import(new URL('dist-load-stencilrs-server/entry-server.js', bench));
const PAGE = '<load-app></load-app>';
const stat = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return { median: s[s.length >> 1], min: s[0], max: s.at(-1) };
};

if (process.argv[2] === 'cold') {
  const which = process.argv[3];
  const t0 = performance.now();
  const render = which === 'string' ? await createStringRenderer(loadString) : await createRenderer(loadDom);
  const t1 = performance.now();
  const html = await render(PAGE);
  const t2 = performance.now();
  const html2 = await render(PAGE);
  const t3 = performance.now();
  console.log(JSON.stringify({ which, setupMs: +(t1 - t0).toFixed(1), firstRenderMs: +(t2 - t1).toFixed(1), secondRenderMs: +(t3 - t2).toFixed(1), bytes: html.length, same: html === html2 }));
  process.exit(0);
}

const N = Number(process.argv[2] ?? 50);
const str = await createStringRenderer(loadString);
const dom = await createRenderer(loadDom);
const a = await str(PAGE);
const b = await dom(PAGE);
const times = { string: [], dom: [] };
for (let i = 0; i < 3; i++) (await str(PAGE), await dom(PAGE)); // warm both
for (let i = 0; i < N; i++) {
  // alternate who goes first
  for (const [name, r] of i % 2 ? [['dom', dom], ['string', str]] : [['string', str], ['dom', dom]]) {
    const s = performance.now();
    await r(PAGE);
    times[name].push(performance.now() - s);
  }
}
const out = {};
for (const k of Object.keys(times)) out[k] = { ...Object.fromEntries(Object.entries(stat(times[k])).map(([x, v]) => [x, +v.toFixed(2)])), rendersPerSec: +(1000 / stat(times[k]).median).toFixed(0) };
console.log(JSON.stringify({ n: N, identical: a === b, bytes: a.length, gzip: gzipSync(a).length, ...out }, null, 1));
process.exit(0);
