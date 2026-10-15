// Write generated/custom-elements.json for Storybook's controls and docs tables, from
// stencilrs' own component metadata (build-accurate mode), for both component sets.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from '@popcorn245/stencilrs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const sets = ['examples/ui-kit/src', 'examples/starter/src'];
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

const tags = [];
for (const set of sets) {
  for (const file of walk(join(repo, set))) {
    if (!file.endsWith('.tsx') || /\.(spec|stories)\.tsx$/.test(file)) continue;
    const source = readFileSync(file, 'utf8');
    if (!/@Component\s*\(/.test(source)) continue;
    const rel = relative(repo, file).replace(/\\/g, '/');
    for (const c of analyze(source, file.replace(/\\/g, '/'), { resolveImports: true }).components) {
      tags.push({
        name: c.tagName,
        path: rel,
        attributes: c.properties
          .filter((p) => p.attribute)
          .map((p) => ({ name: p.attribute, type: p.complexTypeOriginal, default: p.defaultValue })),
        properties: c.properties.map((p) => ({ name: p.name, type: p.complexTypeOriginal, default: p.defaultValue })),
        events: c.events.map((e) => ({ name: e.name })),
      });
    }
  }
}

tags.sort((a, b) => a.name.localeCompare(b.name));
mkdirSync(fileURLToPath(new URL('../generated/', import.meta.url)), { recursive: true });
writeFileSync(new URL('../generated/custom-elements.json', import.meta.url), JSON.stringify({ version: 2, tags }, null, 2) + '\n');
console.log(`generated/custom-elements.json: ${tags.length} components (from stencilrs metadata)`);
