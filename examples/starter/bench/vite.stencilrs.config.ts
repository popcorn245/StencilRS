import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [stencilrs({ runtime: 'stencilrs' })],
  build: { outDir: 'dist-stencilrs', emptyOutDir: true },
  logLevel: 'warn',
});
