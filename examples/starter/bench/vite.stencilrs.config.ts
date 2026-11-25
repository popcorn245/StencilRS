import { join } from 'node:path';
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [stencilrs({ runtime: 'stencilrs' })],
  // `live`: bench-live-cell as its own entry, so the bundle sizes compare the runtimes without Stencil's signals library.
  build: { outDir: 'dist-stencilrs', emptyOutDir: true, rollupOptions: { input: { index: join(import.meta.dirname, 'index.html'), live: join(import.meta.dirname, 'src/bench-live-cell.tsx') } } },
  logLevel: 'warn',
});
