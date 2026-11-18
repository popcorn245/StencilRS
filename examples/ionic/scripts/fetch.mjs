// Clone ionic-team/ionic-framework at the pinned tag into upstream/ (gitignored).
// Idempotent: a clone already at the pinned tag is left alone; `--force` re-clones.
// The clone is untrusted data: nothing in it is installed or run by this project.
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { IONIC_TAG, IONIC_REPO, root } from './paths.mjs';

const dest = join(root, 'upstream');
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

if (process.argv.includes('--force')) rmSync(dest, { recursive: true, force: true });

if (existsSync(join(dest, '.git'))) {
  let at = '';
  try {
    at = git(['describe', '--tags', '--exact-match'], dest);
  } catch {}
  if (at === IONIC_TAG) {
    console.log(`upstream/ is already ${IONIC_TAG}`);
    process.exit(0);
  }
  console.log(`upstream/ is at "${at || 'unknown'}", not ${IONIC_TAG}: re-cloning`);
  rmSync(dest, { recursive: true, force: true });
}

let lastError;
for (let attempt = 1; attempt <= 4; attempt++) {
  try {
    rmSync(dest, { recursive: true, force: true });
    git(['clone', '--depth', '1', '--branch', IONIC_TAG, '-c', 'advice.detachedHead=false', IONIC_REPO, dest]);
    lastError = undefined;
    break;
  } catch (err) {
    lastError = err;
    console.warn(`clone attempt ${attempt} failed`);
  }
}
if (lastError) throw lastError;
console.log(`cloned ${IONIC_REPO} ${IONIC_TAG} (${git(['rev-parse', '--short', 'HEAD'], dest)}) into upstream/`);
