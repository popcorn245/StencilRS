// A union TypeScript orders by which member it met first (the whole program) is left to Stencil's compiler, unless the
// tsconfig sets `"stableTypeOrdering": true`. The plugin says so once, on one line (vite-hint.js).
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { build } from 'vite';

import { analyze } from '../index.js';
import stencilrs from '../vite.js';
import { createUnionOrderHint, isUnionOrderFallback } from '../vite-hint.js';

const require = createRequire(import.meta.url);
// TypeScript is CommonJS: if anything loaded it, it is in the module cache.
const typescriptLoaded = () => Object.keys(require.cache).some((f) => /[\\/]node_modules[\\/]typescript[\\/]/.test(f));

const root = mkdtempSync(join(tmpdir(), 'stencilrs-union-order-'));
after(() => rmSync(root, { recursive: true, force: true }));

const types = `export interface Cat { meow: string }\nexport interface Dog { bark: string }\n`;
const component = (tag, cls) => `import { Component, Method, h } from '@stencil/core';
import type { Cat, Dog } from './types';
@Component({ tag: '${tag}' })
export class ${cls} {
  @Method() async pet(animal: Cat | Dog): Promise<void> { void animal; }
  render() { return <div>${tag}</div>; }
}
`;
const tsconfig = (stable) => JSON.stringify({ compilerOptions: { strict: true, jsx: 'react', jsxFactory: 'h', useDefineForClassFields: false, ...(stable ? { stableTypeOrdering: true } : {}) } });

/** A project with two components that have such a union, with the option on or off. */
const makeProject = (name, stable) => {
  const dir = join(root, name);
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'tsconfig.json'), tsconfig(stable));
  writeFileSync(join(dir, 'src', 'types.ts'), types);
  writeFileSync(join(dir, 'src', 'one.tsx'), component('cmp-one', 'CmpOne'));
  writeFileSync(join(dir, 'src', 'two.tsx'), component('cmp-two', 'CmpTwo'));
  writeFileSync(join(dir, 'src', 'entry.ts'), `import './one';\nimport './two';\n`);
  return dir;
};

/** Builds the project and returns the output and what Vite's logger was told. */
const run = async (dir, options = {}) => {
  const logs = { info: [], warn: [], error: [] };
  const customLogger = {
    info: (m) => logs.info.push(m),
    warn: (m) => logs.warn.push(m),
    warnOnce: (m) => logs.warn.push(m),
    error: (m) => logs.error.push(m),
    clearScreen() {},
    hasErrorLogged: () => false,
    hasWarned: false,
  };
  const result = await build({
    root: dir,
    configFile: false,
    customLogger,
    plugins: [stencilrs({ mode: 'spec-page', ...options })],
    build: { write: false, minify: false, lib: { entry: join(dir, 'src', 'entry.ts'), formats: ['es'], fileName: 'out' }, rollupOptions: { external: [/^@stencil\/core/] } },
  });
  const code = [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
  return { code, logs, hints: logs.info.filter((m) => /^\[stencilrs\] \d+ files? ha/.test(m)) };
};

// With the option on, nothing falls back and nothing is said. This runs first: it must not load TypeScript.
test('with "stableTypeOrdering": true there is no hint and no fallback', async () => {
  const dir = makeProject('on', true);
  const { code, logs, hints } = await run(dir, { verbose: true });
  assert.deepEqual(hints, []);
  assert.equal(logs.info.some((m) => /using Stencil's compiler/.test(m)), false, 'a file fell back');
  assert.ok(logs.info.some((m) => /compiled 2 component file\(s\), reused 0; 0 left to Stencil's compiler/.test(m)), JSON.stringify(logs.info));
  assert.equal(typescriptLoaded(), false, 'TypeScript was loaded');
});

test('without the option, two such files print one hint and still come from Stencil\'s compiler', async () => {
  const dir = makeProject('off', false);
  const { logs, hints } = await run(dir, { verbose: true });
  assert.ok(logs.info.some((m) => /compiled 0 component file\(s\), reused 0; 2 left to Stencil's compiler/.test(m)), JSON.stringify(logs.info));
  assert.equal(typescriptLoaded(), true, 'the output did not come from Stencil\'s compiler');
  assert.equal(hints.length, 1, `hints: ${JSON.stringify(logs.info)}`);
  assert.equal(
    hints[0],
    '[stencilrs] 2 files have a union TypeScript orders by which member it met first; their types come from Stencil\'s compiler. Add "stableTypeOrdering": true to tsconfig.json to compile them with stencilrs.',
  );
  assert.deepEqual(logs.warn, []);
  assert.deepEqual(logs.error, []);
});

test('the docs scan and the transform see the same files: counted once, printed once', async () => {
  const dir = makeProject('docs', false);
  // The docs scan reads the project from the working directory.
  const cwd = process.cwd();
  process.chdir(dir);
  let hints;
  try {
    ({ hints } = await run(dir, { docs: true }));
  } finally {
    process.chdir(cwd);
  }
  assert.equal(hints.length, 1);
  assert.match(hints[0], /^\[stencilrs\] 2 files have a union/);
});

test('fallback: false fails with a message that names the remedy', async () => {
  const dir = makeProject('strict', false);
  await assert.rejects(run(dir, { fallback: false }), /is left to Stencil's compiler\. Add "stableTypeOrdering": true to the tsconfig/);
});

test('another reason for a fallback prints no hint', async () => {
  const dir = makeProject('other', true);
  writeFileSync(join(dir, 'src', 'two.tsx'), `import { Component, h } from '@stencil/core';\nconst css = ':host { color: red; }';\n@Component({ tag: 'cmp-two', styles: css })\nexport class CmpTwo { render() { return <div>x</div>; } }\n`);
  const { logs, hints } = await run(dir, { verbose: true });
  assert.ok(logs.info.some((m) => /compiled 1 component file\(s\), reused 0; 1 left to Stencil's compiler/.test(m)), JSON.stringify(logs.info));
  assert.deepEqual(hints, []);
});

test('the hint helper recognises what analyze() reports, and only that', () => {
  const dir = makeProject('helper', false);
  const source = component('cmp-one', 'CmpOne');
  const off = analyze(source, join(dir, 'src', 'one.tsx'), { resolveImports: true, complexTypes: true });
  assert.equal(off.diagnostics.length, 1);
  assert.match(off.diagnostics[0].message, /^stencilrs: the type of method `pet` \(a union whose order depends on the whole program\) is left to Stencil's compiler\. Add "stableTypeOrdering": true to the tsconfig to compile it with stencilrs\.$/);
  assert.doesNotMatch(off.diagnostics[0].message, /not ported yet/);
  assert.equal(isUnionOrderFallback(off.diagnostics[0].message), true);
  assert.equal(isUnionOrderFallback('stencilrs: the type of prop `keys` (`keyof` of this type) is not ported yet.'), false);
  assert.equal(isUnionOrderFallback('stencilrs: the type of method `x` (a union whose member order the `stableTypeOrdering` comparator cannot decide) is not ported yet.'), false);
});

test('the hint is printed once per plugin instance, however often it is told', () => {
  const lines = [];
  const hint = createUnionOrderHint(() => ({ info: (m) => lines.push(m) }));
  const diag = [{ message: analyze(component('cmp-one', 'CmpOne'), join(root, 'helper', 'src', 'one.tsx'), { resolveImports: true, complexTypes: true }).diagnostics[0].message }];
  hint.note('/a.tsx', diag);
  hint.note('/a.tsx', diag);
  hint.flush();
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[stencilrs\] 1 file has a union .* its types come from .* compile it with stencilrs\.$/);
  hint.note('/b.tsx', diag);
  hint.flush();
  assert.equal(lines.length, 1, 'a rebuild printed it again');
});
