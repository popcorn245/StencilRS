// The `BUILD` flags `foldRuntimeFlags` computes from the ui-kit's 136 components (vite-fold.js) against Stencil's own: `stencil build` writes the
// flags it computed (`getBuildFeatures`) into collection/collection-manifest.json. Every component-derived flag must be identical.
//   node check-fold-flags.mjs        (npm run check:fold-flags; builds with Stencil first, ~20 s)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildFeatures, scanComponents } from '../../vite-fold.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const manifestFile = join(root, '.bench/fold-flags/collection/collection-manifest.json');
const built = spawnSync('npx', ['stencil', 'build', '--config', 'stencil.fold-flags.config.ts'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
if (!existsSync(manifestFile)) {
  console.error(`check-fold-flags: stencil build wrote no ${manifestFile}\n${built.stdout}\n${built.stderr}`);
  process.exit(1);
}
const theirs = JSON.parse(readFileSync(manifestFile, 'utf8')).buildFlags;
const { cmps, complete, problems } = await scanComponents(root, { dirs: [join(root, 'src')] });
const mine = buildFeatures(cmps);
const compared = Object.keys(theirs).filter((k) => k in mine);
const differences = compared.filter((k) => mine[k] !== theirs[k]);
console.log(`${cmps.length} components, ${compared.length} flags compared with Stencil's, ${problems.length} unreadable files, differences: ${JSON.stringify(differences)}`);
if (!complete || differences.length || compared.length < 40 || cmps.length < 100) {
  console.error(`check-fold-flags: FAILED ${problems.join('; ')}`);
  process.exit(1);
}
