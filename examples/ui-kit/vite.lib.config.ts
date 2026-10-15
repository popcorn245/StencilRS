// Library build with stencilrs: dist/stencilrs/components.js, one ES module that registers every
// ui-kit component (npm run build:stencilrs). `npm run build` is Stencil v5's own `stencil build`.
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

// One entry that imports every component module (git-ignored, rewritten on each build).
const components = walk(join(root, 'src')).filter((f) => f.endsWith('.tsx') && !/\.(spec|stories)\.tsx$/.test(f));
mkdirSync(join(root, '.lib'), { recursive: true });
const entry = join(root, '.lib/all-components.ts');
writeFileSync(entry, components.map((f) => `import '${relative(join(root, '.lib'), f).replace(/\\/g, '/')}';`).join('\n') + '\n');

const vendor = (p: string) => join(root, `vendor/${p}/index.ts`);

export default defineConfig({
  plugins: [stencilrs({ verbose: true })],
  resolve: { alias: { '@popcorn245/cards-core': vendor('cards-core'), '@popcorn245/floorplan-core': vendor('floorplan-core') } },
  build: {
    outDir: 'dist/stencilrs',
    emptyOutDir: true,
    lib: { entry, formats: ['es'], fileName: 'components' },
    // Third-party runtime libraries stay imports, for the consuming app to bundle.
    rollupOptions: {
      external: [/^@editorjs\//, /^editorjs-/, 'reveal.js', 'marked', 'dompurify', /^highlight\.js(\/|$)/, 'd3-force', 'qr-scanner', /^firebase\//],
    },
  },
});
