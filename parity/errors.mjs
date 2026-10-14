// Lists the error diagnostics Stencil v5 reported per fixture in snapshots/.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { listFixtures, snapshotsDir } from './lib.mjs';

for (const { id } of listFixtures(process.argv[2])) {
  const snap = JSON.parse(readFileSync(join(snapshotsDir, id.replace(/\.tsx?$/, '.json')), 'utf8'));
  const errors = snap.diagnostics.filter((d) => d.level === 'error');
  if (errors.length) console.log(`${id}\n  ${errors.map((e) => String(e.messageText).split('\n')[0]).join('\n  ')}`);
}
