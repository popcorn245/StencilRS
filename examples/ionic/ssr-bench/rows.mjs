// The rows of bench-ssr.mjs, as data: a row is a hydrate app (an ES module exporting `renderToString`) and where it
// comes from. Adding a row is adding an entry. `--row id=<path>` overrides the path of one on the command line.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

export const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

export const ROWS = [
  {
    id: 'ionic-published',
    label: '@ionic/core 9.0.12 hydrate from npm (built by Ionic with Stencil 4)',
    // the package's own ESM entry, whatever the folder layout
    path: () => join(dirname(createRequire(import.meta.url).resolve('@ionic/core/hydrate/package.json')), 'index.mjs'),
    missing: 'run `npm ci --ignore-scripts` in examples/ionic',
  },
  {
    id: 'stencil5',
    label: 'Stencil 5 hydrate app (`stencil build`, { type: \'ssr\' }) of the migrated Ionic source',
    path: () => join(root, 'dist/hydrate-stencil/index.js'),
    missing: 'run `npm run fetch && npm run migrate && npm run build:ssr`',
  },
  {
    id: 'stencilrs',
    label: 'hydrate app built from stencilrs output (issue #128)',
    path: () => join(root, 'dist/hydrate-stencilrs/index.js'),
    missing: 'not built yet (the stencilrs Ionic hydrate build is issue #128)',
  },
];

/** Resolve the rows to run: `overrides` is { id: path }. Returns { id, label, file } for each, file null when absent. */
export const resolveRows = (ids, overrides = {}) =>
  ROWS.filter((r) => !ids || ids.includes(r.id)).map((r) => {
    const file = overrides[r.id] ?? r.path();
    return { id: r.id, label: r.label, file: existsSync(file) ? file : null, expected: file, missing: r.missing };
  });
