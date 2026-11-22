// The `stencil5` row of the SSR benchmark (bench-ssr.mjs): the migrated Stencil v5 config with only the `ssr` output
// target, i.e. Stencil's own hydrate app (`renderToString`). scripts/migrate.mjs copies this next to
// migrated/stencil.config.ts as stencil.ssr.config.ts; `npm run build:ssr` runs it. Everything else (plugins, bundles,
// global script) is the migrated config's, so it is never edited here. Own cache folder, as in the standalone config.
import { win32 } from 'node:path';
import type { Config } from '@stencil/core';
import { config as full } from './stencil.config';

// Issue #146, a Stencil 5 bug on Windows: its `@stencil/core/app-globals` module imports the global script
// (src/global/ionic-global.ts) by a forward-slash absolute path, `J:/…/ionic-global.ts`, while the components' relative
// imports of the same file resolve to `J:\…\ionic-global.ts`. The bundler keeps both as separate modules, so
// `initialize()` sets the Ionic mode on a copy no component reads, and they render class="undefined". Giving an absolute
// forward-slash Windows path its backslash form makes it one module again. No-op off Windows.
const windowsAbsoluteIds = {
  name: 'stencilrs-windows-absolute-ids',
  resolveId(source: string) {
    return process.platform === 'win32' && /^[A-Za-z]:\//.test(source) ? win32.normalize(source) : null;
  },
};

export const config: Config = {
  ...full,
  cacheDir: '.stencil-ssr',
  plugins: [windowsAbsoluteIds, ...(full.plugins ?? [])],
  outputTargets: [{ type: 'ssr', dir: process.env.IONIC_SSR_DIR ?? 'dist-ssr' }],
};
