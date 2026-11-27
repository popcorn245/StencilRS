// node compare-flags.mjs <uiKitDir> : the component-derived flags of vite-fold.js against `stencil build`'s own (dist/collection/collection-manifest.json).
// Produce the manifest first: cd examples/ui-kit && BENCH_OUT_DIR=$PWD/.bench/full npx stencil build --config stencil.bench-full.config.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = process.argv[2] ?? process.cwd();
const { scanComponents, buildFeatures } = await import(pathToFileURL(new URL('../../vite-fold.js', import.meta.url).pathname).href);
const bf = JSON.parse(readFileSync(join(dir, 'dist/collection/collection-manifest.json'), 'utf8')).buildFlags;
const { cmps, problems } = scanComponents(dir, { dirs: [join(dir, 'src')] });
const mine = buildFeatures(cmps);
const diffs = Object.keys(bf).filter((k) => k in mine && mine[k] !== bf[k]);
console.log(`${cmps.length} components, ${problems.length} problems, ${Object.keys(bf).filter((k) => k in mine).length} flags compared, differences: ${JSON.stringify(diffs)}`);
