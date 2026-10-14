import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
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
 * The options @stencil/unplugin passes to transpileSync (unplugin/src/transform.ts:152-176):
 * classic `h` JSX when the file imports `h`, the automatic runtime otherwise.
 */
export const transpileOptions = (code, id) => ({
  ...(IMPORTS_H_RE.test(code) ? { jsx: 2 } : { jsx: 4, jsxImportSource: '@stencil/core' }),
  file: id,
  componentExport: 'customelement',
  styleImportData: 'queryparams',
});

/** The same settings for stencilrs' `transpile()`. */
export const stencilrsOptions = (code, id) => ({
  file: id,
  jsx: IMPORTS_H_RE.test(code) ? 'classic' : 'automatic',
});

/** Drop compiler-internal keys (`_astNode` and friends) so snapshots are plain data. */
export const plain = (value) => JSON.parse(JSON.stringify(value, (k, v) => (k.startsWith('_') ? undefined : v)));
