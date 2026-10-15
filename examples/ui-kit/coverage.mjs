// Which ui-kit component files stencilrs compiles itself, and which fall back to Stencil (and why).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { transpile } from '@popcorn245/stencilrs';

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const H = /import\s*\{[^}]*\bh\b[^}]*\}\s*from\s*['"]@stencil\/core['"]/;

let compiled = 0;
const fallback = new Map();
for (const f of walk('src').filter((f) => f.endsWith('.tsx') && !f.includes('.spec.'))) {
  const code = readFileSync(f, 'utf8');
  if (!/@Component\s*\(/.test(code)) continue;
  const file = f.replace(/\\/g, '/');
  const r = transpile(code, { file, jsx: H.test(code) ? 'classic' : 'automatic' });
  const unported = r.diagnostics.filter((d) => d.message.startsWith('stencilrs:'));
  if (!unported.length) compiled++;
  for (const d of unported) fallback.set(d.message, [...(fallback.get(d.message) ?? []), file]);
}
const fellBack = new Set([...fallback.values()].flat()).size;
console.log(`stencilrs compiles ${compiled} component files; ${fellBack} fall back to Stencil's compiler`);
for (const [why, files] of fallback) console.log(`  ${files.length} × ${why}\n      ${files.join('\n      ')}`);
