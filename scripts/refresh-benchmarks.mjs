// Re-runs every benchmark and writes the results into storybook/docs/data/benchmarks.json (the
// page storybook/docs/Benchmarks.mdx renders), then updates the headline numbers in README.md
// and storybook/docs/Introduction.mdx from it (scripts/bench-docs.mjs).
//
// To refresh on a quiet machine (Windows, macOS or Linux; nothing here needs a shell), from the
// repository root, with Rust and Node 22 installed:
//
//   npm ci && npm run build:native && npm --prefix parity ci && npm --prefix examples/ui-kit ci
//   node scripts/refresh-benchmarks.mjs
//
// Close other programs first and leave the machine alone while it runs (about 10-15 minutes).
// Review `git diff`, then commit benchmarks.json, README.md and Introduction.mdx together.
//
// What it runs, each as the page's "Reproduce" section says:
//   parity/bench.mjs                  per-file transpile, both compilers, with and without source maps
//   examples/ui-kit/bench-build.mjs   warm `vite build` of the ui-kit in one process
//   examples/ui-kit/bench-stencil-build.mjs   a full `stencil build`, stock vs stencilrs swapped in
//   examples/ui-kit/bench-cold.mjs    COLD start: fresh-process `vite build` (module load included)
//                                     and dev server to first response, both compilers
//
// Options:
//   --out <file>             write here instead of storybook/docs/data/benchmarks.json
//   --no-docs                leave README.md and Introduction.mdx alone
//   --skip <a,b>             skip steps (transpile, vite-build, stencil-build, cold); a skipped
//                            step keeps its section from the existing benchmarks.json
//   --rounds N               transpile rounds per run (10)
//   --repeats N              runs of transpile and vite-build, the median is kept (3)
//   --vite-rounds N          builds per vite-build run (3)
//   --stencil-build-runs N   (5)
//   --cold-runs N            (5)
//   --machine "<text>"       machine description, instead of the one read from the OS
// A smoke run: node scripts/refresh-benchmarks.mjs --rounds 2 --repeats 1 --vite-rounds 2 \
//   --stencil-build-runs 1 --cold-runs 2 --out some/scratch.json --no-docs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defaultJson, syncDocs } from './bench-docs.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uiKit = join(repo, 'examples/ui-kit');
const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const num = (name, def) => Number(opt(name, def));
const out = resolve(opt('--out', defaultJson));
const skip = new Set(opt('--skip', '').split(',').filter(Boolean));
const cfg = { rounds: num('--rounds', 10), repeats: num('--repeats', 3), viteRounds: num('--vite-rounds', 3), sbRuns: num('--stencil-build-runs', 5), coldRuns: num('--cold-runs', 5) };
if (cfg.viteRounds < 2) throw new Error('--vite-rounds must be at least 2 (the first build is reported apart from the warm median)');

// JSON in the file's existing style: indented, but objects below the top-level sections (a row)
// on one line.
const flat = (v) => Array.isArray(v) ? `[${v.map(flat).join(', ')}]` : v && typeof v === 'object' ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${flat(x)}`).join(', ')} }` : JSON.stringify(v);
const fmt = (v, depth = 0) => {
  if (depth >= 2 && v && typeof v === 'object') return flat(v);
  const pad = '  '.repeat(depth + 1);
  if (Array.isArray(v)) return `[\n${v.map((x) => pad + fmt(x, depth + 1)).join(',\n')}\n${'  '.repeat(depth)}]`;
  if (v && typeof v === 'object') return `{\n${Object.entries(v).map(([k, x]) => `${pad}${JSON.stringify(k)}: ${fmt(x, depth + 1)}`).join(',\n')}\n${'  '.repeat(depth)}}`;
  return JSON.stringify(v);
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const round = (v) => Math.round(v);
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const prev = existsSync(out) ? readJson(out) : existsSync(defaultJson) ? readJson(defaultJson) : {};

const node = (cwd, script, ...a) => {
  console.log(`\n$ node ${script} ${a.join(' ')}   (in ${cwd})`);
  const r = spawnSync(process.execPath, [script, ...a], { cwd, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${script} failed (exit ${r.status ?? r.error})`);
};
const tool = (cmd, a) => {
  const r = spawnSync(cmd, a, { encoding: 'utf8', shell: process.platform === 'win32' });
  return r.status === 0 ? r.stdout.trim() : null;
};

// ---- machine and versions ----
const cpus = os.cpus();
const machine = opt('--machine', `${cpus[0].model.replace(/\s+/g, ' ').trim()} (${cpus.length} threads), ${Math.round(os.totalmem() / 2 ** 30)} GB, ${process.platform === 'win32' ? os.version() : `${os.type()} ${os.release()}`}, Node ${process.versions.node}`);
const lock = readFileSync(join(repo, 'Cargo.lock'), 'utf8');
const oxc = /name = "oxc_parser"\nversion = "(\d+\.\d+)/.exec(lock)?.[1];
const rust = /rustc (\d+\.\d+)/.exec(tool('rustc', ['--version']) ?? '')?.[1];
const viteVersion = readJson(join(uiKit, 'node_modules/vite/package.json')).version;

const data = { ...prev, date: new Date().toISOString().slice(0, 10), machine };
const bench = join(uiKit, '.bench');
mkdirSync(bench, { recursive: true });
let stencilVersions = prev.versions ?? {};

// ---- transpile (parity/bench.mjs) ----
if (!skip.has('transpile')) {
  const runs = [];
  for (let i = 0; i < cfg.repeats; i++) {
    const f = join(bench, `transpile-${i}.json`);
    node(join(repo, 'parity'), 'bench.mjs', String(cfg.rounds), '--json', f);
    runs.push(readJson(f));
  }
  const names = [
    ['stencil (source maps)', 'Stencil v5 transpileSync (source maps, as @stencil/unplugin runs it)'],
    ['stencil (no maps)', 'Stencil v5 transpileSync (no source maps)'],
    ['stencilrs (source maps)', 'stencilrs transpile (source maps, the default)'],
    ['stencilrs (no maps)', 'stencilrs transpile (no source maps)'],
  ];
  const rows = names.map(([k, compiler]) => {
    const medianMs = round(median(runs.map((r) => r.results[k].median)));
    return { compiler, coldMs: round(median(runs.map((r) => r.results[k].cold))), medianMs, perFileUs: round((medianMs / runs[0].files) * 1000) };
  });
  const sp = (a, b) => `${round(rows[a].medianMs / rows[b].medianMs)}×`;
  data.transpile = {
    what: `Compile each file to its customelement module, one process, single-threaded (parity/bench.mjs, ${cfg.rounds} rounds; median of ${cfg.repeats} runs)`,
    files: runs[0].files,
    kib: runs[0].kib,
    rows,
    speedup: `${sp(0, 2)} with source maps, ${sp(1, 3)} without`,
  };
  stencilVersions = { ...stencilVersions, stencil: runs[0].stencil, typescript: runs[0].typescript };
}

// ---- warm vite build (bench-build.mjs) ----
if (!skip.has('vite-build')) {
  const runs = [];
  for (let i = 0; i < cfg.repeats; i++) {
    node(uiKit, 'bench-build.mjs', String(cfg.viteRounds));
    runs.push(readJson(join(bench, 'results.json')));
  }
  const pick = (c, k) => round(median(runs.map((r) => r.results[c][k])));
  const rows = [
    ['stencil', 'Stencil v5 (@stencil/unplugin)'],
    ['stencilrs', 'stencilrs (@popcorn245/stencilrs/vite)'],
  ].map(([c, compiler]) => ({ compiler, firstMs: pick(c, 'first'), warmMedianMs: pick(c, 'median') }));
  data.viteBuild = {
    what: `Production vite build of all ${runs[0].components} ui-kit components as one library (examples/ui-kit/bench-build.mjs, ${cfg.viteRounds} rounds; median of ${cfg.repeats} runs)`,
    components: runs[0].components,
    rows,
    speedup: `${(rows[0].warmMedianMs / rows[1].warmMedianMs).toFixed(1)}× warm, ${(rows[0].firstMs / rows[1].firstMs).toFixed(1)}× first build`,
  };
}

// ---- full stencil build (bench-stencil-build.mjs writes its entry) ----
if (!skip.has('stencil-build')) {
  node(uiKit, 'bench-stencil-build.mjs', String(cfg.sbRuns));
  const e = readJson(join(bench, 'stencil-build-results.json')).entry;
  e.rows[0].compiler = 'Stencil v5';
  e.rows[1].compiler = 'stencilrs (component transforms swapped into Stencil v5)';
  data.stencilBuild = e;
}

// ---- cold start (bench-cold.mjs) ----
if (!skip.has('cold')) {
  node(uiKit, 'bench-cold.mjs', String(cfg.coldRuns));
  Object.assign(data, readJson(join(bench, 'cold-results.json')).entry);
}

data.versions = { stencil: stencilVersions.stencil, typescript: stencilVersions.typescript, vite: viteVersion, oxc: oxc ?? prev.versions?.oxc, rust: rust ?? prev.versions?.rust };
// Key order: the page's own order, then anything new.
const order = ['date', 'machine', 'versions', 'transpile', 'viteBuild', 'coldBuild', 'coldDev', 'stencilBuild'];
const ordered = Object.fromEntries([...order.filter((k) => k in data), ...Object.keys(data).filter((k) => !order.includes(k))].map((k) => [k, data[k]]));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, fmt(ordered) + '\n');
console.log(`\nwrote ${out}`);
if (!args.includes('--no-docs')) {
  const changed = syncDocs({ jsonFile: out });
  console.log(changed.length ? `updated ${changed.join(', ')}` : 'README.md and Introduction.mdx already match');
}
