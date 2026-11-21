// One-command benchmark: the same Ionic source compiled three ways (issue #65).
//
//   npm run bench                       # N=10 runs of everything, writes ../../site/data/benchmarks-ionic.json
//   npm run bench -- --runs 3 --preview # a quicker, labelled preview
//
// Rows (examples/ionic/README.md says how each is built):
//   stencil4   Ionic stock: `stencil build` on Stencil 4.45 (the reference)
//   stencil    `stencil build` of the Stencil v5 port (migrated/)
//   stencilrs  `vite build` of the same migrated/ source with the stencilrs plugin
//
// Metrics (each: every raw sample, then median / min / max):
//   coldBuild       fresh process, Stencil's .stencil cache, Vite's cache and stencilrs's Sass disk cache removed first. The Stencil rows
//                   include the separate Sass step Ionic's global css/ needs (stencilrs does it in the build).
//   warmBuild       the same command again with every cache kept; one extra build first, discarded
//   devStart        dev server started (Stencil: `build --dev --watch --serve`; stencilrs: `vite`) until a page
//                   that uses ion-button has its compiled component and everything that imports
//   editRebuild     one line of button.tsx edited while watching (Stencil: the same dev process; stencilrs:
//                   `vite build --watch`), until the rebuild has finished; plus the Vite dev server's
//                   re-transform of the edited module
//   transpile       every component file (95) through the compiler alone: stencilrs transpile vs Stencil's
//                   transpileSync (4 and 5), fresh process per run; cold pass and warm pass apart
//   peakRss         the most memory the whole process tree held (sampled every 250 ms) in a cold build
//   output          size of what a build writes, raw and gzip (one build; deterministic)
//
// Options:
//   --runs N            runs per metric (10). Warm builds do one extra, discarded.
//   --rows a,b          stencil4, stencil, stencilrs (all)
//   --steps a,b         cold, warm, dev, edit, transpile (all); `dev` and `edit` run together
//   --transpile-passes  passes per transpile process (5): the first is cold, the rest warm
//   --out <file>        default ../../site/data/benchmarks-ionic.json
//   --preview           mark the JSON as a preview run (shared or noisy machine)
//   --note "<text>"     free text stored in the JSON (what else was running, ...)
//   --machine "<text>"  machine description in place of the one read from the OS
//
// Robustness: every step has a timeout; every child runs in its own process group and is killed with its
// whole tree when it ends, on a timeout, on Ctrl-C and on exit (dev servers included); ports are picked free;
// the edited source file is restored on every exit path. A failed sample is recorded in `errors` and the run goes on.
import { execFileSync, execFile, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import os from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { IONIC_TAG } from './scripts/paths.mjs';

const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const repo = resolve(root, '../..');
const WIN = process.platform === 'win32';

// ---------------------------------------------------------------------------------------------- options
const argv = process.argv.slice(2);
const opt = (name, def) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : def);
const flag = (name) => argv.includes(name);
if (flag('--help') || flag('-h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l, i) => i < 46 && l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
  process.exit(0);
}
const RUNS = Number(opt('--runs', 10));
const PASSES = Number(opt('--transpile-passes', 5));
if (!(RUNS >= 1) || !(PASSES >= 2)) throw new Error('--runs must be at least 1 and --transpile-passes at least 2 (the first is the cold one)');
const OUT = resolve(opt('--out', join(repo, 'site/data/benchmarks-ionic.json')));
const STEPS = new Set(opt('--steps', 'cold,warm,dev,edit,transpile').split(','));
if (STEPS.has('dev') || STEPS.has('edit')) (STEPS.add('dev'), STEPS.add('edit'));
const TIMEOUT = { build: 480_000, devReady: 240_000, edit: 180_000, transpile: 180_000, quiet: 1500 };

const BENCH = join(root, '.bench');
const ROWS = {
  stencil4: {
    label: 'Ionic stock: stencil build, Stencil 4',
    cwd: join(root, 'stencil4/stock'),
    tools: join(root, 'stencil4/node_modules'),
    cli: '@stencil/cli/bin/stencil', // v4: the CLI is in @stencil/core
    caches: [join(root, 'stencil4/stock/.stencil')],
    tsx: join(root, 'stencil4/stock/src/components/button/button.tsx'),
    loader: '/dist/ionic/ionic.esm.js',
  },
  stencil: {
    label: 'StencilJS v5: stencil build',
    cwd: join(root, 'migrated'),
    tools: join(root, 'node_modules'),
    cli: '@stencil/cli/bin/stencil.mjs',
    caches: [join(root, 'migrated/.stencil')],
    tsx: join(root, 'migrated/src/components/button/button.tsx'),
    loader: '/dist/ionic/ionic.js',
  },
  stencilrs: {
    label: 'stencilrs: vite build',
    cwd: root,
    tools: join(root, 'node_modules'),
    // .cache/stencilrs is vite-css.js's Sass disk cache (nearest node_modules to cwd); cold rows must not reuse it
    caches: [join(root, 'migrated/node_modules/.vite'), join(root, 'node_modules/.vite'), join(root, 'node_modules/.cache/stencilrs'), join(root, 'migrated/node_modules/.cache/stencilrs')],
    tsx: join(root, 'migrated/src/components/button/button.tsx'),
  },
};
const ROW_IDS = opt('--rows', 'stencil4,stencil,stencilrs').split(',');
for (const r of ROW_IDS) if (!ROWS[r]) throw new Error(`unknown row ${r}`);
const isStencil = (r) => r !== 'stencilrs';

// -------------------------------------------------------------------------------------------- utilities
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const summary = (xs) => (xs.length ? { n: xs.length, median: median(xs), min: Math.min(...xs), max: Math.max(...xs) } : { n: 0, median: null, min: null, max: null });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const errors = [];

const freePort = () =>
  new Promise((ok, fail) => {
    const s = createServer();
    s.once('error', fail);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });

// Child processes: own process group (POSIX) so the whole tree dies together.
const live = new Set();
const killTree = (child) => {
  try {
    if (WIN) execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGKILL');
  } catch {
    /* already gone */
  }
};
const restorers = new Set();
const cleanup = () => {
  for (const c of live) killTree(c);
  live.clear();
  for (const r of restorers) r();
  restorers.clear();
};
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => (cleanup(), process.exit(130)));
process.on('uncaughtException', (e) => (console.error(e), cleanup(), process.exit(1)));

// Windows has no ps: one long-lived PowerShell answers each request line with "pid ppid workingSetKiB" lines
// for every process, then "END". Requests are queued, so concurrent samplers share it.
let winPs = null;
const winQueue = [];
const winProcs = () =>
  new Promise((ok) => {
    if (!winPs) {
      const script = '$ErrorActionPreference="SilentlyContinue"; while ($null -ne ($l = [Console]::In.ReadLine())) { Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId) $([int64]($_.WorkingSetSize / 1024))" }; "END" }';
      winPs = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
      winPs.unref();
      winPs.stdout.unref?.();
      winPs.stdin.unref?.();
      let buf = '';
      winPs.stdout.on('data', (c) => {
        buf += c.toString();
        let i;
        while ((i = buf.indexOf('END')) !== -1) {
          const out = buf.slice(0, i);
          buf = buf.slice(i + 3).replace(/^\s+/, '');
          winQueue.shift()?.(out);
        }
      });
      winPs.on('exit', () => { winPs = null; for (const q of winQueue.splice(0)) q(null); });
      process.on('exit', () => { try { winPs?.kill(); } catch {} });
    }
    if (winQueue.length > 2) return ok(null); // the sampler is behind; skip this tick
    winQueue.push(ok);
    winPs.stdin.write('x\n');
  });

// Peak RSS of a process tree: sum over descendants of `pid`, sampled with ps (Windows: working set via CIM).
const sampleRss = (pid) =>
  new Promise((ok) => {
    const parse = (out) => {
      if (out == null) return ok(null);
      const kids = new Map();
      const rss = new Map();
      for (const line of out.trim().split('\n')) {
        const [p, pp, r] = line.trim().split(/\s+/).map(Number);
        rss.set(p, r);
        (kids.get(pp) ?? kids.set(pp, []).get(pp)).push(p);
      }
      let total = 0;
      const stack = [pid];
      const seen = new Set(); // Windows reuses pids, so a stale ppid can make a cycle
      while (stack.length) {
        const p = stack.pop();
        if (seen.has(p)) continue;
        seen.add(p);
        total += rss.get(p) ?? 0;
        stack.push(...(kids.get(p) ?? []));
      }
      ok(total);
    };
    if (WIN) return winProcs().then(parse);
    execFile('ps', ['-A', '-o', 'pid=,ppid=,rss='], { maxBuffer: 1 << 24 }, (err, out) => parse(err ? null : out));
  });

/** A running child with its interesting log lines (time-stamped), its output tail and its peak RSS (KiB). */
class Proc {
  constructor(cmd, args, { cwd, env, interesting = /./ }) {
    this.t0 = performance.now();
    this.marks = []; // { t, line } for lines matching `interesting`
    this.tail = '';
    this.peakRssKiB = 0;
    this.exited = null;
    this.child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: '0', CI: '1', ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: !WIN });
    live.add(this.child);
    let partial = '';
    const onData = (chunk) => {
      const text = partial + chunk.toString();
      const lines = text.split('\n');
      partial = lines.pop();
      const t = performance.now();
      for (const line of lines) if (interesting.test(line)) this.marks.push({ t, line: line.replace(/\x1b\[[0-9;]*m/g, '') });
      this.tail = (this.tail + chunk.toString()).slice(-4000);
    };
    this.child.stdout.on('data', onData);
    this.child.stderr.on('data', onData);
    this.done = new Promise((ok) => {
      this.child.on('exit', (code, signal) => {
        this.exited = { code, signal, ms: performance.now() - this.t0 };
        clearInterval(this.timer);
        ok(this.exited);
      });
      this.child.on('error', (e) => ((this.exited = { code: -1, signal: String(e), ms: 0 }), ok(this.exited)));
    });
    this.timer = setInterval(async () => {
      const r = await sampleRss(this.child.pid);
      if (r) this.peakRssKiB = Math.max(this.peakRssKiB, r);
    }, 250);
  }
  /** Resolves with the time (ms since spawn) at which the Nth mark matching `re` appeared, or throws on timeout/exit. */
  async waitMark(re, { after = 0, timeoutMs }) {
    const deadline = performance.now() + timeoutMs;
    for (;;) {
      const hit = this.marks.find((m) => m.t >= after && re.test(m.line));
      if (hit) return hit;
      if (this.exited) throw new Error(`process exited (${this.exited.code ?? this.exited.signal}) before ${re}:\n${this.tail.slice(-1200)}`);
      if (performance.now() > deadline) throw new Error(`timeout after ${timeoutMs} ms waiting for ${re}\n${this.tail.slice(-1200)}`);
      await sleep(20);
    }
  }
  kill() {
    clearInterval(this.timer);
    killTree(this.child);
    live.delete(this.child);
  }
}

/** Run to completion with a timeout; always leaves nothing behind. */
const exec = async (cmd, args, { cwd, env, timeoutMs = TIMEOUT.build }) => {
  const p = new Proc(cmd, args, { cwd, env, interesting: /^$/ });
  const timer = setTimeout(() => p.kill(), timeoutMs);
  const exit = await p.done;
  clearTimeout(timer);
  p.kill(); // stragglers (worker processes) of the group
  const timedOut = exit.signal === 'SIGKILL';
  if (exit.code !== 0) throw new Error(`${cmd} ${args.join(' ')} ${timedOut ? `timed out after ${timeoutMs} ms` : `exited ${exit.code}`}\n${p.tail.slice(-1500)}`);
  return { ms: exit.ms, peakRssKiB: p.peakRssKiB };
};

const get = async (url, timeoutMs = 3000) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
};

/** Poll until `url` answers 200; returns { ms since t0, body }. */
const pollUntil = async (url, t0, timeoutMs, alive, accept = () => true) => {
  const deadline = performance.now() + timeoutMs;
  for (;;) {
    const body = await get(url);
    if (body !== null && accept(body)) return { ms: performance.now() - t0, body };
    if (alive && !alive()) throw new Error(`server exited before ${url} answered`);
    if (performance.now() > deadline) throw new Error(`timeout after ${timeoutMs} ms waiting for ${url}`);
    await sleep(25);
  }
};

/** Everything a page using the module would also fetch: the module's import closure on the same origin. */
const crawl = async (origin, entry, bodyOfEntry) => {
  const seen = new Set([entry]);
  const queue = [{ url: entry, body: bodyOfEntry }];
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bimport\s+)["']([^"']+)["']/g;
  while (queue.length) {
    const batch = queue.splice(0, 8);
    await Promise.all(
      batch.map(async (item) => {
        const body = item.body ?? (await get(origin + item.url, 20000));
        // an entry must answer; a string inside a dependency that only looks like an import may not
        if (body == null) {
          if (item.url === entry) throw new Error(`crawl: ${item.url} did not answer 200`);
          seen.delete(item.url);
          return;
        }
        if (!/\.(m?js|tsx?|jsx)(\?|$)/.test(item.url) && !/\.(scss|css)/.test(item.url)) return;
        for (const m of body.matchAll(re)) {
          const spec = m[1];
          if (!spec.startsWith('/') && !spec.startsWith('./') && !spec.startsWith('../')) continue;
          const next = new URL(spec, origin + item.url);
          const key = next.pathname + next.search;
          if (!seen.has(key)) (seen.add(key), queue.push({ url: key }));
        }
      }),
    );
  }
  return seen.size;
};

// ------------------------------------------------------------------------------------------------ results
const results = {}; // metric -> { ...meta, samples: { row: [] } }
const metric = (id, meta) => (results[id] ??= { ...meta, samples: {} });
const sample = (id, row, value) => (results[id].samples[row] ??= []).push(value);
const fail = (id, row, run, e) => {
  errors.push({ metric: id, row, run, message: String(e?.message ?? e).slice(0, 1500) });
  log(`  FAILED ${id} ${row} run ${run}: ${String(e?.message ?? e).split('\n')[0]}`);
};
const output = {};

// -------------------------------------------------------------------------------------- build commands
const outDir = (row) => join(BENCH, 'out', row);
const nodeBin = (row, rel) => realpathSync(join(ROWS[row].tools, rel));
const cliPath = (row) => nodeBin(row, row === 'stencil4' ? '@stencil/core/bin/stencil' : ROWS[row].cli);
const viteJs = () => nodeBin('stencilrs', 'vite/bin/vite.js');
const buildEnv = (row) => ({ IONIC_OUT_DIR: outDir(row), IONIC_STENCIL_CACHE: '1' });
const clearCaches = (row) => ROWS[row].caches.forEach((c) => rmSync(c, { recursive: true, force: true }));

/** One build, as the README's `npm run build:*`, minus the console filtering. Returns ms, split and RSS. */
const buildOnce = async (row) => {
  rmSync(join(outDir(row), 'css'), { recursive: true, force: true });
  if (isStencil(row)) {
    const main = await exec(process.execPath, [cliPath(row), 'build'], { cwd: ROWS[row].cwd, env: buildEnv(row) });
    // Ionic's global stylesheets (css/core.css, ...) are a separate Sass run in upstream (`npm run css.sass`).
    const sass = nodeBin(row, 'sass/sass.js');
    const css = await exec(process.execPath, [sass, '--quiet', '--no-source-map', '--style', 'compressed', `${join(ROWS[row].cwd, 'src/css')}:${join(outDir(row), 'css')}`], { cwd: ROWS[row].cwd, env: {} });
    if (!existsSync(join(outDir(row), 'docs.json'))) throw new Error(`${row}: build wrote no docs.json`);
    return { totalMs: main.ms + css.ms, mainMs: main.ms, cssMs: css.ms, peakRssKiB: Math.max(main.peakRssKiB, css.peakRssKiB) };
  }
  const main = await exec(process.execPath, [viteJs(), 'build', '--config', join(root, 'vite.config.ts')], { cwd: root, env: buildEnv(row) });
  if (!existsSync(join(outDir(row), 'ionic.js'))) throw new Error('stencilrs: build wrote no ionic.js');
  return { totalMs: main.ms, mainMs: main.ms, cssMs: 0, peakRssKiB: main.peakRssKiB };
};

const dirStats = (dir) => {
  const groups = { js: [0, 0], css: [0, 0], other: [0, 0] };
  let files = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else {
        const buf = readFileSync(p);
        const g = /\.(m?js|cjs)$/.test(name) ? 'js' : name.endsWith('.css') ? 'css' : 'other';
        const textual = /\.(m?js|cjs|css|json|ts|map|html|txt)$/.test(name);
        groups[g][0] += buf.length;
        groups[g][1] += textual ? gzipSync(buf, { level: 9 }).length : buf.length;
        files++;
      }
    }
  };
  walk(dir);
  const all = Object.values(groups).reduce((a, [r, z]) => [a[0] + r, a[1] + z], [0, 0]);
  return { files, rawBytes: all[0], gzipBytes: all[1], ...Object.fromEntries(Object.entries(groups).map(([k, [r, z]]) => [k, { rawBytes: r, gzipBytes: z }])) };
};

// ---------------------------------------------------------------------------------------------- editing
let editSeq = 0;
/** Insert one statement into button.tsx's render(); returns { marker, restore }. */
const editButton = (row) => {
  const file = ROWS[row].tsx;
  const original = readFileSync(file, 'utf8');
  const marker = `ionic-bench-${process.pid}-${++editSeq}`;
  const edited = original.replace(/^(  render\(\) \{\n)/m, `$1    console.debug('${marker}');\n`);
  if (edited === original) throw new Error(`${file}: render() anchor not found`);
  const restore = () => {
    writeFileSync(file, original);
    restorers.delete(restore);
  };
  restorers.add(restore);
  return { marker, write: () => writeFileSync(file, edited), restore };
};

// ----------------------------------------------------------------------------------------------- steps
const stepCold = async () => {
  metric('coldBuild', { title: 'Cold build', unit: 'ms', what: 'fresh process, build caches removed first; the Stencil rows include the Sass step for css/' });
  metric('coldBuildCssStep', { title: 'Cold build: of which the separate Sass step for css/', unit: 'ms', what: 'stencil build leaves Ionic\'s global css/ to a second command; stencilrs builds it in the same run (not counted here)' });
  metric('peakRss', { title: 'Peak memory, cold build', unit: 'MiB', what: 'sum of the RSS of the whole process tree (workers included), peak of samples every 250 ms' });
  for (let i = 1; i <= RUNS; i++) {
    log(`cold build, run ${i}/${RUNS}`);
    for (const row of ROW_IDS) {
      try {
        clearCaches(row);
        rmSync(outDir(row), { recursive: true, force: true });
        const r = await buildOnce(row);
        sample('coldBuild', row, Math.round(r.totalMs));
        if (isStencil(row)) sample('coldBuildCssStep', row, Math.round(r.cssMs));
        if (r.peakRssKiB) sample('peakRss', row, Math.round(r.peakRssKiB / 1024));
        log(`  ${row.padEnd(9)} ${(r.totalMs / 1000).toFixed(1)} s${r.peakRssKiB ? `, ${Math.round(r.peakRssKiB / 1024)} MiB` : ''}`);
        if (i === 1) output[row] = dirStats(outDir(row));
      } catch (e) {
        fail('coldBuild', row, i, e);
      }
    }
  }
};

const stepWarm = async () => {
  metric('warmBuild', { title: 'Warm rebuild', unit: 'ms', what: 'the same command again, caches kept; the first, discarded build primes them (Stencil\'s .stencil, Vite\'s cache)' });
  log('warm build: priming (discarded)');
  for (const row of ROW_IDS) {
    try {
      await buildOnce(row);
    } catch (e) {
      fail('warmBuild', row, 0, e);
    }
  }
  for (let i = 1; i <= RUNS; i++) {
    log(`warm build, run ${i}/${RUNS}`);
    for (const row of ROW_IDS) {
      try {
        const r = await buildOnce(row);
        sample('warmBuild', row, Math.round(r.totalMs));
        log(`  ${row.padEnd(9)} ${(r.totalMs / 1000).toFixed(1)} s`);
      } catch (e) {
        fail('warmBuild', row, i, e);
      }
    }
  }
};

const stepDevAndEdit = async () => {
  metric('devStart', { title: 'Dev server: start to ion-button', unit: 'ms', what: 'fresh process, caches removed, until the compiled ion-button module answers 200' });
  metric('devStartClosure', { title: 'Dev server: start to everything ion-button imports', unit: 'ms', what: 'the same, plus every module the page would then fetch (the import closure of ion-button)' });
  metric('devModules', { title: 'Modules fetched for ion-button', unit: 'count', what: 'size of that closure' });
  metric('devPeakRss', { title: 'Peak memory, dev server', unit: 'MiB', what: 'from start through the edit' });
  metric('editRebuild', { title: 'Edit one component, rebuild', unit: 'ms', what: 'one line added to button.tsx while watching (Stencil: the dev server process; stencilrs: vite build --watch), until the rebuild has finished' });
  metric('editRebuildReported', { title: 'Edit one component: the tool\'s own figure', unit: 'ms', what: 'the duration Stencil / Vite print for that rebuild' });
  metric('editDevTransform', { title: 'Edit one component: Vite dev re-transform', unit: 'ms', what: 'stencilrs row only: edit, then a request for the module until it carries the edit' });
  for (let i = 1; i <= RUNS; i++) {
    log(`dev server + edit, run ${i}/${RUNS}`);
    for (const row of ROW_IDS) {
      try {
        if (isStencil(row)) await devStencil(row, i);
        else await devVite(row, i);
      } catch (e) {
        fail('devStart', row, i, e);
      }
    }
  }
};

const devStencil = async (row, i) => {
  clearCaches(row);
  rmSync(outDir(row), { recursive: true, force: true });
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const edit = editButton(row);
  const p = new Proc(process.execPath, [cliPath(row), 'build', '--dev', '--watch', '--serve', '--no-open', '--address', '127.0.0.1', '--port', String(port)], {
    cwd: ROWS[row].cwd,
    env: buildEnv(row),
    interesting: /build (finished|failed)|\[ ERROR/,
  });
  try {
    const entry = '/dist/ionic/ion-button.entry.js';
    const first = await pollUntil(origin + entry, p.t0, TIMEOUT.devReady, () => !p.exited, (b) => b.includes('ion-button'));
    const modules = await crawl(origin, entry, first.body);
    const closureMs = performance.now() - p.t0;
    // the loader a page would start from
    await crawl(origin, ROWS[row].loader, null).catch(() => {});
    sample('devStart', row, Math.round(first.ms));
    sample('devStartClosure', row, Math.round(closureMs));
    sample('devModules', row, modules);
    // a rebuild that is still finishing (Stencil rewrites components.d.ts) must be over before the edit
    await p.waitMark(/build (finished|failed)/, { timeoutMs: TIMEOUT.devReady });
    await sleep(TIMEOUT.quiet);
    const before = performance.now();
    edit.write();
    const mark = await p.waitMark(/build (finished|failed)/, { after: before, timeoutMs: TIMEOUT.edit });
    if (/failed/.test(mark.line)) throw new Error(`rebuild after the edit failed: ${mark.line}`);
    sample('editRebuild', row, Math.round(mark.t - before));
    const reported = /in ([\d.]+) (ms|s)\b/.exec(mark.line);
    if (reported) sample('editRebuildReported', row, Math.round(Number(reported[1]) * (reported[2] === 's' ? 1000 : 1)));
    log(`  ${row.padEnd(9)} ion-button after ${(first.ms / 1000).toFixed(2)} s (${modules} modules by ${(closureMs / 1000).toFixed(2)} s), edit rebuild ${((mark.t - before) / 1000).toFixed(2)} s`);
    const rss = await sampleRss(p.child.pid);
    if (Math.max(p.peakRssKiB, rss ?? 0)) sample('devPeakRss', row, Math.round(Math.max(p.peakRssKiB, rss ?? 0) / 1024));
  } finally {
    p.kill();
    edit.restore();
    await sleep(300);
  }
};

const devVite = async (row, i) => {
  // 1. the dev server: cold start to ion-button's compiled module
  clearCaches(row);
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  let edit = editButton(row);
  const mod = '/src/components/button/button.tsx';
  let p = new Proc(process.execPath, [viteJs(), '--config', join(root, 'vite.config.ts'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, env: {}, interesting: /ready|error/i });
  try {
    const first = await pollUntil(origin + mod, p.t0, TIMEOUT.devReady, () => !p.exited, (b) => b.includes('ion-button'));
    // a page also runs Ionic's global script first
    const modules = (await crawl(origin, mod, first.body)) + (await crawl(origin, '/src/global/ionic-global.ts', null));
    const closureMs = performance.now() - p.t0;
    sample('devStart', row, Math.round(first.ms));
    sample('devStartClosure', row, Math.round(closureMs));
    sample('devModules', row, modules);
    await sleep(TIMEOUT.quiet);
    const before = performance.now();
    edit.write();
    const re = await pollUntil(origin + mod, before, TIMEOUT.edit, () => !p.exited, (b) => b.includes(edit.marker));
    sample('editDevTransform', row, Math.round(re.ms));
    log(`  ${row.padEnd(9)} ion-button after ${(first.ms / 1000).toFixed(2)} s (${modules} modules by ${(closureMs / 1000).toFixed(2)} s), dev re-transform ${re.ms.toFixed(0)} ms`);
    const rss = await sampleRss(p.child.pid);
    if (Math.max(p.peakRssKiB, rss ?? 0)) sample('devPeakRss', row, Math.round(Math.max(p.peakRssKiB, rss ?? 0) / 1024));
  } finally {
    p.kill();
    edit.restore();
    await sleep(300);
  }
  // 2. the watch build, the comparison to Stencil's watch mode
  rmSync(outDir(row), { recursive: true, force: true });
  edit = editButton(row);
  p = new Proc(process.execPath, [viteJs(), 'build', '--watch', '--config', join(root, 'vite.config.ts')], { cwd: root, env: buildEnv(row), interesting: /built in|error/i });
  try {
    await p.waitMark(/built in/, { timeoutMs: TIMEOUT.build });
    await sleep(TIMEOUT.quiet);
    const before = performance.now();
    edit.write();
    const mark = await p.waitMark(/built in|error/i, { after: before, timeoutMs: TIMEOUT.edit });
    if (!/built in/.test(mark.line)) throw new Error(`rebuild after the edit failed: ${mark.line}`);
    sample('editRebuild', row, Math.round(mark.t - before));
    const reported = /built in ([\d.]+)\s*(ms|s)\b/.exec(mark.line);
    if (reported) sample('editRebuildReported', row, Math.round(Number(reported[1]) * (reported[2] === 's' ? 1000 : 1)));
    log(`  ${row.padEnd(9)} watch rebuild ${((mark.t - before) / 1000).toFixed(2)} s`);
  } finally {
    p.kill();
    edit.restore();
    await sleep(300);
  }
};

const stepTranspile = async () => {
  metric('transpileCold', { title: 'Per-file transform of all components: cold pass', unit: 'ms', what: 'first pass over every @Component file in a fresh process (stencilrs transpile, Stencil transpileSync), source maps on' });
  metric('transpileWarm', { title: 'Per-file transform of all components: warm pass', unit: 'ms', what: `median of the passes after the first (${PASSES - 1} per process)` });
  const passes = {};
  for (let i = 1; i <= RUNS; i++) {
    log(`transpile, run ${i}/${RUNS}`);
    for (const row of ROW_IDS) {
      try {
        const r = await run1(process.execPath, [join(root, 'bench/transpile-worker.mjs'), row, String(PASSES)]);
        const w = JSON.parse(r.split('\n').filter(Boolean).pop());
        sample('transpileCold', row, Math.round(w.passesMs[0]));
        sample('transpileWarm', row, Math.round(median(w.passesMs.slice(1))));
        passes[row] = { files: w.files, kib: w.kib, compilerVersion: w.version, errorDiagnostics: w.errors, outKib: w.outKib };
        log(`  ${row.padEnd(9)} cold ${w.passesMs[0].toFixed(0)} ms, warm ${median(w.passesMs.slice(1)).toFixed(0)} ms`);
      } catch (e) {
        fail('transpileCold', row, i, e);
      }
    }
  }
  results.transpileCold.corpus = passes;
};

const run1 = (cmd, args) =>
  new Promise((ok, bad) => {
    const p = new Proc(cmd, args, { cwd: root, env: {}, interesting: /^$/ });
    let out = '';
    p.child.stdout.on('data', (c) => (out += c));
    const timer = setTimeout(() => p.kill(), TIMEOUT.transpile);
    p.done.then((e) => {
      clearTimeout(timer);
      p.kill();
      e.code === 0 ? ok(out) : bad(new Error(`${args.join(' ')} exited ${e.code ?? e.signal}\n${p.tail}`));
    });
  });

// ------------------------------------------------------------------------------------------ preparation
const prepare = async () => {
  // only npm needs a shell on Windows (npm.cmd); with shell: true an unquoted node path under C:Program Files breaks
  const sh = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: WIN && cmd === 'npm' });
  if (!existsSync(join(root, 'node_modules/.bin'))) sh('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  if (!existsSync(join(root, 'upstream/core/src'))) sh(process.execPath, ['scripts/fetch.mjs']);
  const migratedConfig = join(root, 'migrated/stencil.config.ts');
  if (!existsSync(migratedConfig) || !readFileSync(migratedConfig, 'utf8').includes('IONIC_STENCIL_CACHE') || !readFileSync(migratedConfig, 'utf8').includes('devServer')) sh(process.execPath, ['scripts/migrate.mjs']);
  if (ROW_IDS.includes('stencil4')) {
    const stockConfig = join(root, 'stencil4/stock/stencil.config.ts');
    if (!existsSync(stockConfig) || !readFileSync(stockConfig, 'utf8').includes('devServer')) {
      log('preparing the Stencil 4 reference (stencil4/stock, its toolchain): npm run build:stencil4 once');
      sh(process.execPath, ['scripts/build.mjs', 'stencil4']);
    }
  }
  mkdirSync(BENCH, { recursive: true });
  // components.d.ts is generated by the first build; a missing one makes a Stencil dev build rebuild (and fail) at startup
  for (const row of ROW_IDS.filter(isStencil)) {
    if (!existsSync(join(ROWS[row].cwd, 'src/components.d.ts'))) {
      log(`generating ${row}'s components.d.ts with one build`);
      await buildOnce(row);
    }
  }
};

// -------------------------------------------------------------------------------------------- metadata
const git = (...a) => {
  try {
    return execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};
const pkgVersion = (p) => {
  try {
    return readJson(join(root, p, 'package.json')).version;
  } catch {
    return null;
  }
};
const meta = () => {
  const cpus = os.cpus();
  const load = os.loadavg();
  return {
    machine: {
      description: opt('--machine', null),
      cpu: cpus[0].model.replace(/\s+/g, ' ').trim(),
      logicalCores: cpus.length,
      ramGiB: Math.round(os.totalmem() / 2 ** 30),
      os: WIN ? os.version() : `${os.type()} ${os.release()}`,
      platform: `${process.platform}-${process.arch}`,
      node: process.versions.node,
      loadavgAtStart: load.map((x) => Number(x.toFixed(2))),
    },
    versions: {
      stencil4: pkgVersion('stencil4/node_modules/@stencil/core'),
      stencil5: pkgVersion('node_modules/@stencil/core'),
      typescriptInStencil4: '5.8.3 (bundled)',
      typescript: pkgVersion('node_modules/typescript'),
      vite: pkgVersion('node_modules/vite'),
      sass: pkgVersion('node_modules/sass'),
      stencilrs: { package: pkgVersion('node_modules/@popcorn245/stencilrs'), git: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain', '--', ':!site/data/benchmarks-ionic.json') !== '' },
      ionic: { tag: IONIC_TAG, commit: (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: join(root, 'upstream'), encoding: 'utf8' }).trim(); } catch { return null; } })() },
    },
  };
};

// ----------------------------------------------------------------------------------------------- output
// Indented JSON where every array of numbers and every `summary` object stays on one line.
const flat = (v) => (Array.isArray(v) ? `[${v.map(flat).join(', ')}]` : v && typeof v === 'object' ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${flat(x)}`).join(', ')} }` : JSON.stringify(v));
const fmt = (v, depth = 0) => {
  if (Array.isArray(v) && v.every((x) => typeof x !== 'object' || x === null)) return flat(v);
  if (v && typeof v === 'object' && Object.values(v).every((x) => typeof x !== 'object' || x === null) && Object.keys(v).length <= 6 && depth >= 4) return flat(v);
  const pad = '  '.repeat(depth + 1);
  if (Array.isArray(v)) return `[\n${v.map((x) => pad + fmt(x, depth + 1)).join(',\n')}\n${'  '.repeat(depth)}]`;
  if (v && typeof v === 'object') return `{\n${Object.entries(v).map(([k, x]) => `${pad}${JSON.stringify(k)}: ${fmt(x, depth + 1)}`).join(',\n')}\n${'  '.repeat(depth)}}`;
  return JSON.stringify(v);
};

const startedAt = new Date();
const write = (complete) => {
  const metrics = {};
  for (const [id, m] of Object.entries(results)) {
    const { samples, ...rest } = m;
    metrics[id] = { ...rest, rows: Object.fromEntries(ROW_IDS.filter((r) => samples[r]).map((r) => [r, { ...summary(samples[r]), samples: samples[r] }])) };
  }
  const doc = {
    schema: 1,
    complete,
    preview: flag('--preview'),
    note: opt('--note', null),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    runs: RUNS,
    steps: [...STEPS],
    ...metaInfo,
    rows: Object.fromEntries(ROW_IDS.map((r) => [r, ROWS[r].label])),
    metrics,
    output,
    errors,
  };
  mkdirSync(resolve(OUT, '..'), { recursive: true });
  writeFileSync(OUT, fmt(doc) + '\n');
};

// ---------------------------------------------------------------------------------------------- main
log(`ionic bench: ${RUNS} runs, rows ${ROW_IDS.join(', ')}, steps ${[...STEPS].join(', ')}`);
await prepare();
const metaInfo = meta();
if (STEPS.has('cold')) (await stepCold(), write(false));
if (STEPS.has('warm')) (await stepWarm(), write(false));
if (STEPS.has('dev')) (await stepDevAndEdit(), write(false));
if (STEPS.has('transpile')) (await stepTranspile(), write(false));
write(true);
log(`wrote ${OUT}`);
for (const [id, m] of Object.entries(results)) {
  console.log(`\n${m.title} (${m.unit})`);
  for (const r of ROW_IDS) if (m.samples[r]) console.log(`  ${r.padEnd(10)} median ${summary(m.samples[r]).median}  min ${summary(m.samples[r]).min}  max ${summary(m.samples[r]).max}  n=${m.samples[r].length}`);
}
if (errors.length) console.log(`\n${errors.length} failed sample(s), see "errors" in the JSON`);
process.exit(0);
