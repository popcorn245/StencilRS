// Refresh fixtures/ui-kit from the v5 ui-kit project (examples/ui-kit/src): every component
// file, as committed there (migrated to v5 and building cleanly with `stencil build`).
//
//   node import-ui-kit.mjs
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../examples/ui-kit/src/', import.meta.url));
const out = fileURLToPath(new URL('./fixtures/ui-kit/', import.meta.url));

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

rmSync(out, { recursive: true, force: true });
let count = 0;
for (const file of walk(src)) {
  if (!file.endsWith('.tsx') || /\.(spec|stories)\.tsx$/.test(file)) continue;
  if (!/@Component\s*\(/.test(readFileSync(file, 'utf8'))) continue;
  const dest = join(out, relative(src, file));
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(file, dest);
  count++;
}
console.log(`fixtures/ui-kit: ${count} components from examples/ui-kit/src`);
