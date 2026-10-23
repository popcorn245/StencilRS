// Binding overhead: stencilrs `transpile` and `analyze` through Node over the ui-kit components
// (parity/fixtures/ui-kit), one process, single-threaded.
//
//   node bench-binding.mjs [rounds=30]
//
// Compare with the Rust-only time of the same calls: the gap is the cost of the Node binding
// (argument copies, building the JS result).
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { analyze, transpile } from '../index.js';
import { listFixtures, stencilrsOptions } from './lib.mjs';

const rounds = Number(process.argv[2] ?? 30);
const files = listFixtures('ui-kit').map(({ id, file }) => ({ id, code: readFileSync(file, 'utf8') }));

const runners = {
  transpile: (f) => transpile(f.code, stencilrsOptions(f.code, f.id)),
  'transpile (no maps)': (f) => transpile(f.code, { ...stencilrsOptions(f.code, f.id), sourceMap: false }),
  analyze: (f) => analyze(f.code, f.id),
};

const time = (fn) => {
  const t0 = performance.now();
  for (const f of files) fn(f);
  return performance.now() - t0;
};

console.log(`${files.length} ui-kit files, ${rounds} rounds (median / best, warm)`);
for (const [name, fn] of Object.entries(runners)) {
  time(fn);
  const runs = Array.from({ length: rounds }, () => time(fn)).sort((a, b) => a - b);
  console.log(`${name.padEnd(22)}${runs[Math.floor(rounds / 2)].toFixed(1).padStart(8)} ms${runs[0].toFixed(1).padStart(8)} ms`);
}
