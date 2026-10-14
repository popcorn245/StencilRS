// Golden output: compile every fixture with real Stencil v5 and write snapshots/.
//
//   node snapshot.mjs [suite]
//
// For each fixture `fixtures/<suite>/<path>.tsx`:
//   snapshots/<suite>/<path>.js    the code transpileSync emits
//   snapshots/<suite>/<path>.json  component metadata, diagnostics and imports
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { transpileSync, versions } from '@stencil/core/compiler';

import { listFixtures, plain, snapshotsDir, transpileOptions } from './lib.mjs';

const suite = process.argv[2];
const fixtures = listFixtures(suite);
if (suite) rmSync(join(snapshotsDir, suite), { recursive: true, force: true });
else rmSync(snapshotsDir, { recursive: true, force: true });

let errors = 0;
for (const { id, file } of fixtures) {
  const code = readFileSync(file, 'utf8');
  const result = transpileSync(code, transpileOptions(code, id));
  const base = join(snapshotsDir, id.replace(/\.tsx?$/, ''));
  mkdirSync(dirname(base), { recursive: true });
  writeFileSync(`${base}.js`, result.code);
  writeFileSync(
    `${base}.json`,
    JSON.stringify(
      {
        data: plain(result.data ?? []),
        diagnostics: result.diagnostics.map((d) => ({ level: d.level, messageText: d.messageText })),
        imports: result.imports ?? [],
      },
      null,
      2,
    ) + '\n',
  );
  if (result.diagnostics.some((d) => d.level === 'error')) errors++;
}

writeFileSync(
  join(snapshotsDir, 'manifest.json'),
  JSON.stringify(
    {
      stencil: versions.stencil,
      typescript: versions.typescript,
      options: transpileOptions('', '<file>'),
      fixtures: listFixtures().length,
    },
    null,
    2,
  ) + '\n',
);
console.log(`stencil ${versions.stencil} (typescript ${versions.typescript}): ${fixtures.length} fixtures, ${errors} with errors`);
