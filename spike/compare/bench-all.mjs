// Warm ms/render of the 500-card page across SSR renderers, interleaved in one process (the order of
// the renderers rotates every iteration), plus HTML bytes and gzip bytes.
//   node spike/compare/bench-all.mjs [n=40] [--json]
// Needs: the stencilrs string bundle (spike/vite.string.config.ts), the Qwik build (bench/qwik/load),
// `node spike/compare/build-solid.mjs`. Astro runs in its own vitest process (astro/bench.test.js).
import { gzipSync } from 'node:zlib';
import { createStringRenderer } from '../runtime-string.js';

const N = Number(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 40);
const bench = new URL('../../examples/starter/bench/', import.meta.url);

const str = await createStringRenderer(() => import(new URL('dist-load-string-server/entry-server.js', bench)));
const { renderLit, renderLitTemplates } = await import('./lit-page.mjs');
const { renderSolid } = await import('./dist/solid-page.mjs');
const { default: qwikRender } = await import(new URL('dist-load-qwik/server/entry.ssr.js', bench));

const renderers = {
  'stencilrs string (spike)': () => str('<load-app></load-app>'),
  'Lit SSR (custom element per card)': async () => renderLit(),
  'Lit SSR (templates only)': async () => renderLitTemplates(),
  'solid-js renderToString': async () => renderSolid(),
  'Qwik renderToString': async () => (await qwikRender({ base: '/build/' })).html,
};
const names = Object.keys(renderers);
const times = Object.fromEntries(names.map((n) => [n, []]));
const html = {};
for (const n of names) for (let i = 0; i < 5; i++) html[n] = await renderers[n]();
for (let i = 0; i < N; i++) {
  for (let k = 0; k < names.length; k++) {
    const name = names[(i + k) % names.length];
    const s = performance.now();
    html[name] = await renderers[name]();
    times[name].push(performance.now() - s);
  }
}
const stat = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return { median: s[s.length >> 1], min: s[0], max: s.at(-1) };
};
const out = {};
for (const n of names) {
  const st = stat(times[n]);
  out[n] = { ...st, rps: 1000 / st.median, bytes: Buffer.byteLength(html[n]), gzip: gzipSync(html[n]).length, cards: (html[n].match(/class="card"/g) || []).length };
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
else {
  console.log(`n=${N}\n| renderer | median ms | min-max ms | renders/s | HTML bytes | gzip bytes | cards |\n|---|---:|---:|---:|---:|---:|---:|`);
  for (const [n, r] of Object.entries(out)) console.log(`| ${n} | ${r.median.toFixed(2)} | ${r.min.toFixed(2)}-${r.max.toFixed(2)} | ${r.rps.toFixed(0)} | ${r.bytes} | ${r.gzip} | ${r.cards} |`);
}
process.exit(0);
