// Makes sure Ionic's migrated Stencil v5 source exists (examples/ionic/migrated), fetching and
// migrating it when it does not. Ionic's source is never committed (THIRD_PARTY_NOTICES.md), so the
// site build gets it the way examples/ionic does: `npm run fetch && npm run migrate`.
// Run as a script (`node scripts/ionic-source.mjs`, the site's `prepare:ionic`) or import ensureIonic().
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ionicDir = fileURLToPath(new URL('../../examples/ionic', import.meta.url)).replace(/[\\/]$/, '');
export const migrated = `${ionicDir}/migrated`;
export const docsJsonFile = `${ionicDir}/dist-stencil/docs.json`;

const run = (...args) => execFileSync('npm', ['--prefix', ionicDir, ...args], { stdio: 'inherit' });

export function ensureIonic({ docsJson = false } = {}) {
  const t0 = performance.now();
  let did = false;
  // The tools (stencil migrate, Sass, ionicons, @capacitor/*) and the source's own imports resolve here.
  if (!existsSync(`${ionicDir}/node_modules/.bin/stencil`)) { run('ci', '--ignore-scripts', '--no-audit', '--no-fund'); did = true; }
  if (!existsSync(`${ionicDir}/upstream/core/src`)) { run('run', 'fetch'); did = true; }
  if (!existsSync(`${migrated}/stencil.config.ts`)) { run('run', 'migrate'); did = true; }
  // Stencil's own docs-json is only the reference of `gen:components`, never of the site build.
  if (docsJson && !existsSync(docsJsonFile)) { run('run', 'build:stencil'); did = true; }
  if (did) console.log(`ionic-source: prepared examples/ionic in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  return did;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) ensureIonic({ docsJson: process.argv.includes('--docs-json') });
