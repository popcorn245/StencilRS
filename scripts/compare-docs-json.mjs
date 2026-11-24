// Compare the docs stencilrs builds (the Vite plugin's `docs`, see vite-project.js) with the docs-json of a real
// `stencil build` of the same project, member by member.
//
//   node scripts/compare-docs-json.mjs <project dir> <docs.json>
//
// The project is scanned from its working directory, as the plugin does. A component whose file still reports a
// `stencilrs:` diagnostic takes its metadata from Stencil's compiler (single-file, so lossier than a build) and is
// listed apart. Compared: what docs-json lists per component without the files it reads from disk (readme, usage)
// or from the whole build (dependents, dependencies): path, encapsulation, docs, props, methods, events, listeners,
// styles, slots, parts, deprecation. Exits 1 if a component stencilrs computed differs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [dirArg, docsArg] = process.argv.slice(2);
if (!dirArg || !docsArg) {
  console.error('usage: node scripts/compare-docs-json.mjs <project dir> <docs.json>');
  process.exit(2);
}
const dir = resolve(dirArg);
process.chdir(dir);
const { createProject } = await import(new URL('../vite-project.js', import.meta.url));
const project = createProject({ stencil: { docs: true }, root: dir, resolveImports: true });
await project.start();
if (project.unsupported) {
  console.error(`unsupported: ${project.unsupported}`);
  process.exit(2);
}
const oracle = new Map(JSON.parse(readFileSync(resolve(docsArg), 'utf8')).components.map((c) => [c.tag, c]));
const fallback = new Set([...project.fallbackFiles].map((f) => f.replace(`${dir}/`, '')));
const FIELDS = ['filePath', 'encapsulation', 'tag', 'docs', 'docsTags', 'props', 'methods', 'events', 'listeners', 'styles', 'slots', 'parts', 'deprecation'];
let identical = 0;
const different = [];
const viaStencil = [];
const missing = [];
for (const c of project.docsComponents()) {
  const o = oracle.get(c.tag);
  if (!o) {
    missing.push(c.tag); // internal components are not in docs-json
    continue;
  }
  if (fallback.has(c.filePath)) {
    viaStencil.push(c.tag);
    continue;
  }
  const fields = FIELDS.filter((f) => JSON.stringify(c[f]) !== JSON.stringify(o[f]));
  if (fields.length) different.push(`${c.tag} (${fields.join(', ')})`);
  else identical++;
}
console.log(`${identical} components identical to docs-json, ${different.length} different, ${viaStencil.length} from Stencil's compiler (a file with a \`stencilrs:\` diagnostic), ${missing.length} not in docs-json (${missing.join(', ')})`);
for (const d of different) console.log(`  different: ${d}`);
if (viaStencil.length) console.log(`  from Stencil's compiler: ${viaStencil.join(', ')}`);
process.exit(different.length ? 1 : 0);
