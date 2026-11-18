// Ionic core through stencilrs (npm run build:stencilrs): the same migrated/ source `stencil build` takes,
// compiled by the @popcorn245/stencilrs Vite plugin into dist-stencilrs/.
//
//   dist-stencilrs/ionic.js    one ES module: Ionic's global script (`initialize()`), ion-icon, then every
//                              component registered with customElements.define (the "bundle" a script
//                              tag loads; mode styles ios/md come from the .ios.scss/.md.scss files)
//   dist-stencilrs/css/        Ionic's global stylesheets (core, normalize, structure, typography, utilities,
//                              palettes), from src/css/**/*.scss, as `stencil build` writes them to css/
//
// The compiler runs from this folder (process.cwd()) so that Sass is found in this node_modules.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import * as sass from 'sass';
import { defineConfig, type Plugin } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const src = join(here, 'migrated/src');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

// One entry: Ionic's global script first (it sets the mode before any element connects), then ion-icon,
// then every file that declares a @Component. Written on each build, git-ignored.
const components = walk(join(src, 'components'))
  .filter((f) => f.endsWith('.tsx') && /^\s*@Component\(/m.test(readFileSync(f, 'utf8')))
  .sort();
const libDir = join(here, '.lib');
mkdirSync(libDir, { recursive: true });
const entry = join(libDir, 'ionic.ts');
const rel = (f: string) => relative(libDir, f).replace(/\\/g, '/');
// Ionic's global script has to run before the first component is defined: defining a component upgrades the
// elements already in the page, which read their mode at once. Its own module, imported first, does that.
writeFileSync(join(libDir, 'init.ts'), `import initialize from '${rel(join(src, 'global/ionic-global.ts'))}';\ninitialize();\n`);
writeFileSync(
  entry,
  [
    `import './init';`,
    `import { defineCustomElement as defineIonIcon } from 'ionicons/components/ion-icon.js';`,
    `export { initialize } from '${rel(join(src, 'global/ionic-global.ts'))}';`,
    ...components.map((f) => `import '${rel(f)}';`),
    `defineIonIcon();`,
    '',
  ].join('\n'),
);

// src/css/**/*.scss to css/**/*.css, what the `stencil build` output keeps in css/: compressed Sass, as `stencil build`'s
// build:stencil step does (scripts/build.mjs). Vite's own preprocessCSS is not used: its
// Sass worker pool keeps the process alive after the build.
const globalCss = (): Plugin => ({
  name: 'ionic-global-css',
  generateBundle() {
    for (const file of walk(join(src, 'css')).filter((f) => f.endsWith('.scss'))) {
      const { css: code } = sass.compile(file, { style: 'compressed', silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'] });
      this.emitFile({ type: 'asset', fileName: `css/${relative(join(src, 'css'), file).replace(/\.scss$/, '.css')}`, source: code + '\n' });
    }
  },
});

export default defineConfig({
  root: join(here, 'migrated'),
  // Ionic's tsconfig `paths`, which Vite does not read.
  resolve: {
    alias: [
      { find: /^src\//, replacement: `${src}/` },
      { find: /^@utils\/test$/, replacement: join(src, 'utils/test/utils') },
      { find: /^@utils\//, replacement: `${join(src, 'utils')}/` },
      { find: /^@global\//, replacement: `${join(src, 'global')}/` },
    ],
  },
  plugins: [stencilrs({ verbose: true, buildFlags: { hydrateClientSide: false } }), globalCss()],
  build: {
    outDir: join(here, 'dist-stencilrs'),
    emptyOutDir: true,
    minify: true,
    lib: { entry, formats: ['es'], fileName: 'ionic' },
    rollupOptions: { output: { assetFileNames: '[name][extname]' } },
  },
});
