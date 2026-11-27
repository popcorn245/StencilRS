// dart-sass (sass-embedded) over the sheets the Ionic build compiles: timing, and the equivalence check against grass.
//   node spike/sass/dart-vs-grass.mjs <sheets.txt> <grass-out-dir> [rounds]
// grass-out-dir comes from `grass-bench <sheets.txt> <dir>` (<n>.css per sheet). Both sides are normalised with
// lightningcss (minify) before comparing; a sheet lightningcss rejects (scoped `::slotted(*) h1`) is compared after whitespace collapse.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sass from 'sass-embedded';
import { transform } from 'lightningcss';

const [listFile, grassDir, roundsArg] = process.argv.slice(2);
const rounds = +(roundsArg ?? 5);
const files = readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
const optsFor = (f) => ({ style: f.includes('/src/css/') ? 'compressed' : 'expanded', silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'], logger: sass.Logger.silent });
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const compileOne = (c, f) => c.compileAsync(f, optsFor(f));

// timing: one compiler process shared, steady state (first pass discarded as warm-up), concurrency 1 and 4; plus a fresh-process total (start + all sheets)
async function pass(c, conc) {
  const t = performance.now();
  let i = 0;
  await Promise.all(Array.from({ length: conc }, async () => { while (i < files.length) await compileOne(c, files[i++]); }));
  return performance.now() - t;
}
for (const conc of [1, 4]) {
  const c = await sass.initAsyncCompiler();
  await pass(c, conc);
  const runs = [];
  for (let r = 0; r < rounds; r++) runs.push(await pass(c, conc));
  await c.dispose();
  console.log(`sass-embedded steady state, concurrency ${conc}: median ${med(runs).toFixed(0)} ms (min ${Math.min(...runs).toFixed(0)}, max ${Math.max(...runs).toFixed(0)}) for ${files.length} sheets`);
}
{
  const runs = [];
  for (let r = 0; r < rounds; r++) {
    const t = performance.now();
    const c = await sass.initAsyncCompiler();
    await pass(c, 4);
    runs.push(performance.now() - t);
    await c.dispose();
  }
  console.log(`sass-embedded fresh compiler process (spawn + all sheets, concurrency 4): median ${med(runs).toFixed(0)} ms (min ${Math.min(...runs).toFixed(0)}, max ${Math.max(...runs).toFixed(0)})`);
}

// equivalence
const norm = (css, file) => {
  try {
    return transform({ filename: file, code: Buffer.from(css), minify: true }).code.toString();
  } catch {
    return 'WS:' + css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
  }
};
const c = await sass.initAsyncCompiler();
let same = 0, diff = 0, byteSame = 0;
const diffs = [];
for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const dart = (await compileOne(c, f)).css;
  const gf = join(grassDir, `${i}.css`);
  if (!existsSync(gf)) { diffs.push([i, f, 'grass failed']); diff++; continue; }
  const g = readFileSync(gf, 'utf8');
  if (g === dart) byteSame++;
  const a = norm(dart, f), b = norm(g, f);
  if (a === b) same++;
  else {
    diff++;
    let k = 0;
    while (k < a.length && a[k] === b[k]) k++;
    diffs.push([i, f, `first diff at ${k}: dart ...${a.slice(Math.max(0, k - 40), k + 80)} | grass ...${b.slice(Math.max(0, k - 40), k + 80)}`]);
    mkdirSync('/tmp/claude-0/diffs', { recursive: true });
    writeFileSync(`/tmp/claude-0/diffs/${i}.dart.css`, a);
    writeFileSync(`/tmp/claude-0/diffs/${i}.grass.css`, b);
  }
}
await c.dispose();
console.log(`equivalence after lightningcss minify: ${same} identical, ${diff} different, of ${files.length} (${byteSame} byte-identical before normalising)`);
for (const [i, f, why] of diffs.slice(0, 40)) console.log(`  #${i} ${f.split('/migrated/src/')[1]}: ${why.replace(/\n/g, ' ')}`);
