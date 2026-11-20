// End-to-end benchmark: a production `vite build` of every ui-kit component (one library
// bundle), compiled by stencilrs vs by Stencil v5's own Vite plugin (@stencil/unplugin).
//
//   node bench-build.mjs [rounds=3] [stencilrs|stencil]   (the second argument runs one compiler only)
//
// Same Vite 8 (Rolldown), same entry, same everything except the component compiler. Each
// round is a fresh `build()` in this process; the first round of each compiler includes its
// cold start (stencilrs loads a native module; Stencil loads TypeScript).
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import { stencilVite } from '@stencil/unplugin';
import { build } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const rounds = Number(process.argv[2] ?? 3);
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

// One entry that imports every component module.
const components = walk(join(root, 'src')).filter((f) => f.endsWith('.tsx') && !/\.(spec|stories)\.tsx$/.test(f));
mkdirSync(join(root, '.bench'), { recursive: true });
const entry = join(root, '.bench/all-components.ts');
writeFileSync(entry, components.map((f) => `import './${relative(join(root, '.bench'), f).replace(/\\/g, '/')}';`).join('\n') + '\n');

const vendor = (p) => join(root, `vendor/${p}/index.ts`);
const run = async (compiler) => {
  const t0 = performance.now();
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: compiler === 'stencilrs' ? [stencilrs()] : [stencilVite()],
    resolve: { alias: { '@popcorn245/cards-core': vendor('cards-core'), '@popcorn245/floorplan-core': vendor('floorplan-core') } },
    build: {
      outDir: join(root, '.bench/dist', compiler),
      emptyOutDir: true,
      lib: { entry, formats: ['es'], fileName: 'components' },
      rollupOptions: { external: [/^@editorjs\//, /^editorjs-/, 'reveal.js', 'marked', 'dompurify', 'highlight.js', 'd3-force', 'qr-scanner', 'firebase/auth', 'firebase/app'] },
    },
  });
  return performance.now() - t0;
};

const results = {};
const only = process.argv[3];
for (const compiler of ['stencilrs', 'stencil'].filter((c) => !only || c === only)) {
  const times = [];
  for (let i = 0; i < rounds; i++) times.push(await run(compiler));
  const warm = times.slice(1).sort((a, b) => a - b);
  results[compiler] = { first: times[0], median: warm.length ? warm[Math.floor(warm.length / 2)] : times[0], all: times };
  console.log(`${compiler.padEnd(10)} first ${times[0].toFixed(0)} ms · warm median ${results[compiler].median.toFixed(0)} ms · ${times.map((t) => t.toFixed(0)).join(', ')}`);
}
if (results.stencil && results.stencilrs) console.log(`\nstencilrs is ${(results.stencil.median / results.stencilrs.median).toFixed(1)}× faster (warm), ${(results.stencil.first / results.stencilrs.first).toFixed(1)}× (first build)`);
writeFileSync(join(root, '.bench/results.json'), JSON.stringify({ components: components.length, rounds, results }, null, 2) + '\n');
