// One-time import of the old bucket ui-kit (Stencil 4) into this project, migrated to Stencil v5.
// The result is committed and has since been fixed by hand for a clean `stencil build`:
// re-running this overwrites src/, styles/ and vendor/.
//
//   node import.mjs [path to the bucket repo]   (default J:/apps/@popcorn245/bucket)
//
// Copies packages/ui-kit/src → src/ and the two internal packages it uses
// (cards-core, floorplan-core) → vendor/. Skips stories and Playwright e2e files.
// Migrations, applied to every component file:
//   1. `shadow` / `scoped` → `encapsulation: { type }` (removed in v5)
//   2. `@Method() async name(...) {` with no return type → `: Promise<any>`
//      (v5 rejects unannotated async methods when compiling a single file; see docs/quirks.md)
// The ui-kit's mock `newSpecPage` (test-utils/spec-page.ts) is replaced by harness/spec-page.ts,
// which mounts the real compiled custom elements.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const bucket = process.argv[2] ?? 'J:/apps/@popcorn245/bucket';
const here = fileURLToPath(new URL('.', import.meta.url));

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === 'node_modules') return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const SKIP = [/\.stories\.tsx?$/, /\.e2e\.tsx?$/, /[\\/]test-utils[\\/]spec-page\.ts$/];
const TEXT = /\.(tsx?|css|scss|json|md|svg|html|js|mjs)$/;

const migrateEncapsulation = (code, file) =>
  code.replace(/@Component\(\{[\s\S]*?\}\)/, (block) => {
    const shadow = /\bshadow\s*:\s*true\b/.test(block);
    const scoped = /\bscoped\s*:\s*true\b/.test(block);
    if (shadow && scoped) throw new Error(`${file}: both shadow and scoped are true`);
    const type = shadow ? 'shadow' : scoped ? 'scoped' : null;
    let next = block
      .replace(/^[ \t]*(shadow|scoped)\s*:\s*(true|false)\s*,?[ \t]*\r?\n/gm, '')
      .replace(/\b(shadow|scoped)\s*:\s*(true|false)\s*,?\s*/g, '');
    if (type) next = next.replace(/(tag\s*:\s*(['"])[^'"]+\2\s*,?)/, `$1\n  encapsulation: { type: '${type}' },`);
    return next;
  });

/** Add `: Promise<any>` to `@Method() async name(...)` declarations that have no return type. */
const annotateAsyncMethods = (code) => {
  let out = '';
  let pos = 0;
  const re = /@Method\(\s*\)\s*(?:public\s+)?async\s+[A-Za-z_$][\w$]*\s*\(/g;
  let m;
  let count = 0;
  while ((m = re.exec(code))) {
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < code.length && depth > 0) {
      const c = code[i++];
      if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    let j = i;
    while (/\s/.test(code[j])) j++;
    if (code[j] === '{') {
      out += code.slice(pos, i) + ': Promise<any>';
      pos = i;
      count++;
    }
  }
  return { code: out + code.slice(pos), count };
};

const copyTree = (from, to, transform) => {
  rmSync(to, { recursive: true, force: true });
  let files = 0;
  for (const file of walk(from)) {
    if (SKIP.some((re) => re.test(file))) continue;
    const dest = join(to, relative(from, file));
    mkdirSync(dirname(dest), { recursive: true });
    if (TEXT.test(file)) {
      let text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      if (transform) text = transform(text, file);
      writeFileSync(dest, text);
    } else {
      copyFileSync(file, dest);
    }
    files++;
  }
  return files;
};

let annotated = 0;
const src = copyTree(join(bucket, 'packages/ui-kit/src'), join(here, 'src'), (text, file) => {
  if (!file.endsWith('.tsx') || !/@Component\s*\(/.test(text)) return text;
  const { code, count } = annotateAsyncMethods(migrateEncapsulation(text, file));
  annotated += count;
  return code;
});
mkdirSync(join(here, 'src/test-utils'), { recursive: true });
copyFileSync(join(here, 'harness/spec-page.ts'), join(here, 'src/test-utils/spec-page.ts'));

copyTree(join(bucket, 'packages/ui-kit/styles'), join(here, 'styles'));
const vendor = ['cards-core', 'floorplan-core'].map((p) => copyTree(join(bucket, 'packages', p, 'src'), join(here, 'vendor', p)));

console.log(`src/: ${src} files · vendor/: ${vendor.join(' + ')} files · ${annotated} async @Method() annotated`);
