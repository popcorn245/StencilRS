import assert from 'node:assert/strict';
import { test } from 'node:test';

import { transpile, transpileAsync, transpileMany } from '../index.js';

const component = (n) => `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-${n}' })
export class Cmp${n} { render() { return <div>${n}</div>; } }`;
const options = (n) => ({ file: `cmp-${n}.tsx`, jsx: 'classic' });

test('transpileAsync resolves to what transpile returns', async () => {
  assert.deepEqual(await transpileAsync(component(1), options(1)), transpile(component(1), options(1)));
  const spec = { ...options(1), componentExport: null, componentMetadata: 'compilerstatic', coreImportPath: '@stencil/core/testing', style: null };
  assert.deepEqual(await transpileAsync(component(1), spec), transpile(component(1), spec));
});

test('transpileAsync reports a syntax error as a diagnostic, and bad options as a rejection', async () => {
  const broken = await transpileAsync('export class {', { file: 'broken.tsx' });
  assert.deepEqual(broken, transpile('export class {', { file: 'broken.tsx' }));
  assert.ok(broken.diagnostics.some((d) => d.level === 'error'));
  await assert.rejects(transpileAsync(component(1), { ...options(1), componentExport: 'nope' }), /unknown componentExport/);
});

test('many transpileAsync calls in flight each get their own result', async () => {
  const results = await Promise.all(Array.from({ length: 40 }, (_, n) => transpileAsync(component(n), options(n))));
  results.forEach((r, n) => assert.equal(r.components[0].tagName, `cmp-${n}`));
});

test('transpileMany returns results in input order, the same as transpile', async () => {
  const files = Array.from({ length: 50 }, (_, n) => ({ source: component(n), options: options(n) }));
  const results = await transpileMany(files);
  assert.equal(results.length, files.length);
  results.forEach((r, n) => assert.deepEqual(r, transpile(files[n].source, files[n].options)));
});

test('transpileMany: a file that fails does not fail the others', async () => {
  const results = await transpileMany([
    { source: component(1), options: options(1) },
    { source: 'export class {', options: { file: 'broken.tsx' } },
    { source: component(2), options: { ...options(2), componentExport: 'nope' } },
    { source: component(3), options: options(3) },
  ]);
  assert.equal(results.length, 4);
  assert.equal(results[0].components[0].tagName, 'cmp-1');
  assert.ok(results[1].diagnostics.some((d) => d.level === 'error'));
  assert.deepEqual(results[1], transpile('export class {', { file: 'broken.tsx' }));
  assert.match(results[2].error, /unknown componentExport/);
  assert.equal(results[3].components[0].tagName, 'cmp-3');
});

test('transpileMany of nothing is an empty array', async () => {
  assert.deepEqual(await transpileMany([]), []);
});
