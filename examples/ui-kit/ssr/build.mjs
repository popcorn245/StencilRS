// The two bundles the server-render smoke test needs, both from components stencilrs compiled:
//
//   node ssr/build.mjs
//
//   dist/hydrate/index.js          the hydrate app (`componentExport: 'ssr'`), with the
//                                  `renderToString` / `hydrateDocument` API of Stencil's `ssr`
//                                  output target (`stencil build` with `{ type: 'ssr' }`)
//   dist/hydrate-client/components.js
//                                  the client bundle that hydrates what the app rendered: every
//                                  component and its dependencies in one module (no bare imports,
//                                  so a browser or happy-dom can load it as it is)
//
// The hydrate app is `buildHydrate` of `@popcorn245/stencilrs/ssr` (see ../../../ssr.js for how it is
// assembled); this file only says where the ui-kit's components and aliases are.
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildHydrate as buildHydrateApp } from '@popcorn245/stencilrs/ssr';
import stencilrs from '@popcorn245/stencilrs/vite';
import { build } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const alias = {
  '@popcorn245/cards-core': join(root, 'vendor/cards-core/index.ts'),
  '@popcorn245/floorplan-core': join(root, 'vendor/floorplan-core/index.ts'),
};

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** The client bundle: `vite.lib.config.ts`'s entry, with the third-party libraries bundled in. */
export const buildClient = async (outDir = join(root, 'dist/hydrate-client')) => {
  const files = walk(join(root, 'src')).filter((f) => f.endsWith('.tsx') && !/\.(spec|stories)\.tsx$/.test(f));
  const entry = join(root, '.lib/ssr-client-entry.mjs');
  mkdirSync(dirname(entry), { recursive: true });
  writeFileSync(entry, files.map((f) => `import ${JSON.stringify(f)};`).join('\n') + '\n');
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    resolve: { alias },
    plugins: [stencilrs()],
    build: { outDir, emptyOutDir: true, lib: { entry, formats: ['es'], fileName: 'components' } },
  });
  return join(outDir, 'components.js');
};

/** The hydrate app: `@popcorn245/stencilrs/ssr`, the build any project can run. */
export const buildHydrate = async (outDir = join(root, 'dist/hydrate')) =>
  (await buildHydrateApp({ root, outDir, alias, namespace: 'pop', fastSerializer: !process.env.STENCILRS_SLOW_SERIALIZER })).file;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const file of [await buildHydrate(), await buildClient()]) {
    console.log(`${relative(root, file)} (${(statSync(file).size / 1024).toFixed(0)} kB)`);
  }
}
