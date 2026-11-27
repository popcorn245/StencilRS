// Two builds from the same components:
//   dist/hydrate/index.js   the hydrate app the server renders with (buildHydrate)
//   dist/client/            the browser build: components/<tag>.js (one module per tag), components.json and islands.js (the boot)
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

import { buildHydrate } from '@popcorn245/stencilrs/ssr';
import stencilrs from '@popcorn245/stencilrs/vite';
import { build } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const dir = join(root, 'src/components');
const components = readdirSync(dir).map((f) => join(dir, f));

const { file } = await buildHydrate({ root, components, outDir: join(root, 'dist/hydrate'), namespace: 'islands-example' });
console.log(`hydrate app: ${file}`);

await build({
  root,
  configFile: false,
  logLevel: 'warn',
  plugins: [stencilrs({ hydrateClient: { islands: true } })],
  build: {
    outDir: join(root, 'dist/client'),
    emptyOutDir: true,
    lib: { entry: join(root, 'src/index.ts'), formats: ['es'], fileName: 'index' },
  },
});
console.log('client build: dist/client (components.json, components/<tag>.js, islands.js)');
