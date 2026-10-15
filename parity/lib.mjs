import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('.', import.meta.url));
export const fixturesDir = join(root, 'fixtures');
export const snapshotsDir = join(root, 'snapshots');

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
export const transpileOptions = (code, id) => ({
  ...(IMPORTS_H_RE.test(code) ? { jsx: 2 } : { jsx: 4, jsxImportSource: '@stencil/core' }),
  file: inheritance(id) ? absolute(id) : id,
  componentExport: 'customelement',
  styleImportData: 'queryparams',
  ...(isBaseClass(id) ? { transformAsBaseClass: true } : inheritance(id) ? { resolveImport } : {}),
});

/** The same settings for stencilrs' `transpile()`. */
export const stencilrsOptions = (code, id) => ({
  file: inheritance(id) ? absolute(id) : id,
  jsx: IMPORTS_H_RE.test(code) ? 'classic' : 'automatic',
  ...(isBaseClass(id) ? { transformAsBaseClass: true } : {}),
});

/** Drop compiler-internal keys (`_astNode` and friends) so snapshots are plain data. */
export const plain = (value) => JSON.parse(JSON.stringify(value, (k, v) => (k.startsWith('_') ? undefined : v)));
