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
    // ionicons' `ion-icon`, which Stencil's `ssr` target compiles from the collection ionicons ships
    collections: ['ionicons'],
    stencilrs: {
      watchIgnore: false,
      css: {
        sass: { silenceDeprecations },
        // config/ionicons-css-fix.ts, the same repair for the same file: `not` needs parentheses before `and`
        transform: (css, file) =>
          /ionicons[\\/]dist[\\/]collection[\\/]components[\\/]icon[\\/]icon\.css$/.test(file)
            ? css.replace('@supports not selector(:dir(rtl)) and selector(', '@supports (not selector(:dir(rtl))) and selector(')
            : undefined,
      },
    },
  };
};
