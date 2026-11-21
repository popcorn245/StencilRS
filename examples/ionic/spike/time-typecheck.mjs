// Time `tsc --noEmit` vs `tsgo --noEmit` on migrated/tsconfig.json. usage: node time-typecheck.mjs [runs]
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadavg } from 'node:os';
const root = resolve(import.meta.dirname, '..');
const cwd = resolve(root, 'migrated');
const runs = +(process.argv[2] ?? 5);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = {};
for (const tool of ['tsc', 'tsgo', 'tsc', 'tsgo']) {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, [resolve(root, 'node_modules/.bin', tool), '--noEmit', '-p', 'tsconfig.json', ...(process.env.TS_EXTRA ?? '').split(' ').filter(Boolean)], { cwd, encoding: 'utf8' });
  const s = (performance.now() - t0) / 1000;
  (out[tool] ??= []).push(s);
  const lines = (r.stdout + r.stderr).split('\n').filter((l) => /error TS/.test(l));
  console.log(`${tool} exit=${r.status} ${s.toFixed(2)}s errors=${lines.length} load1=${loadavg()[0].toFixed(1)}`);
  if (out[tool].length >= runs) break;
}
// remaining runs interleaved
for (let i = 0; i < runs * 2; i++) {
  for (const tool of ['tsc', 'tsgo']) {
    if ((out[tool]?.length ?? 0) >= runs) continue;
    const t0 = performance.now();
    const r = spawnSync(process.execPath, [resolve(root, 'node_modules/.bin', tool), '--noEmit', '-p', 'tsconfig.json', ...(process.env.TS_EXTRA ?? '').split(' ').filter(Boolean)], { cwd, encoding: 'utf8' });
    const s = (performance.now() - t0) / 1000;
    (out[tool] ??= []).push(s);
    const n = (r.stdout + r.stderr).split('\n').filter((l) => /error TS/.test(l)).length;
    console.log(`${tool} exit=${r.status} ${s.toFixed(2)}s errors=${n} load1=${loadavg()[0].toFixed(1)}`);
  }
}
for (const [k, v] of Object.entries(out)) console.log(`${k}: median ${median(v).toFixed(2)}s min ${Math.min(...v).toFixed(2)} max ${Math.max(...v).toFixed(2)} (n=${v.length})`);
