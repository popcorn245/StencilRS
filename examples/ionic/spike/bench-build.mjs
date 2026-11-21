// Cold `stencil build` of migrated/ per variant, interleaved, N rounds; prints wall seconds and the median.
//   node spike/bench-build.mjs [rounds] [variant,variant,...]
// Variants (need the patch applied, `node spike/patch-stencil.mjs`): stock | nomigrate | nocheck | nocheck+tsgo |
//   nocheck+tsgo+nomigrate | all (= nocheck+tsgo+nomigrate+rustpassb)
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { loadavg } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrated = resolve(root, 'migrated');
const rounds = +(process.argv[2] ?? 3);
const variants = (process.argv[3] ?? 'stock,nomigrate,nocheck,nocheck+tsgo,nocheck+tsgo+nomigrate,all').split(',');
const tsgo = resolve(root, 'node_modules/.bin/tsgo');
const rs = resolve(root, '../../index.js');
const envFor = (v) => {
  const e = {};
  if (v.includes('nomigrate') || v === 'all') e.SPIKE_SKIP_MIGRATE = '1';
  if (v.includes('nocheck') || v === 'all') e.SPIKE_NOCHECK = '1';
  if (v.includes('tsgo') || v === 'all') e.SPIKE_TSGO = tsgo;
  if (v.includes('rustpassb') || v === 'all') e.SPIKE_RUST_PASSB = rs;
  return e;
};
const res = {};
for (let r = 0; r < rounds; r++) {
  for (const v of variants) {
    rmSync(resolve(migrated, '.stencil'), { recursive: true, force: true });
    rmSync(resolve(migrated, 'dist'), { recursive: true, force: true });
    const out = resolve(root, 'dist-bench');
    rmSync(out, { recursive: true, force: true });
    const t0 = performance.now();
    const p = spawnSync(process.execPath, [resolve(root, 'node_modules/@stencil/cli/bin/stencil.mjs'), 'build'], {
      cwd: migrated,
      env: { ...process.env, IONIC_OUT_DIR: out, FORCE_COLOR: '0', ...envFor(v) },
      encoding: 'utf8',
      maxBuffer: 1 << 28,
    });
    const s = (performance.now() - t0) / 1000;
    const tail = (p.stdout + p.stderr).split('\n').filter((l) => /\[spike\]|build finished|ERROR|error/.test(l) && !/DEPRECATION/.test(l)).slice(-3).join(' | ');
    (res[v] ??= []).push(s);
    console.log(`round ${r + 1} ${v.padEnd(26)} exit=${p.status} ${s.toFixed(1)}s load1=${loadavg()[0].toFixed(1)}  ${tail.slice(0, 200)}`);
  }
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log('\nvariant                    median   min    max   (n)');
for (const [v, a] of Object.entries(res)) console.log(`${v.padEnd(26)} ${med(a).toFixed(1).padStart(6)} ${Math.min(...a).toFixed(1).padStart(6)} ${Math.max(...a).toFixed(1).padStart(6)}  (${a.length})`);
