import { Config } from '@stencil/core';

// Reference for the bundle-size spike (docs/spike-build-flags.md): the starter's components through `stencil build` (standalone output).
export const config: Config = {
  namespace: 'starter',
  srcDir: 'src',
  tsconfig: 'tsconfig.ref.json',
  outputTargets: [{ type: 'standalone', dir: 'dist-stencil-ref', customElementsExportBehavior: 'auto-define-custom-elements' }],
};
