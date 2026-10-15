import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import type { StorybookConfig } from '@storybook/web-components-vite';
import remarkGfm from 'remark-gfm';
import { mergeConfig } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const uiKit = join(repo, 'examples/ui-kit');

const config: StorybookConfig = {
  // Three sections in the sidebar: the docs, then each component set.
  stories: [
    { directory: '../docs', titlePrefix: 'Docs', files: '**/*.mdx' },
    { directory: '../../examples/ui-kit/src', titlePrefix: 'UI Kit', files: '**/*.stories.@(ts|tsx)' },
    { directory: '../../examples/starter/src', titlePrefix: 'Starter', files: '**/*.stories.@(ts|tsx)' },
  ],
  // GitHub-flavoured markdown (tables) in the MDX docs.
  addons: [{ name: '@storybook/addon-docs', options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } } }],
  framework: { name: '@storybook/web-components-vite', options: {} },
  // Tailnet names (npm run storybook:tailnet → http://<machine>.<tailnet>.ts.net:6007). Storybook
  // hands this list to Vite too; host validation stays on for every other name.
  core: { allowedHosts: ['.ts.net'] },
  // ui-kit images, and self-hosted ionicons (pop-icon wraps <ion-icon>; see preview-head.html).
  staticDirs: [
    { from: join(uiKit, 'src/assets'), to: '/assets' },
    { from: join(uiKit, 'fonts'), to: '/fonts' },
    { from: join(here, '../node_modules/ionicons/dist/ionicons'), to: '/ionicons' },
  ],
  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      // Every component in both sets is compiled by stencilrs (Stencil's compiler only as the
      // per-file fallback for features stencilrs hasn't ported).
      plugins: [stencilrs({ verbose: true })],
      resolve: {
        alias: {
          '@popcorn245/cards-core': join(uiKit, 'vendor/cards-core/index.ts'),
          '@popcorn245/floorplan-core': join(uiKit, 'vendor/floorplan-core/index.ts'),
        },
        // One copy of each, resolved from here: the stories and components live in the examples,
        // which have their own node_modules (one Stencil runtime for both sets).
        dedupe: ['@stencil/core', 'lit', '@storybook/web-components', '@storybook/web-components-vite'],
      },
      // Storybook's renderer imports lit/directive-helpers.js; pre-bundle it with lit so the page
      // loads one lit-html, not a pre-bundled copy plus a raw one.
      optimizeDeps: { include: ['lit', 'lit/directive-helpers.js'] },
      server: { fs: { allow: [repo] } },
    });
  },
};

export default config;
