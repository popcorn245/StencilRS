// The spike's pages as engine views (issue #191): the template with each island's markup written inside its `<stencil-island>`
// marker, written to files an Express engine renders. `full` is the same page without the markers (what the engine renders today).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PAGES } from './lib.mjs';

const MARKER = /<stencil-island name="([^"]+)"><\/stencil-island>/g;

export const islandView = (page, client = {}) => page.template.replace(MARKER, (_, name) => `<stencil-island name="${name}"${client[name] ? ` client="${client[name]}"` : ''}>${page.islands[name]}</stencil-island>`);

/** Writes `<name>.html` (with islands) and `<name>.full.html` (the same page, no markers) of every page; returns the directory. */
export const writeViews = (names = Object.keys(PAGES)) => {
  const dir = mkdtempSync(join(tmpdir(), 'islands-views-'));
  mkdirSync(dir, { recursive: true });
  for (const name of names) {
    writeFileSync(join(dir, `${name}.html`), islandView(PAGES[name]));
    writeFileSync(join(dir, `${name}.full.html`), PAGES[name].full());
  }
  return dir;
};
