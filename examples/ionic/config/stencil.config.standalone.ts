// The `stencil-standalone` benchmark row (bench.mjs): the migrated Stencil v5 config with only the `standalone` output
// target, the closest Stencil equivalent of stencilrs' one customElements bundle. No lazy `loader-bundle`, no
// `docs-json`. scripts/migrate.mjs copies this next to migrated/stencil.config.ts as stencil.standalone.config.ts;
// run it with `stencil build --config stencil.standalone.config.ts`. Everything else (plugins, bundles, preamble,
// global script) is the migrated config's, so it is never edited here. It keeps its own cache folder so that the
// benchmark's warm rows of this config and of the full one do not feed each other.
import type { Config } from '@stencil/core';
import { config as full } from './stencil.config';

export const config: Config = {
  ...full,
  cacheDir: '.stencil-standalone',
  outputTargets: (full.outputTargets ?? []).filter((t) => t.type === 'standalone'),
};
