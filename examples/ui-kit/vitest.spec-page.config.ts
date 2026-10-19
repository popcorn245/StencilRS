// The ui-kit specs on Stencil's own `newSpecPage` (@stencil/core/testing), components compiled
// in @stencil/unplugin's `spec-page` mode:
//   COMPILER=stencilrs (default): @popcorn245/stencilrs/vite, falling back per file to Stencil
//   COMPILER=stencil:             @stencil/unplugin's `stencilSpecPage` (Stencil v5's transpileSync), the baseline
// Unlike vitest.config.ts the DOM is Stencil's mock-doc, not jsdom: `newSpecPage` brings its own.
import { fileURLToPath } from 'node:url';

import { stencilrsSpecPage } from '@popcorn245/stencilrs/vite';
import { stencilSpecPage } from '@stencil/unplugin';
import { defineConfig } from 'vitest/config';

const compiler = process.env.COMPILER === 'stencil' ? 'stencil' : 'stencilrs';
const vendor = (p: string) => fileURLToPath(new URL(`./vendor/${p}/index.ts`, import.meta.url));

export default defineConfig({
  plugins: compiler === 'stencil' ? [stencilSpecPage()] : [stencilrsSpecPage({ verbose: true })],
  resolve: {
    alias: [
      { find: '@popcorn245/cards-core', replacement: vendor('cards-core') },
      { find: '@popcorn245/floorplan-core', replacement: vendor('floorplan-core') },
      // The specs' helper, swapped for Stencil's own.
      { find: /^(\.\.?\/)+test-utils\/spec-page$/, replacement: fileURLToPath(new URL('./harness/stencil-spec-page.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    reporters: ['default', ['json', { outputFile: `results/spec-page-${compiler}.json` }]],
    testTimeout: 10_000,
  },
});
