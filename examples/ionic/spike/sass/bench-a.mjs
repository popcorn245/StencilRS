// Lever A: cold (empty Sass disk cache) vs warm (cache kept) fresh-process vite builds, interleaved, n rounds.
//   node spike/sass/bench-a.mjs [rounds]
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const here = import.meta.dirname;
const rounds = +(process.argv[2] ?? 8);
const run = (...args) => JSON.parse(spawnSync(process.execPath, [join(here, 'run-build.mjs'), ...args], { encoding: 'utf8' }).stdout);
const res = { cold: [], warm: [] };
for (let i = 0; i < rounds; i++) {
  for (const v of ['cold', 'warm']) {
    const r = run(...(v === 'cold' ? ['--cold'] : []));
    res[v].push(r);
    console.log(i + 1, v, r.wallMs, JSON.stringify(r.sass), r.outHash.slice(0, 8), 'load', r.load1);
  }
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const v of ['cold', 'warm']) {
  const w = res[v].map((r) => r.wallMs);
  const s = res[v].map((r) => r.sass?.unionMs ?? 0);
  console.log(v.padEnd(5), 'wall', med(w), `(${Math.min(...w)}-${Math.max(...w)})`, 'sass union', med(s), `(${Math.min(...s)}-${Math.max(...s)})`, 'distinct output hashes', new Set(res[v].map((r) => r.outHash)).size);
}
