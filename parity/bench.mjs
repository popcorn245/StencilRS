// Benchmark: Stencil v5 transpileSync vs stencilrs transpile on the parity corpus.
//
//   node bench.mjs [rounds=10]
//
// Same files, same contract (the customelement module @stencil/unplugin asks for), one
// process, single-threaded. The first round of each is reported separately (cold: module
// load, TypeScript warm-up). Stencil is timed with and without source maps, since stencilrs
// does not emit source maps yet.
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { transpileSync, versions } from '@stencil/core/compiler';

import { transpile } from '../index.js';
import { listFixtures, stencilrsOptions, transpileOptions } from './lib.mjs';

const rounds = Number(process.argv[2] ?? 10);
const files = listFixtures().map(({ id, file }) => ({ id, code: readFileSync(file, 'utf8') }));
const bytes = files.reduce((n, f) => n + f.code.length, 0);

const runners = {
  'stencil (source maps)': (f) => transpileSync(f.code, transpileOptions(f.code, f.id)),
  'stencil (no maps)': (f) => transpileSync(f.code, { ...transpileOptions(f.code, f.id), sourceMap: false }),
  stencilrs: (f) => transpile(f.code, stencilrsOptions(f.code, f.id)),
};

const time = (fn) => {
  const t0 = performance.now();
  for (const f of files) fn(f);
  return performance.now() - t0;
};

const results = {};
for (const [name, fn] of Object.entries(runners)) {
  const cold = time(fn);
  const warm = [];
  for (let i = 0; i < rounds; i++) warm.push(time(fn));
  warm.sort((a, b) => a - b);
  results[name] = { cold, median: warm[Math.floor(warm.length / 2)], best: warm[0] };
}

const ms = (v) => `${v.toFixed(1)} ms`.padStart(10);
console.log(
  `${files.length} files, ${(bytes / 1024).toFixed(0)} KiB · stencil ${versions.stencil} (typescript ${versions.typescript}) · ${rounds} rounds\n`,
);
console.log(`${'compiler'.padEnd(24)}${'cold'.padStart(10)}${'median'.padStart(10)}${'best'.padStart(10)}${'per file'.padStart(12)}`);
for (const [name, r] of Object.entries(results)) {
  console.log(`${name.padEnd(24)}${ms(r.cold)}${ms(r.median)}${ms(r.best)}${`${((r.median / files.length) * 1000).toFixed(0)} µs`.padStart(12)}`);
}
const rs = results.stencilrs.median;
console.log(
  `\nstencilrs is ${(results['stencil (source maps)'].median / rs).toFixed(1)}× faster than stencil with maps,` +
    ` ${(results['stencil (no maps)'].median / rs).toFixed(1)}× without (median, warm).`,
);
