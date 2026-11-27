// A tiny Stencil project for the islands tests: two components (one shadow with an event handler, one scoped with a slot),
// built both ways: the hydrate app (`buildHydrate`) and a client bundle that hydrates what the app rendered.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

import { buildHydrate } from '../../../ssr.js';
import stencilrs from '../../../vite.js';

export const root = dirname(fileURLToPath(import.meta.url));

export const buildHydrateApp = (outDir, options = {}) => buildHydrate({ root, outDir, namespace: 'isl', logLevel: 'error', ...options });

export const buildClient = async (outDir) => {
  const entry = join(outDir, '.entry.mjs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(entry, readdirSync(join(root, 'src')).filter((f) => f.endsWith('.tsx')).map((f) => `import ${JSON.stringify(join(root, 'src', f))};`).join('\n') + '\n');
  await build({ root, configFile: false, logLevel: 'error', plugins: [stencilrs()], build: { outDir, emptyOutDir: false, lib: { entry, formats: ['es'], fileName: 'components' } } });
  return join(outDir, 'components.js');
};

/** Page markup of the islands tests: a shell around two islands (marker comments are left in the shell). */
export const ISLAND_A = '<isl-counter label="A" count="1"><isl-tag tone="loud">alpha</isl-tag> <isl-tag>one</isl-tag></isl-counter>';
export const ISLAND_B = '<isl-counter label="B" count="5"><isl-tag>beta</isl-tag></isl-counter>';
export const SHELL = (a, b) => `<h1>Islands</h1>\n<section id="a">${a}</section>\n<section id="b">${b}</section>\n<footer>end</footer>`;
