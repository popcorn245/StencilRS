// A/B of hydrate-app variants on one machine, for docs/profile-ssr.md: every variant renders every page and mode in its
// own process, interleaved over several rounds (so drift hits all alike), and must be byte-identical to the first.
//   node ssr-bench/variants.mjs [--rounds 5] [--renders 30] [--pages list-50,kitchen-sink] <label>=<index.js> ...   (first is the baseline)
// Prints the median over rounds of each combination's warm median ms/render, and the change against the baseline.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const argv = process.argv.slice(2);
const opts = { rounds: 5, renders: 30, pages: 'list-50,kitchen-sink' };
const variants = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) opts[argv[i].slice(2)] = argv[++i];
  else variants.push({ label: argv[i].split('=')[0], file: resolve(argv[i].split('=').slice(1).join('=')), samples: {} });
}
const env = { ...process.env, SSR_BENCH_PAGES: opts.pages };
const node = (script, args) => execFileSync(process.execPath, [join(root, 'ssr-bench', script), ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

const tmp = mkdtempSync(join(os.tmpdir(), 'ssr-variants-'));
for (const v of variants) node('html.mjs', [v.file, join(tmp, v.label)]);
const base = join(tmp, variants[0].label);
for (const v of variants.slice(1)) {
  for (const f of readdirSync(base)) {
    if (readFileSync(join(base, f), 'utf8') !== readFileSync(join(tmp, v.label, f), 'utf8')) throw new Error(`${v.label} differs from ${variants[0].label} on ${f}`);
  }
}
console.error(`byte-identical to ${variants[0].label}: ${variants.slice(1).map((v) => v.label).join(', ')}`);

for (let r = 0; r < Number(opts.rounds); r++) {
  for (const v of variants) {
    const { results } = JSON.parse(node('render.mjs', [v.file, '3', opts.renders]).trim().split('\n').pop());
    for (const [k, x] of Object.entries(results)) (v.samples[k] ??= []).push(x.medianMs);
  }
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const keys = Object.keys(variants[0].samples).filter((k) => !k.startsWith('fragment'));
console.log(`| combination | ${variants.map((v) => v.label).join(' | ')} |`);
console.log(`|---|${variants.map(() => '---:').join('|')}|`);
for (const k of keys) {
  const b = med(variants[0].samples[k]);
  console.log(`| ${k} | ${variants.map((v, i) => { const m = med(v.samples[k]); return i ? `${m.toFixed(1)} (${(((m - b) / b) * 100).toFixed(1)}%)` : m.toFixed(1); }).join(' | ')} |`);
}
