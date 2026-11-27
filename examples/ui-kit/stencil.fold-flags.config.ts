import { Config } from '@stencil/core';

// Only a `collection` output: its collection-manifest.json records the `BUILD` flags Stencil computes from the components (`getBuildFeatures`),
// which check-fold-flags.mjs compares with the ones the Vite plugin's `foldRuntimeFlags` computes (vite-fold.js). tsconfig.bench.json leaves out the
// stories, whose Storybook imports aren't installed here.
export const config: Config = {
  namespace: 'pop',
  globalStyle: 'styles/index.css',
  tsconfig: 'tsconfig.bench.json',
  outputTargets: [{ type: 'collection', dir: '.bench/fold-flags/collection' }],
};
