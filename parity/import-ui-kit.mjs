// Copies the old bucket ui-kit's Stencil 4 components into fixtures/ui-kit, migrated to v5.
//
//   node import-ui-kit.mjs J:/apps/@popcorn245/bucket/packages/ui-kit/src
//
// The only v4 → v5 change the ui-kit needs is @Component encapsulation:
//   shadow: true             → encapsulation: { type: 'shadow' }
//   scoped: true (no shadow) → encapsulation: { type: 'scoped' }
//   shadow: false / scoped: false → removed (v5 default is 'none')
// Same result as `stencil migrate` for these files; anything else is copied as-is.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) {
  console.error('usage: node import-ui-kit.mjs <ui-kit src dir>');
  process.exit(1);
}
const out = fileURLToPath(new URL('./fixtures/ui-kit/', import.meta.url));

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules') return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const migrate = (code, file) => {
  return code.replace(/@Component\(\{[\s\S]*?\}\)/, (block) => {
    const shadow = /\bshadow\s*:\s*true\b/.test(block);
    const scoped = /\bscoped\s*:\s*true\b/.test(block);
    if (shadow && scoped) throw new Error(`${file}: both shadow and scoped are true`);
    const type = shadow ? 'shadow' : scoped ? 'scoped' : null;

    let next = block
      .replace(/^[ \t]*(shadow|scoped)\s*:\s*(true|false)\s*,?[ \t]*\r?\n/gm, '')
      .replace(/\b(shadow|scoped)\s*:\s*(true|false)\s*,?\s*/g, '');
    if (type) {
      next = next.replace(/(tag\s*:\s*(['"])[^'"]+\2\s*,?)/, `$1\n  encapsulation: { type: '${type}' },`);
    }
    return next;
  });
};

rmSync(out, { recursive: true, force: true });
let count = 0;
for (const file of walk(src)) {
  if (!file.endsWith('.tsx') || file.endsWith('.spec.tsx') || file.endsWith('.stories.tsx')) continue;
  const code = readFileSync(file, 'utf8');
  if (!/@Component\s*\(/.test(code)) continue;
  const dest = join(out, relative(src, file));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, migrate(code, file));
  count++;
}
console.log(`imported ${count} components into fixtures/ui-kit`);
