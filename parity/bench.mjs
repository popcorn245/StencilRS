// Benchmark: Stencil v5 transpileSync vs stencilrs transpile on the parity corpus.
//
//   node bench.mjs [rounds=10] [--json <file>]
//
// --json writes the numbers (and the file count, size and versions) for scripts/refresh-benchmarks.mjs.
//
// Same files, same contract (the customelement module @stencil/unplugin asks for), one
// process, single-threaded. The first round of each is reported separately (cold: module
// load, TypeScript warm-up). Both are timed with and without source maps.
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { transpileSync, versions } from '@stencil/core/compiler';

import { transpile } from '../index.js';
import { listFixtures, stencilrsOptions, transpileOptions } from './lib.mjs';

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const rounds = Number(args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--json') ?? 10);
const files = listFixtures().map(({ id, file }) => ({ id, code: readFileSync(file, 'utf8') }));
const bytes = files.reduce((n, f) => n + f.code.length, 0);

const runners = {
  'stencil (source maps)': (f) => transpileSync(f.code, transpileOptions(f.code, f.id)),
  'stencil (no maps)': (f) => transpileSync(f.code, { ...transpileOptions(f.code, f.id), sourceMap: false }),
  'stencilrs (source maps)': (f) => transpile(f.code, stencilrsOptions(f.code, f.id)),
  'stencilrs (no maps)': (f) => transpile(f.code, { ...stencilrsOptions(f.code, f.id), sourceMap: false }),
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
const x = (a, b) => (results[a].median / results[b].median).toFixed(1);
console.log(
  `\nstencilrs is ${x('stencil (source maps)', 'stencilrs (source maps)')}× faster than stencil with source maps,` +
    ` ${x('stencil (no maps)', 'stencilrs (no maps)')}× without (median, warm).`,
);
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ files: files.length, kib: Math.round(bytes / 1024), rounds, stencil: versions.stencil, typescript: versions.typescript, results }, null, 2) + '\n');
}
