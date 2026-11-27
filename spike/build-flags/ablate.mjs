// usage: node ablate.mjs <root> [extra stencilrs opts JSON]
// Sets each default-true flag that folding turned off back to true, one at a time: the bytes it costs.
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const extra = JSON.parse(process.argv[3] ?? '{}');
process.chdir(root);
const req = createRequire(root + '/x.js');
const { default: stencilrs } = await import(pathToFileURL(req.resolve('@popcorn245/stencilrs/vite')).href);
const { build: vbuild } = await import(pathToFileURL(req.resolve('vite')).href);
const size = async (buildFlags) => {
  const r = await vbuild({ root, configFile: false, logLevel: 'silent', plugins: [stencilrs({ ...extra, foldRuntimeFlags: true, buildFlags })], build: { write: false } });
  const out = (Array.isArray(r) ? r[0] : r).output.filter((o) => o.type === 'chunk');
  return { raw: out.reduce((a, o) => a + o.code.length, 0), gz: out.reduce((a, o) => a + gzipSync(o.code, { level: 9 }).length, 0) };
};
const base = await size({});
console.log('folded', JSON.stringify(base));
const defaults = (await import(pathToFileURL(root + '/node_modules/@stencil/core/dist/app-data/index.js').href)).BUILD;
const res = [];
for (const k of Object.keys(defaults)) {
  if (typeof defaults[k] !== 'boolean') continue;
  const s = await size({ [k]: true }).catch(() => null);
  if (!s) continue;
  res.push([k, s.raw - base.raw, s.gz - base.gz]);
}
res.sort((a, b) => b[2] - a[2]);
for (const r of res.filter((r) => r[2] !== 0 || r[1] !== 0)) console.log(r.join('\t'));
