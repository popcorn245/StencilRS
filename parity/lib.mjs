import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('.', import.meta.url));
export const fixturesDir = join(root, 'fixtures');
export const snapshotsDir = join(root, 'snapshots');

/**
 * The output modes `transpileSync` can be asked for, by `componentExport`. `customelement` is the
 * default (what @stencil/unplugin runs); `module` keeps the class exported and registers it with
 * `proxyCustomElement`; `null` is the lazy-loading (`loader-bundle`) shape, which `transpileSync`
 * only reaches through an explicit `null`. `ssr` is the hydrate (server-side rendering) shape:
 * Stencil never offers it through `transpileSync`, so `stencil.mjs` runs its `ssrComponentTransform`
 * with the server runtime as `coreImportPath`; stencilrs asks for `componentExport: 'ssr'`.
 * Each mode has its own snapshot folder.
 */
export const modes = {
  customelement: { componentExport: 'customelement', dir: 'snapshots' },
  module: { componentExport: 'module', dir: 'snapshots-module' },
  lazy: { componentExport: null, dir: 'snapshots-lazy' },
  ssr: {
    componentExport: null,
    ssrExport: 'ssr',
    dir: 'snapshots-ssr',
    extra: { coreImportPath: '@stencil/core/runtime/server' },
  },
  // @stencil/unplugin's `mode: 'spec-page'` (transform.ts): lazy output plus the compiler
  // metadata as `static get COMPILER_META()`, the core from `@stencil/core/testing`, no styles.
  specpage: {
    componentExport: null,
    dir: 'snapshots-specpage',
    extra: { componentMetadata: 'compilerstatic', coreImportPath: '@stencil/core/testing', style: null },
  },
};
/**
 * Fixtures a mode does not port yet: stencilrs reports a `stencilrs:` error for them (the cue to
 * compile with Stencil) instead of code. They are still compared on metadata, and counted apart.
 * Lazy and ssr output keep a decorated base class's static meta getters (`convertDecoratorsToStatic`),
 * which need the full `complexType` and docs metadata (#8).
 */
const lazyFallbacks = [
  'inheritance/bases/base-props.ts',
  'inheritance/bases/chain-middle.ts',
  'inheritance/bases/factories.ts',
  'inheritance/bases/mixins.ts',
  'inheritance/cmp-extends-same-file.tsx',
];
export const fallbacks = {
  lazy: new Set(lazyFallbacks),
  // Lazy output, so the same files.
  specpage: new Set(lazyFallbacks),
  ssr: new Set(lazyFallbacks),
};

export const snapshotsDirFor = (mode = 'customelement') => join(root, modes[mode].dir);

/** `--mode <name>` (or `--mode=<name>`) from a command line; customelement when absent. */
export const modeArg = (argv) => {
  const i = argv.findIndex((a) => a === '--mode' || a.startsWith('--mode='));
  if (i < 0) return 'customelement';
  const name = argv[i].includes('=') ? argv[i].split('=')[1] : argv[i + 1];
  if (!modes[name]) throw new Error(`unknown --mode ${name}; expected ${Object.keys(modes).join(', ')}`);
  return name;
};

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

/** Every fixture as { suite, rel, file, id }, sorted; `id` is the forward-slash path under fixtures/. */
export const listFixtures = (suiteFilter) =>
  readdirSync(fixturesDir)
    .filter((suite) => !suiteFilter || suite === suiteFilter)
    .flatMap((suite) =>
      walk(join(fixturesDir, suite))
        .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
        .map((file) => {
          const id = relative(fixturesDir, file).replaceAll('\\', '/');
          return { suite, id, file };
        }),
    )
    .sort((a, b) => a.id.localeCompare(b.id));

const IMPORTS_H_RE = /import\s*\{[^}]*\bh\b[^}]*\}\s*from\s*['"]@stencil\/core['"]/;

/**
 * The `inheritance` suite reads other files, so its fixtures compile under their absolute path
 * (snapshots replace it with FIXTURES, see `portable`). Files under `inheritance/bases/` are
 * base classes: @stencil/unplugin compiles those with `transformAsBaseClass`, the rest with a
 * `resolveImport` callback.
 */
const inheritance = (id) => id.startsWith('inheritance/');
const isBaseClass = (id) => id.startsWith('inheritance/bases/');
const absolute = (id) => join(fixturesDir, id).replaceAll('\\', '/');

/** unplugin's `resolveSpecifier` + `makeResolver` (unplugin/src/transform.ts), minus the cache. */
const SOURCE_EXTS = ['.tsx', '.ts', '.js'];
export const resolveImport = (specifier, importer) => {
  const base = resolve(dirname(importer), specifier);
  const candidates = [base, ...SOURCE_EXTS.map((ext) => base + ext)];
  if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.ts', base.slice(0, -3) + '.tsx');
  const found = candidates.find((c) => existsSync(c) && statSync(c).isFile());
  if (!found) return null;
  return { code: readFileSync(found, 'utf8'), path: found.replaceAll('\\', '/') };
};

/** Machine-independent text: the fixtures folder's absolute path becomes FIXTURES. */
export const portable = (text) => text.replaceAll(fixturesDir.replaceAll('\\', '/'), 'FIXTURES');

/**
 * The options @stencil/unplugin passes to transpileSync (unplugin/src/transform.ts:152-176):
 * classic `h` JSX when the file imports `h`, the automatic runtime otherwise.
 */
export const transpileOptions = (code, id, mode = 'customelement') => ({
  ...(IMPORTS_H_RE.test(code) ? { jsx: 2 } : { jsx: 4, jsxImportSource: '@stencil/core' }),
  file: inheritance(id) ? absolute(id) : id,
  componentExport: modes[mode].componentExport,
  ...modes[mode].extra,
  styleImportData: 'queryparams',
  ...(isBaseClass(id) ? { transformAsBaseClass: true } : inheritance(id) ? { resolveImport } : {}),
});

/** The same settings for stencilrs' `transpile()`. */
export const stencilrsOptions = (code, id, mode = 'customelement') => ({
  file: inheritance(id) ? absolute(id) : id,
  jsx: IMPORTS_H_RE.test(code) ? 'classic' : 'automatic',
  complexTypes: true,
  componentExport: modes[mode].ssrExport ?? modes[mode].componentExport,
  ...modes[mode].extra,
  ...(isBaseClass(id) ? { transformAsBaseClass: true } : {}),
});

/** Drop compiler-internal keys (`_astNode` and friends) so snapshots are plain data. */
export const plain = (value) => JSON.parse(JSON.stringify(value, (k, v) => (k.startsWith('_') ? undefined : v)));
