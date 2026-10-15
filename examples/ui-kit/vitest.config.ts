// The ui-kit specs on real compiled components.
//   COMPILER=stencilrs (default): @popcorn245/stencilrs/vite, falling back per file to Stencil
//   COMPILER=stencil:             @stencil/unplugin alone (Stencil v5's transpileSync), the baseline
import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import { stencilVite } from '@stencil/unplugin';
import { defineConfig } from 'vitest/config';

const compiler = process.env.COMPILER === 'stencil' ? 'stencil' : 'stencilrs';
const vendor = (p: string) => fileURLToPath(new URL(`./vendor/${p}/index.ts`, import.meta.url));

export default defineConfig({
  plugins: compiler === 'stencil' ? [stencilVite()] : [stencilrs({ verbose: true })],
  resolve: {
    alias: {
      '@popcorn245/cards-core': vendor('cards-core'),
      '@popcorn245/floorplan-core': vendor('floorplan-core'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    // One JSON report per compiler, for compare.mjs.
    reporters: ['default', ['json', { outputFile: `results/${compiler}.json` }]],
    // Fake timers leave requestAnimationFrame real: Stencil renders on animation frames, so
    // components keep rendering while a spec's setTimeout / setInterval / Date are frozen.
    fakeTimers: { toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] },
    // Some specs leave timers or open handles behind; keep runs bounded.
    testTimeout: 10_000,
  },
});
