// Lever A, invalidation correctness: edit a stylesheet / a shared partial, rebuild with the warm disk cache, compare
// the output byte-for-byte with a cold (no cache) build of the same edited tree; count the Sass compiles the edit caused.
//   node spike/sass/inval-a.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const src = join(here, '../../migrated/src');
const run = (...args) => JSON.parse(spawnSync(process.execPath, [join(here, 'run-build.mjs'), ...args], { encoding: 'utf8' }).stdout);
const edits = [
  ['component sheet (button.ios.scss, output changes)', 'components/button/button.ios.scss', '\n:host{--spike-edit:1}\n'],
  ['component partial (button.scss, output changes)', 'components/button/button.scss', '\n:host{--spike-edit:2}\n'],
  ['shared Ionic partial (ionic.mixins.scss, output unchanged: a variable)', 'themes/ionic.mixins.scss', '\n$spike-unused: 1;\n'],
  ['shared Ionic partial (ionic.globals.scss, output unchanged: a variable)', 'themes/ionic.globals.scss', '\n$spike-unused2: 1;\n'],
];
run('--cold'); // populate
const base = run();
console.log('baseline warm', base.wallMs, 'ms, sass calls', base.sass.calls, base.outHash.slice(0, 8));
for (const [name, rel, add] of edits) {
  const f = join(src, rel);
  const orig = readFileSync(f, 'utf8');
  try {
    run(); // warm, unedited
    writeFileSync(f, orig + add);
    const cached = run();
    const again = run();
    const cold = run('--cold');
    writeFileSync(f, orig);
    const back = run();
    console.log(`${name}\n  cached after edit: ${cached.sass.calls} recompiles, ${cached.wallMs} ms, ${cached.outHash.slice(0, 8)} | 2nd: ${again.sass.calls} recompiles ${again.outHash.slice(0, 8)} | cold(no cache): ${cold.sass.calls} compiles ${cold.wallMs} ms ${cold.outHash.slice(0, 8)} | identical to no-cache: ${cached.outHash === cold.outHash} | output changed vs baseline: ${cached.outHash !== base.outHash} | restored == baseline: ${back.outHash === base.outHash} (${back.sass.calls} recompiles)`);
  } finally {
    writeFileSync(f, orig);
  }
}
