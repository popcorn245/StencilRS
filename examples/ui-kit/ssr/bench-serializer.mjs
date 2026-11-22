// Micro-benchmark: mock-doc's generator serializer against ssr-serializer.js, in the ui-kit's hydrate app.
//
//   node ssr/bench-serializer.mjs [rounds]
//
// Builds the hydrate app twice (STENCILRS_SLOW_SERIALIZER=1 keeps Stencil's serializer), renders the
// same pages with each, and checks the HTML is byte-identical before it times anything. Rounds
// alternate slow and fast in one process so neither gets the quieter half; the median of each is
// reported.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildHydrate } from './build.mjs';
import { PAGE } from './page.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rounds = Number(process.argv[2]) || 15;
const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

const variant = async (name, slow) => {
  if (slow) process.env.STENCILRS_SLOW_SERIALIZER = '1';
  else delete process.env.STENCILRS_SLOW_SERIALIZER;
  const dir = join(root, `dist/hydrate-bench-${name}`);
  mkdirSync(dir, { recursive: true });
  return import(pathToFileURL(await buildHydrate(dir)).href);
};
const slow = await variant('slow', true);
const fast = await variant('fast', false);

// The smoke page's card, once and 100 times in a list.
const many = PAGE.replace(/<pop-card[\s\S]*<\/pop-card>/, (card) => Array.from({ length: 100 }, () => card).join('\n'));
const pages = { 'smoke page': PAGE, '100 cards': many };
const opts = { prettyHtml: false, buildId: 'bench' };

for (const [name, page] of Object.entries(pages)) {
  const a = (await slow.renderToString(page, opts)).html;
  const b = (await fast.renderToString(page, opts)).html;
  if (a !== b) throw new Error(`${name}: output differs (${a.length} vs ${b.length} bytes)`);
  const times = { slow: [], fast: [] };
  for (let i = 0; i < rounds + 3; i++) {
    for (const [k, app] of [['slow', slow], ['fast', fast]]) {
      const t = performance.now();
      await app.renderToString(page, opts);
      if (i >= 3) times[k].push(performance.now() - t);
    }
  }
  const s = median(times.slow);
  const f = median(times.fast);
  console.log(`${name.padEnd(11)} ${(a.length / 1024).toFixed(0).padStart(5)} kB identical  renderToString median: mock-doc ${s.toFixed(1)} ms, single-pass ${f.toFixed(1)} ms (${(s / f).toFixed(2)}x)`);
}
