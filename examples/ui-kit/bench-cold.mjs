// Cold-start benchmark: what a real start pays, which the warm benchmarks hide.
//
//   node bench-cold.mjs [runs=5] [--only build|dev] [--no-warmup] [--json]
//
// Every measurement spawns a FRESH `node` process (process.execPath, so it is the same on
// Windows, macOS and Linux) that imports the compiler's Vite plugin and Vite itself, and then
//   build  runs a production `vite build` of every ui-kit component, as bench-build.mjs does;
//          reports wall time (spawn -> exit) and spawn -> build end,
//   dev    starts the Vite dev server and requests a component module;
//          reports spawn -> the first 200 response.
// Module load (TypeScript for Stencil, the native binding for stencilrs) is inside the numbers.
//
// stencilrs and stock Stencil (@stencil/unplugin) alternate, and which goes first alternates
// too, so drift hits both equally. Vite's cache directory is a fresh, empty one for every run
// (.bench/cold/cache), and the build output directory is removed. The OS file cache is not
// dropped: that is what a developer's second start of the day sees, and it is not something a
// script can do portably. One unmeasured run of each first brings the files into it
// (--no-warmup skips that).
//
// Reports the median and the min-max spread of each. Writes .bench/cold-results.json (the
// benchmarks.json "coldBuild" and "coldDev" entries, plus every raw run).
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const self = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const bench = join(root, '.bench/cold');
const vendor = (p) => join(root, `vendor/${p}/index.ts`);
const componentUrl = '/src/organisms/feedback-button/feedback-button.tsx';
const MARK = 'BENCH_COLD_MARK';

const loadPlugin = async (compiler) =>
  compiler === 'stencilrs' ? (await import('@popcorn245/stencilrs/vite')).default() : (await import('@stencil/unplugin')).stencilVite();

// ---- child: one cold run ----
if (args[0] === '--child') {
  const [, mode, compiler, cacheDir] = args;
  const plugin = await loadPlugin(compiler);
  const { build, createServer } = await import('vite');
  const common = { root, configFile: false, logLevel: 'silent', cacheDir, plugins: [plugin], resolve: { alias: { '@popcorn245/cards-core': vendor('cards-core'), '@popcorn245/floorplan-core': vendor('floorplan-core') } } };
  if (mode === 'build') {
    await build({
      ...common,
      build: {
        outDir: join(bench, 'dist', compiler),
        emptyOutDir: true,
        lib: { entry: join(bench, 'all-components.ts'), formats: ['es'], fileName: 'components' },
        rollupOptions: { external: [/^@editorjs\//, /^editorjs-/, 'reveal.js', 'marked', 'dompurify', 'highlight.js', 'd3-force', 'qr-scanner', 'firebase/auth', 'firebase/app'] },
      },
    });
    console.log(MARK);
  } else {
    const server = await createServer({ ...common, server: { port: 0, host: '127.0.0.1' }, optimizeDeps: { noDiscovery: true, include: [] } });
    await server.listen();
    const res = await fetch(server.resolvedUrls.local[0].replace(/\/$/, '') + componentUrl);
    const body = await res.text();
    if (res.status !== 200 || !/defineCustomElement|customElements|proxyCustomElement/.test(body)) throw new Error(`dev server: ${componentUrl} gave ${res.status}\n${body.slice(0, 500)}`);
    console.log(MARK);
    await server.close();
  }
  process.exit(0);
}

// ---- parent ----
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
if (only && !['build', 'dev'].includes(only)) throw new Error(`--only must be build or dev, got ${only}`);
const warmup = !args.includes('--no-warmup');
const json = args.includes('--json');
const runs = Number(args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--only') ?? 5);

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const components = walk(join(root, 'src')).filter((f) => f.endsWith('.tsx') && !/\.(spec|stories)\.tsx$/.test(f));
mkdirSync(bench, { recursive: true });
writeFileSync(join(bench, 'all-components.ts'), components.map((f) => `import '${relative(bench, f).replace(/\\/g, '/')}';`).join('\n') + '\n');

// Spawn one cold child; resolves { wall, mark } in ms from just before the spawn.
const cold = (mode, compiler) =>
  new Promise((resolve, reject) => {
    const cacheDir = join(bench, 'cache');
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(join(bench, 'dist'), { recursive: true, force: true });
    let mark = null;
    let out = '';
    const t0 = performance.now();
    const child = spawn(process.execPath, [self, '--child', mode, compiler, cacheDir], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '0', CI: '1' } });
    const onData = (d) => {
      out += d;
      if (mark === null && out.includes(MARK)) mark = performance.now() - t0;
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', (code) => {
      const wall = performance.now() - t0;
      if (code !== 0 || mark === null) reject(new Error(`${compiler} ${mode}: exit ${code}\n${out.slice(-3000)}`));
      else resolve({ wall, mark });
    });
  });

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const round = (x) => Math.round(x);
const modes = only ? [only] : ['build', 'dev'];
const compilers = ['stencilrs', 'stencil'];
const res = {};
for (const mode of modes) {
  res[mode] = { stencilrs: { wall: [], mark: [] }, stencil: { wall: [], mark: [] } };
  if (warmup) for (const c of compilers) await cold(mode, c);
  for (let i = 0; i < runs; i++) {
    for (const c of i % 2 ? [...compilers].reverse() : compilers) {
      const r = await cold(mode, c);
      res[mode][c].wall.push(r.wall);
      res[mode][c].mark.push(r.mark);
      console.log(`${mode} run ${i + 1}/${runs} ${c.padEnd(9)} ${mode === 'build' ? `build end ${r.mark.toFixed(0)} ms · wall ${r.wall.toFixed(0)} ms` : `first response ${r.mark.toFixed(0)} ms`}`);
    }
  }
}

const label = { stencilrs: 'stencilrs (@popcorn245/stencilrs/vite)', stencil: 'Stencil v5 (@stencil/unplugin)' };
const spread = (xs) => [round(Math.min(...xs)), round(Math.max(...xs))];
const ratio = (k, field) => (median(res[k].stencil[field]) / median(res[k].stencilrs[field])).toFixed(1);
const entry = {};
if (res.build) {
  entry.coldBuild = {
    what: `Fresh-process production vite build of all ${components.length} ui-kit components as one library, including loading Vite and the compiler (examples/ui-kit/bench-cold.mjs, ${runs} runs, alternating, Vite cache cleared each run; median, min-max)`,
    runs,
    rows: compilers.map((c) => ({
      compiler: label[c],
      wallMedianMs: round(median(res.build[c].wall)),
      buildEndMedianMs: round(median(res.build[c].mark)),
      wallSpreadMs: spread(res.build[c].wall),
    })),
    speedup: `${ratio('build', 'wall')}× wall, ${ratio('build', 'mark')}× to build end`,
  };
}
if (res.dev) {
  entry.coldDev = {
    what: `Fresh-process Vite dev server on the ui-kit: time from spawning node to the first 200 for a component module, including loading Vite and the compiler (examples/ui-kit/bench-cold.mjs, ${runs} runs, alternating, Vite cache cleared each run; median, min-max)`,
    runs,
    rows: compilers.map((c) => ({
      compiler: label[c],
      firstResponseMedianMs: round(median(res.dev[c].mark)),
      firstResponseSpreadMs: spread(res.dev[c].mark),
    })),
    speedup: `${ratio('dev', 'mark')}×`,
  };
}

console.log(`\nmedians of ${runs} cold runs (min-max)`);
for (const [k, e] of Object.entries(entry)) {
  for (const r of e.rows) console.log(`${k.padEnd(10)} ${r.compiler.padEnd(42)} ${k === 'coldBuild' ? `wall ${r.wallMedianMs} ms (${r.wallSpreadMs.join('-')}) · build end ${r.buildEndMedianMs} ms` : `first response ${r.firstResponseMedianMs} ms (${r.firstResponseSpreadMs.join('-')})`}`);
  console.log(`${k.padEnd(10)} stencilrs faster by ${e.speedup}`);
}
writeFileSync(join(root, '.bench/cold-results.json'), JSON.stringify({ runs, entry, results: res }, null, 2) + '\n');
if (json) console.log('\n' + JSON.stringify(entry, null, 2));
