// The islands spike's client build: the migrated Ionic config with an `ssr` output target added beside the lazy loader and the
// custom-elements build. Stencil turns BUILD.hydrateClientSide on for the browser bundles when the project has a hydrate target;
// without it the client runtime has no code to adopt server-rendered DOM (it renders from scratch and the server's nodes are discarded).
// Copy to migrated/stencil.client.config.ts and run: IONIC_OUT_DIR=../dist-client node ../node_modules/@stencil/cli/bin/stencil.mjs build --dev --config stencil.client.config.ts
import type { Config } from '@stencil/core';
import { config as full } from './stencil.config';

export const config: Config = {
  ...full,
  cacheDir: '.stencil-client',
  // `--dev` skips the ssr target (Stencil's own hydrate app does not build against the ionicons collection) but still turns client hydration on;
  // the custom-elements (standalone) target is skipped in dev unless told otherwise, and the per-component build is what the lazy-hydration experiment needs.
  outputTargets: [...(full.outputTargets ?? []).map((o: any) => (o.type === 'standalone' ? { ...o, skipInDev: false } : o)), { type: 'ssr', dir: 'dist-client-ssr', skipInDev: true }],
};
