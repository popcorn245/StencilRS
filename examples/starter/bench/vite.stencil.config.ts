import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [stencilrs({ runtime: 'stencil' })],
  build: { outDir: 'dist-stencil', emptyOutDir: true },
  logLevel: 'warn',
});
