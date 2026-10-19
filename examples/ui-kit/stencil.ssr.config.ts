import { Config } from '@stencil/core';

// Stencil v5's own hydrate app for the ui-kit (`type: 'ssr'`), to render the same pages as the
// one built from stencilrs' output (`ssr/build-hydrate.mjs`) and compare them (`ssr/smoke.mjs`).
export const config: Config = {
  namespace: 'pop',
  tsconfig: 'tsconfig.ssr.json',
  outputTargets: [{ type: 'ssr', dir: 'dist/hydrate-stencil' }, { type: 'loader-bundle', dir: 'dist/lazy-stencil' }],
};
