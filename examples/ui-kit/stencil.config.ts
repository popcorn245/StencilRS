import { Config } from '@stencil/core';

// The bucket ui-kit's Stencil 4 config, ported to v5:
//   dist → loader-bundle, dist-custom-elements → standalone, extras → compat
//   (enableImportInjection is the v5 default), the integrated `testing` block is gone.
export const config: Config = {
  namespace: 'pop',
  globalStyle: 'styles/index.css',
  outputTargets: [
    {
      type: 'loader-bundle',
      copy: [{ src: 'assets' }],
    },
    {
      type: 'standalone',
      customElementsExportBehavior: 'auto-define-custom-elements',
    },
    {
      type: 'www',
      copy: [{ src: 'assets' }],
    },
    {
      type: 'docs-json',
      file: 'dist/custom-elements.json',
    },
  ],
  devServer: {
    openBrowser: false,
  },
};
