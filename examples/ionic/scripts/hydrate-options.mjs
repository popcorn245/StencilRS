// What is Ionic's in its hydrate build: the options `buildHydrate` takes (scripts/build-hydrate.mjs).
import { join } from 'node:path';

const silenceDeprecations = ['import', 'global-builtin', 'color-functions', 'if-function'];

export const ionicHydrateOptions = (root) => {
  const src = join(root, 'migrated/src');
  return {
    root: join(root, 'migrated'),
    srcDir: 'src/components',
    namespace: 'ionic',
    globalScript: join(src, 'global/ionic-global.ts'),
    preamble: '(C) Ionic http://ionicframework.com - MIT License',
    // Ionic's tsconfig `paths`, which Vite does not read.
    alias: [
      { find: /^src\//, replacement: `${src}/` },
      { find: /^@utils\/test$/, replacement: join(src, 'utils/test/utils') },
      { find: /^@utils\//, replacement: `${join(src, 'utils')}/` },
      { find: /^@global\//, replacement: `${join(src, 'global')}/` },
    ],
    stencilrs: { css: { sass: { silenceDeprecations } }, watchIgnore: false },
  };
};
