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
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig, type Plugin } from 'vite';

// Ionic's Sass still uses `@import`, global built-ins and other deprecated features (about 2,000 lines of warnings per build).
const silenceDeprecations = ['import', 'global-builtin', 'color-functions', 'if-function'] as const;
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
// Compiled with sass-embedded when the harness has it (all sheets at once, in one compiler process that is disposed when
// the build ends), else with `sass`, one after another. Cached as the plugin caches component styles (vite-css.js): in
// memory across rebuilds of `vite build --watch`, and on disk (node_modules/.cache/stencilrs/ionic-global-css); a file is
// recompiled only when it or a file Sass loaded for it (`loadedUrls`) changed, by content hash.
const sha = (...parts: string[]) => parts.reduce((h, p) => h.update(p).update('\0'), createHash('sha1')).digest('hex');
const hashOf = (f: string) => {
  try {
    return createHash('sha1').update(readFileSync(f)).digest('hex');
  } catch {
    return 'missing';
  }
};
type GlobalEntry = { code: string; deps: [string, string][] };
const globalCssCache = new Map<string, GlobalEntry>();
const globalCssDisk = join(here, 'node_modules/.cache/stencilrs/ionic-global-css');
const sassOptions = { style: 'compressed' as const, silenceDeprecations: [...silenceDeprecations] };
type AsyncCompiler = { compileAsync(path: string, options: typeof sassOptions): Promise<{ css: string; loadedUrls: URL[] }>; dispose(): Promise<void> };
let embedded: Promise<AsyncCompiler | null> | undefined;
const embeddedCompiler = () =>
  (embedded ??= import('sass-embedded').then(
    (m) => (m.initAsyncCompiler() as Promise<AsyncCompiler>),
    () => null, // not installed: `sass`
  ));
const disposeCompiler = async () => {
  const c = embedded;
  embedded = undefined;
  await (await c)?.dispose();
};
// The Sass version for the cache key, from the package.json of the package that compiles: `import * as sass` would load
// Sass (about 100 ms) on every config load, dev server included. `sass` is imported only when sass-embedded is missing.
const requireFrom = createRequire(import.meta.url);
const sassVersion = (pkg: string): string => {
  try {
    return (JSON.parse(readFileSync(requireFrom.resolve(`${pkg}/package.json`), 'utf8')) as { version: string }).version;
  } catch {
    return 'unknown';
  }
};
const compileGlobal = async (file: string): Promise<string> => {
  const content = hashOf(file);
  const compiler = await embeddedCompiler();
  const key = sha('global', sassVersion(compiler ? 'sass-embedded' : 'sass'), JSON.stringify(sassOptions), file, content);
  const current = (e: GlobalEntry) => e.deps.every(([f, h]) => hashOf(f) === h);
  let hit = globalCssCache.get(key);
  if (!hit) {
    try {
      hit = JSON.parse(readFileSync(join(globalCssDisk, `${key}.json`), 'utf8')) as GlobalEntry;
    } catch {}
  }
  if (hit && current(hit)) {
    globalCssCache.set(key, hit);
    return hit.code;
  }
  const result = compiler ? await compiler.compileAsync(file, sassOptions) : (await import('sass')).compile(file, sassOptions);
  const deps = result.loadedUrls.filter((u) => u.protocol === 'file:').map((u) => fileURLToPath(u)).filter((f) => f !== file);
  const entry: GlobalEntry = { code: result.css, deps: deps.map((f) => [f, hashOf(f)]) };
  globalCssCache.set(key, entry);
  try {
    mkdirSync(globalCssDisk, { recursive: true });
    const tmp = join(globalCssDisk, `${key}.${process.pid}.tmp`);
    writeFileSync(tmp, JSON.stringify(entry));
    renameSync(tmp, join(globalCssDisk, `${key}.json`));
  } catch {}
  return result.css;
};
const globalCss = (): Plugin => {
  // Started at buildStart, so Sass runs beside the bundle rather than after it; awaited where css/ is emitted.
  let pending: Promise<{ files: string[]; codes: string[] }> | undefined;
  return {
    name: 'ionic-global-css',
    apply: 'build', // the dev server never emitted css/, and must not start Sass
    buildStart() {
      const files = walk(join(src, 'css')).filter((f) => f.endsWith('.scss'));
      pending = Promise.all(files.map(compileGlobal)).then((codes) => ({ files, codes }));
      pending.catch(() => {}); // reported where it is awaited: a build that fails first must not leave it unhandled
    },
    async generateBundle() {
      const { files, codes } = await pending!;
      files.forEach((file, i) => {
        this.emitFile({ type: 'asset', fileName: `css/${relative(join(src, 'css'), file).replace(/\.scss$/, '.css')}`, source: codes[i] + '\n' });
      });
    },
    // The compiler process would keep the process alive: stopped when a build ends, and with the watcher in `--watch`.
    async closeBundle() {
      if (!this.meta.watchMode) await disposeCompiler();
    },
    async closeWatcher() {
      await disposeCompiler();
    },
  };
};

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
  // The dev server's watcher opens an fs.watch per file under migrated/ (slow on Windows). `stencil build` (npm run
  // build:stencil, in this folder) writes dist/ (types, collection) and .stencil/ there; the plugin's default also
  // skips www/, loader/ and hydrate/. `components/` is Stencil's standalone output folder (never source: that is src/).
  plugins: [stencilrs({ dts: process.env.IONIC_DTS === '1', watchIgnore: ['.stencil', '.stencil-standalone', 'www', 'dist', 'loader', 'hydrate', 'components'], css: { sass: { silenceDeprecations: [...silenceDeprecations] } }, verbose: true, buildFlags: { hydrateClientSide: false } }), globalCss()],
  build: {
    outDir: process.env.IONIC_OUT_DIR ?? join(here, 'dist-stencilrs'),
    emptyOutDir: true,
    minify: true,
    lib: { entry, formats: ['es'], fileName: 'ionic' },
    rollupOptions: { output: { assetFileNames: '[name][extname]' } },
  },
});
