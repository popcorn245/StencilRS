// SSR benchmark on Ionic 9.0.12 (issue #127): Stencil's built-in server rendering (`renderToString` of a hydrate app),
// one row per hydrate app, every row in its own child processes.
//
//   node bench-ssr.mjs                          # every row that is built, default sizes
//   node bench-ssr.mjs --rows stencil5,stencilrs --renders 50 --duration 10
//
// Rows (ssr-bench/rows.mjs; add one there):
//   ionic-published  @ionic/core@9.0.12/hydrate from npm (Ionic's own Stencil 4 build)
//   stencil5         `npm run build:ssr`: stencil build with `{ type: 'ssr' }` over the migrated source -> dist/hydrate-stencil/
//   stencilrs        dist/hydrate-stencilrs/index.js, built by the stencilrs Ionic hydrate build (#128); skipped while absent
// Pages (ssr-pages.mjs): fragment, list-50, kitchen-sink. Modes: serializeShadowRoot 'declarative-shadow-dom' and 'scoped',
// prettyHtml: false, a fixed buildId (else each render stamps a random data-stencil-build), every other option default,
// identical for every row.
//
// Steps:
//   1. equality   each row renders every page and mode once (ssr-bench/html.mjs). stencil5 and stencilrs must be byte-identical:
//                 a difference fails the run before anything is timed. ionic-published (Stencil 4) is compared to stencil5 and
//                 the differences (size, first differing offset) are reported, not failed.
//   2. render     ssr-bench/render.mjs in a fresh process per row: module load, first render (cold), warm median and p95
//                 ms/render after a warm-up, RSS.
//   3. express    ssr-bench/server.mjs per row (GET / -> renderToString -> res.send) under autocannon: req/s and p99 latency.
//
// Options:
//   --rows a,b            rows to run (all that exist)
//   --row id=<path>       use this hydrate app for a row (repeatable), e.g. --row stencilrs=/tmp/x/index.js
//   --renders N           timed renders per page and mode (20)
//   --warmup N            untimed renders before them (3)
//   --pages a,b           pages (all)        --modes dsd,scoped (both)
//   --no-express          skip step 3
//   --express-page <p>    page the Express app renders (list-50)
//   --connections N       autocannon connections (4)        --duration S  seconds per run (5)
//   --out <file>          JSON path (../../site/data/benchmarks-ionic-ssr.json)
//   --note "<text>"       free text stored in the JSON      --machine "<text>"  machine description
//   --preview             mark the JSON as a preview run (shared or noisy machine): the site labels it until a quiet run replaces it
// The benchmark is CPU-bound and single-threaded per row; on a shared machine the numbers are noisy (loadavg is recorded).
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import os from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import autocannon from 'autocannon';

import { MODES, PAGES } from './ssr-pages.mjs';
import { resolveRows } from './ssr-bench/rows.mjs';

const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const argv = process.argv.slice(2);
const opt = (name, def) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : def);
const flag = (name) => argv.includes(name);
if (flag('--help') || flag('-h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i) => i < 36 && l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(0);
}
const num = (name, def) => {
  const v = Number(opt(name, def));
  if (!(v >= 1)) throw new Error(`${name} must be a number of at least 1`);
  return v;
};
const RENDERS = num('--renders', 20);
const WARMUP = Number(opt('--warmup', 3));
const CONNECTIONS = num('--connections', 4);
const DURATION = num('--duration', 5);
const EXPRESS = !flag('--no-express');
const EXPRESS_PAGE = opt('--express-page', 'list-50');
const OUT = resolve(opt('--out', join(root, '../../site/data/benchmarks-ionic-ssr.json')));
const pickList = (name, all) => {
  const v = opt(name, null);
  return v ? v.split(',') : all;
};
const MODE_ALIAS = { dsd: 'declarative-shadow-dom' };
const pages = pickList('--pages', Object.keys(PAGES));
const modes = pickList('--modes', MODES).map((m) => MODE_ALIAS[m] ?? m);
for (const p of pages) if (!PAGES[p]) throw new Error(`unknown page ${p}`);
for (const m of modes) if (!MODES.includes(m)) throw new Error(`unknown mode ${m}`);
if (!PAGES[EXPRESS_PAGE]) throw new Error(`unknown --express-page ${EXPRESS_PAGE}`);
const overrides = {};
argv.forEach((a, i) => {
  if (a === '--row') {
    const [id, ...path] = argv[i + 1].split('=');
    overrides[id] = resolve(path.join('='));
  }
});

const log = (m) => console.error(m);

// --------------------------------------------------------------------------------------------------- children
// `pages`/`modes` reach the child through the environment: it renders what ssr-pages.mjs holds, filtered.
const childEnv = { ...process.env, SSR_BENCH_PAGES: pages.join(','), SSR_BENCH_MODES: modes.join(',') };
const run = (script, args) =>
  new Promise((ok, fail) => {
    const child = spawn(process.execPath, [join(root, 'ssr-bench', script), ...args], { env: childEnv, stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('error', fail);
    child.on('exit', (code) => (code === 0 ? ok(JSON.parse(out.trim().split('\n').pop())) : fail(new Error(`${script} exited ${code}`))));
  });

const freePort = () =>
  new Promise((ok) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

const express = async (file, mode) => {
  const port = await freePort();
  const server = spawn(process.execPath, [join(root, 'ssr-bench', 'server.mjs'), file, EXPRESS_PAGE, mode, String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise((ok, fail) => {
      server.stdout.on('data', (d) => String(d).includes('listening') && ok());
      server.on('exit', (c) => fail(new Error(`express server exited ${c}`)));
    });
    const url = `http://127.0.0.1:${port}/`;
    const bytes = (await (await fetch(url)).text()).length; // also warms the server
    const r = await autocannon({ url, connections: CONNECTIONS, duration: DURATION });
    return { reqPerSec: r.requests.average, p99Ms: r.latency.p99, p50Ms: r.latency.p50, requests: r.requests.total, errors: r.errors, non2xx: r.non2xx, timeouts: r.timeouts, htmlChars: bytes };
  } finally {
    server.removeAllListeners('exit');
    server.kill('SIGKILL');
  }
};

// --------------------------------------------------------------------------------------------------- main
const rows = resolveRows(opt('--rows', null)?.split(','), overrides);
const present = rows.filter((r) => r.file);
for (const r of rows) if (!r.file) log(`skip ${r.id}: no hydrate app at ${r.expected} (${r.missing})`);
if (!present.length) throw new Error('no row has a hydrate app: nothing to measure');

// 1. equality, before any timing
const tmp = mkdtempSync(join(os.tmpdir(), 'ionic-ssr-'));
const html = {};
const equality = { stencil5VsStencilrs: null, publishedVsStencil5: [] };
const diagnostics = {};
try {
  for (const r of present) {
    log(`render once: ${r.id}`);
    const { diagnostics: d } = await run('html.mjs', [r.file, join(tmp, r.id)]);
    if (Object.keys(d).length) diagnostics[r.id] = d;
    html[r.id] = (page, mode) => readFileSync(join(tmp, r.id, `${page}.${mode}.html`));
  }
  const firstDiff = (a, b) => {
    const n = Math.min(a.length, b.length);
    let i = 0;
    while (i < n && a[i] === b[i]) i++;
    return i === n && a.length === b.length ? -1 : i;
  };
  const failures = [];
  const compare = (ref, other) =>
    modes.flatMap((mode) =>
      pages.map((page) => {
        const a = html[ref](page, mode);
        const b = html[other](page, mode);
        const at = firstDiff(a, b);
        return { page, mode, identical: at < 0, bytes: { [ref]: a.length, [other]: b.length }, firstDifferenceAt: at < 0 ? null : at, context: at < 0 ? null : { [ref]: a.subarray(at, at + 60).toString(), [other]: b.subarray(at, at + 60).toString() } };
      })
    );
  if (html.stencil5 && html.stencilrs) {
    equality.stencil5VsStencilrs = compare('stencil5', 'stencilrs');
    for (const c of equality.stencil5VsStencilrs) if (!c.identical) failures.push(`stencil5 vs stencilrs, ${c.page} / ${c.mode}: first difference at byte ${c.firstDifferenceAt} (${c.bytes.stencil5} vs ${c.bytes.stencilrs} bytes)`);
  } else log('equality stencil5 vs stencilrs: not checked (needs both rows)');
  if (html['ionic-published'] && html.stencil5) equality.publishedVsStencil5 = compare('stencil5', 'ionic-published');
  if (failures.length) {
    console.error(`\nOUTPUT DIFFERS, nothing timed:\n  ${failures.join('\n  ')}`);
    mkdirSync(resolve(OUT, '..'), { recursive: true });
    writeFileSync(OUT.replace(/\.json$/, '.failed.json'), JSON.stringify({ equality, diagnostics }, null, 2) + '\n');
    process.exitCode = 1;
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
if (process.exitCode === 1) process.exit(1);
if (equality.stencil5VsStencilrs) log('equality: stencil5 and stencilrs are byte-identical on every page and mode');

// 2. render timing, one fresh process per row
const timing = {};
for (const r of present) {
  log(`timing: ${r.id} (${pages.length * modes.length} combinations, ${WARMUP} warm-up + ${RENDERS} timed each)`);
  timing[r.id] = await run('render.mjs', [r.file, String(WARMUP), String(RENDERS)]);
}

// 3. Express throughput
const throughput = {};
if (EXPRESS) {
  for (const r of present) {
    throughput[r.id] = {};
    for (const mode of modes) {
      log(`express + autocannon: ${r.id}, ${EXPRESS_PAGE}, ${mode} (${CONNECTIONS} connections, ${DURATION} s)`);
      throughput[r.id][mode] = await express(r.file, mode);
    }
  }
}

// ----------------------------------------------------------------------------------------------- output
const f = (n, d = 1) => (n == null ? '-' : n.toFixed(d));
const lines = [];
const table = (title, head, body) => {
  const all = [head, ...body];
  const w = head.map((_, i) => Math.max(...all.map((r) => String(r[i]).length)));
  lines.push('', title, ...all.map((r, k) => r.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('  ') + (k === 0 ? '\n' + w.map((x) => '-'.repeat(x)).join('  ') : '')));
};
table('Module load, first render, memory (cold, fresh process per row)', ['row', 'load ms', 'first render ms', 'RSS MB', 'peak RSS MB'], present.map((r) => [r.id, f(timing[r.id].loadMs), f(timing[r.id].firstRenderMs), f(timing[r.id].rssMb), f(timing[r.id].peakRssMb)]));
table(
  `Warm render, ms per render (median / p95 over ${RENDERS}, after ${WARMUP} warm-up)`,
  ['page / mode', ...present.map((r) => r.id), 'HTML KB'],
  modes.flatMap((mode) => pages.map((page) => [`${page} / ${mode === 'declarative-shadow-dom' ? 'dsd' : mode}`, ...present.map((r) => `${f(timing[r.id].results[`${page}.${mode}`].medianMs)} / ${f(timing[r.id].results[`${page}.${mode}`].p95Ms)}`), present.map((r) => f(timing[r.id].results[`${page}.${mode}`].htmlBytes / 1024, 0)).join(' / ')]))
);
if (EXPRESS) {
  table(
    `Express + autocannon (${EXPRESS_PAGE}, ${CONNECTIONS} connections, ${DURATION} s): req/s, p99 ms`,
    ['mode', ...present.map((r) => r.id)],
    modes.map((mode) => [mode === 'declarative-shadow-dom' ? 'dsd' : mode, ...present.map((r) => `${f(throughput[r.id][mode].reqPerSec)} req/s, p99 ${f(throughput[r.id][mode].p99Ms, 0)}`)])
  );
  for (const r of present) for (const mode of modes) { const t = throughput[r.id][mode]; if (t.errors || t.non2xx || t.timeouts) lines.push(`WARNING ${r.id} ${mode}: ${t.errors} errors, ${t.non2xx} non-2xx, ${t.timeouts} timeouts`); }
}
if (equality.publishedVsStencil5.length) {
  table('ionic-published vs stencil5 (reported, not failed)', ['page / mode', 'published B', 'stencil5 B', 'first difference at'], equality.publishedVsStencil5.map((c) => [`${c.page} / ${c.mode === 'declarative-shadow-dom' ? 'dsd' : c.mode}`, c.bytes['ionic-published'], c.bytes.stencil5, c.identical ? 'identical' : c.firstDifferenceAt]));
}
if (Object.keys(diagnostics).length) lines.push('', `render diagnostics (errors): ${JSON.stringify(diagnostics)}`);
for (const r of rows) if (!r.file) lines.push(`skipped ${r.id}: ${r.missing}`);
console.log(lines.join('\n'));

const git = (...a) => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim(); } catch { return null; } };
const pkgVersion = (p) => { try { return JSON.parse(readFileSync(join(root, 'node_modules', p, 'package.json'), 'utf8')).version; } catch { return null; } };
const cpus = os.cpus();
const doc = {
  schema: 1,
  preview: flag('--preview'),
  note: opt('--note', null),
  finishedAt: new Date().toISOString(),
  machine: {
    description: opt('--machine', null),
    cpu: cpus[0].model.replace(/\s+/g, ' ').trim(),
    logicalCores: cpus.length,
    ramGiB: Math.round(os.totalmem() / 2 ** 30),
    os: `${os.type()} ${os.release()}`,
    platform: `${process.platform}-${process.arch}`,
    node: process.versions.node,
    loadavgAtStart: os.loadavg().map((x) => Number(x.toFixed(2))),
  },
  versions: { ionicCore: pkgVersion('@ionic/core'), stencil5: pkgVersion('@stencil/core'), express: pkgVersion('express'), autocannon: pkgVersion('autocannon'), git: git('rev-parse', 'HEAD') },
  config: { pages, modes, renders: RENDERS, warmup: WARMUP, renderOptions: { prettyHtml: false, serializeShadowRoot: '<mode>', buildId: 'ionic-ssr-bench' }, express: EXPRESS ? { page: EXPRESS_PAGE, connections: CONNECTIONS, durationSeconds: DURATION } : null },
  rows: Object.fromEntries(rows.map((r) => [r.id, { label: r.label, hydrateApp: r.file && relative(root, r.file).replace(/\\/g, '/'), skipped: r.file ? undefined : r.missing }])),
  equality,
  diagnostics,
  timing,
  throughput,
};
mkdirSync(resolve(OUT, '..'), { recursive: true });
writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
log(`\nwrote ${OUT}`);
