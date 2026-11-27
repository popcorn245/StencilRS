// Bundle-size variants for docs/spike-build-flags.md (spike/build-flags/):
//   SIZE_FOLD=1      foldRuntimeFlags
//   SIZE_NOHYD=1     buildFlags: { hydrateClientSide: false } (what `stencil build` does without an SSR output target)
//   SIZE_SIGNALS=1   signals: true
//   SIZE_OUT=<dir>   outDir
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    stencilrs({
      signals: !!process.env.SIZE_SIGNALS,
      foldRuntimeFlags: !!process.env.SIZE_FOLD,
      buildFlags: process.env.SIZE_NOHYD ? { hydrateClientSide: false } : {},
    }),
  ],
  build: { outDir: process.env.SIZE_OUT ?? 'dist-size', emptyOutDir: true },
  logLevel: 'warn',
});
