// Page-load bench, stencilrs side: the client bundle, and (with --ssr) the server bundle.
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
  root: import.meta.dirname,
  // `hydrateClient`: the client hydrates (and resumes) the server's html; without it the gated runtime (the default, `runtimeFeatures: 'auto'`) has no hydration.
  plugins: [stencilrs({ runtime: 'stencilrs', hydrateClient: { split: false } })],
  build: isSsrBuild
    ? { outDir: '../dist-load-stencilrs-server', emptyOutDir: true, rollupOptions: { input: 'src/entry-server.ts' } }
    : { outDir: '../dist-load-stencilrs', emptyOutDir: true },
  logLevel: 'warn',
}));
