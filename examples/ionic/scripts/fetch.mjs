// Clone ionic-team/ionic-framework at the pinned tag into upstream/ (gitignored).
// Idempotent: a clone already at the pinned tag is left alone; `--force` re-clones.
// IONIC_UPSTREAM_CACHE=<dir> keeps a copy of the clone outside the workspace (CI caches it): upstream/ is
// restored from there when it holds the pinned tag, and the cache is filled after a fresh clone.
// The clone is untrusted data: nothing in it is installed or run by this project.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { IONIC_TAG, IONIC_REPO, root } from './paths.mjs';

const dest = join(root, 'upstream');
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

const cache = process.env.IONIC_UPSTREAM_CACHE;
const tagOf = (dir) => {
  try {
    return git(['describe', '--tags', '--exact-match'], dir);
  } catch {
    return '';
  }
};

if (process.argv.includes('--force')) rmSync(dest, { recursive: true, force: true });
else if (cache && !existsSync(join(dest, '.git')) && existsSync(join(cache, '.git')) && tagOf(cache) === IONIC_TAG) {
  cpSync(cache, dest, { recursive: true });
  console.log(`restored upstream/ (${IONIC_TAG}) from ${cache}`);
}

if (existsSync(join(dest, '.git'))) {
  let at = '';
  try {
    at = git(['describe', '--tags', '--exact-match'], dest);
  } catch {}
  if (at === IONIC_TAG) {
    console.log(`upstream/ is already ${IONIC_TAG}`);
    if (cache && !existsSync(join(cache, '.git'))) {
      mkdirSync(dirname(cache), { recursive: true });
      cpSync(dest, cache, { recursive: true });
      console.log(`cached it in ${cache}`);
    }
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
if (cache) {
  rmSync(cache, { recursive: true, force: true });
  mkdirSync(dirname(cache), { recursive: true });
  cpSync(dest, cache, { recursive: true });
}
console.log(`cloned ${IONIC_REPO} ${IONIC_TAG} (${git(['rev-parse', '--short', 'HEAD'], dest)}) into upstream/`);
