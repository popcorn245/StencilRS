// Page-load bench, stencilrs side: the client bundle, and (with --ssr) the server bundle.
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
  root: import.meta.dirname,
  plugins: [stencilrs({ runtime: 'stencilrs' })],
  build: isSsrBuild
    ? { outDir: '../dist-load-stencilrs-server', emptyOutDir: true, rollupOptions: { input: 'src/entry-server.ts' } }
    : { outDir: '../dist-load-stencilrs', emptyOutDir: true },
  logLevel: 'warn',
}));
