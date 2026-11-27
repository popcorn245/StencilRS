// client-patches.js: the patch's snippet is in the Stencil runtime that is installed (once per file), the patch swaps it,
// and it throws, naming itself, when the code is not what it expects.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { CLIENT_RUNTIME_PATCHES, applyClientRuntimePatches } from '../client-patches.js';

const require = createRequire(import.meta.url);
const core = dirname(require.resolve('@stencil/core/package.json'));
const files = ['runtime.js', 'lazy.js'].map((f) => join(core, 'dist/runtime/client', f).replaceAll('\\', '/'));
const [patch] = CLIENT_RUNTIME_PATCHES;
const count = (text, needle) => text.split(needle).length - 1;

test('orgLocationOrder: the snippet is in each client runtime exactly once', () => {
  assert.equal(patch.name, 'orgLocationOrder');
  for (const f of files) assert.equal(count(readFileSync(f, 'utf8'), patch.from), 1, f);
});

test('orgLocationOrder: patched code has the new snippet and not the old one', () => {
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const out = applyClientRuntimePatches(src, f);
    assert.equal(count(out, patch.from), 0, f);
    assert.equal(count(out, patch.to), 1, f);
    assert.ok(!out.includes('orgLocationNode.parentElement.shadowRoot'), f);
  }
});

test('a runtime file without the snippet throws, naming the patch', () => {
  assert.throws(() => applyClientRuntimePatches('export const x = 1;', files[0]), /orgLocationOrder.*has Stencil's runtime changed\?/);
});

test('any other file is returned untouched', () => {
  const src = readFileSync(files[0], 'utf8');
  assert.equal(applyClientRuntimePatches(src, '/app/node_modules/@stencil/core/dist/runtime/server/runner.mjs'), src);
  assert.equal(applyClientRuntimePatches(src, '/app/src/main.js'), src);
});
