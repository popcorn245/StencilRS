// Ionic's hydrate app (`renderToString` / `hydrateDocument`) from components stencilrs compiled, the build
// `stencil build --config stencil.ssr.config.ts` (output target `ssr`) does with Stencil's own compiler:
//
//   node scripts/build-hydrate.mjs          (npm run build:hydrate)   ->  dist/hydrate-stencilrs/index.js
//
// The assembly is `buildHydrate` of `@popcorn245/stencilrs/ssr`; this file is what is Ionic's: its aliases (tsconfig
// `paths`, which Vite does not read), global script, preamble, namespace, the ionicons collection and the
// `BUILD` conditionals Stencil derives from Ionic's components.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHydrate } from '@popcorn245/stencilrs/ssr';

import { ionicHydrateOptions } from './hydrate-options.mjs';

const root = join(fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, ''));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const started = performance.now();
  const outDir = process.env.IONIC_HYDRATE_OUT_DIR ?? join(root, 'dist/hydrate-stencilrs');
  const { file, components } = await buildHydrate({ ...ionicHydrateOptions(root), outDir });
  console.log(`hydrate-stencilrs: ${components.length} components -> ${file} in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}
