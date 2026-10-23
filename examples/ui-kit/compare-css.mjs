// Component CSS: stencilrs' Vite plugin against @stencil/unplugin, byte for byte.
//
//   node compare-css.mjs [--verbose]
//
// Every stylesheet import the ui-kit's and the starter's components compile to, plus each one
// under every encapsulation and mode, goes through both plugins' `resolveId` and `load`, with
// dev and production settings. The virtual ids and the generated modules must be identical.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { transpile } from '@popcorn245/stencilrs';
import stencilrs from '@popcorn245/stencilrs/vite';
import { stencilVite } from '@stencil/unplugin';

const verbose = process.argv.includes('--verbose');
const here = fileURLToPath(new URL('.', import.meta.url));
const projects = [here, join(here, '../starter')];

const walk = (d) => readdirSync(d).flatMap((n) => (n === 'node_modules' ? [] : statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

// [importer, specifier] of every component stylesheet import, as stencilrs compiles them.
const imports = new Map();
for (const project of projects) {
  for (const file of walk(join(project, 'src')).filter((f) => f.endsWith('.tsx') && !/\.(spec|stories)\.tsx$/.test(f))) {
    const code = readFileSync(file, 'utf8');
    if (!/@Component\b/.test(code)) continue;
    const out = transpile(code, { file, componentExport: 'customelement', styleImportData: 'queryparams' });
    for (const m of out.code.matchAll(/from\s+["']([^"']+\?[^"']*\btag=[^"']*)["']/g)) imports.set(`${file}\0${m[1]}`, [file, m[1]]);
  }
}
if (!imports.size) throw new Error('no stylesheet imports found');

// Every stylesheet in every encapsulation and mode, whatever the component uses.
const cases = new Map(imports);
for (const [file, spec] of imports.values()) {
  const [path, query] = spec.split('?');
  const tag = new URLSearchParams(query).get('tag');
  for (const enc of ['scoped', 'shadow', 'none']) {
    for (const mode of [null, 'ios', 'md']) {
      const s = `${path}?tag=${tag}&encapsulation=${enc}${mode ? `&mode=${mode}` : ''}`;
      cases.set(`${file}\0${s}`, [file, s]);
    }
  }
}
// A stylesheet that does not exist, and one without an encapsulation.
const [firstFile, firstSpec] = [...imports.values()][0];
cases.set('missing', [firstFile, './does-not-exist.css?tag=x-y&encapsulation=scoped']);
cases.set('bare', [firstFile, `${firstSpec.split('?')[0]}?tag=x-y`]);

const hook = (p, name) => (typeof p[name] === 'function' ? p[name] : p[name]?.handler);
const ctx = { addWatchFile() {}, error: (e) => { throw new Error(String(e)); }, warn() {}, info() {} };

let failures = 0;
for (const dev of [false, true]) {
  const command = dev ? 'serve' : 'build';
  const mine = stencilrs({ dev })[0];
  const theirs = [stencilVite({ dev })].flat().find((p) => p.name === '@stencil/unplugin');
  for (const p of [mine, theirs]) p.configResolved?.({ command, root: here });
  const run = async (p, file, spec) => {
    const id = await hook(p, 'resolveId').call(ctx, spec, file);
    const loaded = id && (await hook(p, 'load').call(ctx, id));
    return { id, code: loaded?.code ?? null };
  };
  let n = 0;
  let bytes = 0;
  for (const [file, spec] of cases.values()) {
    const [a, b] = [await run(mine, file, spec), await run(theirs, file, spec)];
    n++;
    bytes += b.code?.length ?? 0;
    if (a.id !== b.id || a.code !== b.code || a.code === null) {
      failures++;
      console.log(`DIFF (${command}) ${file} ${spec}`);
      if (verbose) console.log(`  stencilrs : ${JSON.stringify(a).slice(0, 300)}\n  unplugin  : ${JSON.stringify(b).slice(0, 300)}`);
    }
  }
  console.log(`${command}: ${n} stylesheet modules (${(bytes / 1024).toFixed(0)} KB) compared`);
}
if (failures) {
  console.error(`${failures} difference(s)`);
  process.exit(1);
}
console.log('component CSS identical to @stencil/unplugin');
