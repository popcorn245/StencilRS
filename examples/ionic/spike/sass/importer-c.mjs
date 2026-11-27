// Lever C: does a custom importer that caches loaded partials' contents speed up sass-embedded over the Ionic component sheets?
//   node spike/sass/importer-c.mjs <sheets.txt> [rounds]
// Variants (interleaved, one compiler process each, concurrency 4 as the build runs it, first pass discarded):
//   builtin        no importer: the compiler process reads the files itself
//   importer-read  a JS importer (canonicalize + load, reads from disk on every load)
//   importer-cache a JS importer whose load() serves partial contents from a Map shared by all stylesheets
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass-embedded';

const [listFile, roundsArg] = process.argv.slice(2);
const rounds = +(roundsArg ?? 7);
const files = readFileSync(listFile, 'utf8').split('\n').filter(Boolean).filter((f) => !f.includes('/src/css/'));
const base = { silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'], logger: sass.Logger.silent };
const resolveFile = (p) => {
  const d = dirname(p), b = basename(p);
  for (const c of [p, join(d, `_${b}`)].flatMap((x) => [x, `${x}.scss`, join(dirname(x), `_${basename(x)}.scss`)].concat([])).concat([join(d, `_${b}.scss`)])) {
    if (/\.scss$/.test(c) && existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};
const makeImporter = (cache) => ({
  canonicalize(url, ctx) {
    if (url.startsWith('sass:')) return null;
    const from = ctx.containingUrl ? dirname(fileURLToPath(ctx.containingUrl)) : null;
    if (!from) return null;
    const f = resolveFile(join(from, url));
    return f ? pathToFileURL(f) : null;
  },
  load(canonical) {
    const f = fileURLToPath(canonical);
    let contents = cache?.get(f);
    if (contents === undefined) {
      contents = readFileSync(f, 'utf8');
      cache?.set(f, contents);
    }
    return { contents, syntax: 'scss' };
  },
});
const variants = {
  builtin: () => ({ ...base }),
  'importer-read': () => ({ ...base, importers: [makeImporter(null)] }),
  'importer-cache': (() => {
    const cache = new Map();
    return () => ({ ...base, importers: [makeImporter(cache)] });
  })(),
};
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pass = async (c, mk) => {
  const t = performance.now();
  let i = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (i < files.length) {
      const f = files[i++];
      await c.compileStringAsync(readFileSync(f, 'utf8'), { ...mk(), url: pathToFileURL(f), syntax: 'scss' });
    }
  }));
  return performance.now() - t;
};
// sanity: same CSS from all three on one sheet
{
  const c = await sass.initAsyncCompiler();
  const f = files.find((x) => x.includes('button.ios.scss'));
  const out = [];
  for (const k of Object.keys(variants)) out.push((await c.compileStringAsync(readFileSync(f, 'utf8'), { ...variants[k](), url: pathToFileURL(f), syntax: 'scss' })).css);
  console.log('button.ios.scss identical across variants:', out.every((x) => x === out[0]));
  await c.dispose();
}
const res = Object.fromEntries(Object.keys(variants).map((k) => [k, []]));
const comps = {};
for (const k of Object.keys(variants)) { comps[k] = await sass.initAsyncCompiler(); await pass(comps[k], variants[k]); }
for (let r = 0; r < rounds; r++) for (const k of Object.keys(variants)) res[k].push(await pass(comps[k], variants[k]));
for (const k of Object.keys(variants)) {
  await comps[k].dispose();
  console.log(`${k.padEnd(15)} median ${med(res[k]).toFixed(0)} ms (min ${Math.min(...res[k]).toFixed(0)}, max ${Math.max(...res[k]).toFixed(0)}) for ${files.length} component sheets, concurrency 4`);
}
