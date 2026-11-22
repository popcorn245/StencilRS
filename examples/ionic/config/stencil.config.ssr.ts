// The `stencil5` row of the SSR benchmark (bench-ssr.mjs): the migrated Stencil v5 config with only the `ssr` output
// target, i.e. Stencil's own hydrate app (`renderToString`). scripts/migrate.mjs copies this next to
// migrated/stencil.config.ts as stencil.ssr.config.ts; `npm run build:ssr` runs it. Everything else (plugins, bundles,
// global script) is the migrated config's, so it is never edited here. Own cache folder, as in the standalone config.
import type { Config } from '@stencil/core';
import { config as full } from './stencil.config';

export const config: Config = {
  ...full,
  cacheDir: '.stencil-ssr',
  outputTargets: [{ type: 'ssr', dir: process.env.IONIC_SSR_DIR ?? 'dist-ssr' }],
};
