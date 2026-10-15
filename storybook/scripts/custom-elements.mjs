// Write generated/custom-elements.json for Storybook's controls and docs tables, from
// stencilrs' own component metadata (build-accurate mode), for both component sets.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from '@popcorn245/stencilrs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const sets = ['examples/ui-kit/src', 'examples/starter/src'];
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

// Custom Elements Manifest schema 1.0.0: one module per component file. Props are listed as
// members only, not also as attributes, so Storybook shows one control per prop (stories set
// props by name).
const modules = [];
for (const set of sets) {
  for (const file of walk(join(repo, set))) {
    if (!file.endsWith('.tsx') || /\.(spec|stories)\.tsx$/.test(file)) continue;
    const source = readFileSync(file, 'utf8');
    if (!/@Component\s*\(/.test(source)) continue;
    const path = relative(repo, file).replace(/\\/g, '/');
    const declarations = analyze(source, file.replace(/\\/g, '/'), { resolveImports: true }).components.map((c) => ({
      kind: 'class',
      customElement: true,
      name: c.componentClassName,
      tagName: c.tagName,
      members: [
        ...c.properties.map((p) => ({
          kind: 'field',
          name: p.name,
          type: { text: p.complexTypeOriginal },
          ...(p.defaultValue !== undefined && { default: p.defaultValue }),
          ...(p.attribute && { attribute: p.attribute }),
          ...(p.reflect && { reflects: true }),
        })),
        ...c.methods.map((m) => ({ kind: 'method', name: m.name })),
      ],
      events: c.events.map((e) => ({ name: e.name })),
    }));
    if (declarations.length) modules.push({ kind: 'javascript-module', path, declarations });
  }
}

modules.sort((a, b) => a.declarations[0].tagName.localeCompare(b.declarations[0].tagName));
const count = modules.reduce((n, m) => n + m.declarations.length, 0);
mkdirSync(fileURLToPath(new URL('../generated/', import.meta.url)), { recursive: true });
writeFileSync(new URL('../generated/custom-elements.json', import.meta.url), JSON.stringify({ schemaVersion: '1.0.0', modules }, null, 2) + '\n');
console.log(`generated/custom-elements.json: ${count} components (from stencilrs metadata)`);
