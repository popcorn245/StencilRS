// One vite build of examples/ionic in a fresh process; prints JSON {wallMs, sass:{calls,unionMs,sumMs}, outHash}.
//   node spike/sass/run-build.mjs [--cold] [--out dir] [--env K=V ...]
import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync, readFileSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { tmpdir, loadavg } from 'node:os';

const root = resolve(import.meta.dirname, '../..');
const a = process.argv.slice(2);
const cold = a.includes('--cold');
const out = a.includes('--out') ? resolve(a[a.indexOf('--out') + 1]) : join(root, 'dist-spike');
const env = {};
a.forEach((x, i) => {
  if (a[i - 1] === '--env') {
    const [k, ...v] = x.split('=');
    env[k] = v.join('=');
  }
});
if (cold) for (const c of ['node_modules/.vite', 'node_modules/.cache/stencilrs', 'migrated/node_modules/.vite', 'migrated/node_modules/.cache/stencilrs']) rmSync(join(root, c), { recursive: true, force: true });
rmSync(out, { recursive: true, force: true });
const stats = join(mkdtempSync(join(tmpdir(), 'sassstats-')), 's.json');
const t0 = performance.now();
const p = spawnSync(process.execPath, ['--require', join(root, 'spike/sass/sass-shim.cjs'), join(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', join(root, 'vite.config.ts')], {
  cwd: root,
  env: { ...process.env, IONIC_OUT_DIR: out, FORCE_COLOR: '0', SASS_STATS: stats, ...env },
  encoding: 'utf8',
  maxBuffer: 1 << 28,
});
const wallMs = Math.round(performance.now() - t0);
const files = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? files(join(d, n)) : [join(d, n)])).sort();
const h = createHash('sha1');
let nf = 0;
try {
  for (const f of files(out)) {
    h.update(f.slice(out.length)).update(readFileSync(f));
    nf++;
  }
} catch {}
let sass = null;
try {
  sass = JSON.parse(readFileSync(stats, 'utf8'));
} catch {}
if (sass?.files && a.includes('--list')) writeFileSync(a[a.indexOf('--list') + 1], sass.files.join('\n') + '\n');
if (sass) delete sass.files;
console.log(JSON.stringify({ status: p.status, wallMs, sass, outHash: h.digest('hex'), files: nf, load1: +loadavg()[0].toFixed(1), err: p.status ? (p.stderr || p.stdout).slice(-400) : undefined }));
