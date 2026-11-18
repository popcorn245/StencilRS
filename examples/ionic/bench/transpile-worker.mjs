// One compiler, every Ionic component file, one fresh process (spawned by ../bench.mjs).
//
//   node bench/transpile-worker.mjs stencil4|stencil|stencilrs [passes=5]
//
// Prints one JSON line: { compiler, version, files, kib, passesMs: [cold, warm, warm, ...], diagnostics }.
// A pass compiles every file that declares a @Component to its standalone-element module, in
// this process, single-threaded, source maps on (what @stencil/unplugin and the Vite plugin ask for).
// The first pass is the cold one: module load is not in it (imports come first), JIT warm-up and
// TypeScript's lazy initialisation are.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const [compiler, passesArg] = process.argv.slice(2);
const passes = Number(passesArg ?? 5);
if (!['stencil4', 'stencil', 'stencilrs'].includes(compiler)) throw new Error('usage: transpile-worker.mjs stencil4|stencil|stencilrs [passes]');

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
// stencil4 compiles the stock source, the other two the migrated copy: the same 95 files.
const srcRoot = join(here, compiler === 'stencil4' ? 'stencil4/stock/src' : 'migrated/src');
const files = walk(join(srcRoot, 'components'))
  .filter((f) => f.endsWith('.tsx') && /^\s*@Component\(/m.test(readFileSync(f, 'utf8')))
  .sort()
  .map((file) => ({ file, code: readFileSync(file, 'utf8') }));

let run;
let version;
if (compiler === 'stencilrs') {
  const { transpile } = await import('@popcorn245/stencilrs');
  version = JSON.parse(readFileSync(join(here, 'node_modules/@popcorn245/stencilrs/package.json'), 'utf8')).version;
  // As the Vite plugin calls it for Ionic: classic JSX (`h` is imported), useDefineForClassFields: false.
  run = (f) => transpile(f.code, { file: f.file, jsx: 'classic', complexTypes: true, componentExport: 'customelement', useDefineForClassFields: false });
} else {
  // v4 is CommonJS in its own node_modules; v5 is ESM in this one.
  const core = compiler === 'stencil4' ? createRequire(join(here, 'stencil4/package.json'))('@stencil/core/compiler') : await import('@stencil/core/compiler');
  version = core.versions.stencil;
  const options = (f) => ({ file: f.file, jsx: 2, componentExport: 'customelement', styleImportData: 'queryparams', sourceMap: true });
  run = (f) => core.transpileSync(f.code, compiler === 'stencil4' ? { ...options(f), jsx: undefined } : options(f));
}

const passesMs = [];
let diagnostics = 0;
let outBytes = 0;
for (let p = 0; p < passes; p++) {
  const t0 = performance.now();
  for (const f of files) {
    const r = run(f);
    if (p === 0) {
      diagnostics += (r.diagnostics ?? []).filter((d) => d.level === 'error').length;
      outBytes += (r.code ?? r.outputText ?? '').length;
    }
  }
  passesMs.push(performance.now() - t0);
}
console.log(JSON.stringify({ compiler, version, files: files.length, kib: Math.round(files.reduce((n, f) => n + f.code.length, 0) / 1024), passesMs, errors: diagnostics, outKib: Math.round(outBytes / 1024) }));
