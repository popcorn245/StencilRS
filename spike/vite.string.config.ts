// Server bundle of the 500-card page for the string renderer: the same components, but `@stencil/core`
// resolves to spike/runtime-string.js (kept external, so the renderer and the components share it).
//   cd examples/starter && npx vite build --ssr --config ../../spike/vite.string.config.ts
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const RUNTIME = fileURLToPath(new URL('./runtime-string.js', import.meta.url));
const root = fileURLToPath(new URL('../examples/starter/bench/load', import.meta.url));
const entry = process.env.STRING_ENTRY ?? 'src/entry-server.ts';
const out = process.env.STRING_OUT ?? '../dist-load-string-server';

export default defineConfig({
  root,
  plugins: [
    {
      name: 'spike:string-runtime',
      enforce: 'pre',
      resolveId(id, importer) {
        if (process.env.DEBUG_RESOLVE && /stencil|runtime/.test(id)) console.log('resolve', id, importer);
        if ((id === '@stencil/core' || id === '@popcorn245/stencilrs/runtime') && importer && !importer.endsWith('runtime-string.js')) return { id: RUNTIME, external: true };
      },
    },
    stencilrs({ runtime: 'stencilrs' }),
  ],
  build: { outDir: out, emptyOutDir: true, rollupOptions: { input: entry } },
  logLevel: 'warn',
});
