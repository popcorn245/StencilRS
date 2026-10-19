import { Config } from '@stencil/core';

// Standalone-only config for bench-stencil-build.mjs: the same namespace and the same
// `standalone` target as stencil.config.ts, minus the loader bundle, www and docs outputs
// (the lazy build isn't ported to stencilrs yet, so only this half can be compared).
// BENCH_OUT_DIR sends each run's files somewhere of its own.
export const config: Config = {
  namespace: 'pop',
  globalStyle: 'styles/index.css',
  tsconfig: 'tsconfig.bench.json',
  outputTargets: [
    {
      type: 'standalone',
      dir: process.env.BENCH_OUT_DIR ?? '.bench/out/standalone',
      customElementsExportBehavior: 'auto-define-custom-elements',
    },
  ],
};
