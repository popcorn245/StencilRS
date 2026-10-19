import assert from 'node:assert/strict';
import { test } from 'node:test';

import { transpile } from '../index.js';

const source = `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-a' })
export class CmpA { render() { return <div />; } }`;
const options = { file: 'cmp-a.tsx', jsx: 'classic', sourceMap: false };

test('componentExport picks the output', () => {
  assert.match(transpile(source, options).code, /defineCustomElement\(CmpA/);
  assert.match(transpile(source, { ...options, componentExport: 'module' }).code, /export const CmpA = class extends HTMLElement[\s\S]*proxyCustomElement\(CmpA/);
  const lazy = transpile(source, { ...options, componentExport: 'lazy' }).code;
  assert.match(lazy, /export const CmpA = class \{\s*constructor\(hostRef\) \{\s*__stencil_registerInstance\(this, hostRef\)/);
});

test('componentExport: null is the lazy output, as in Stencil', () => {
  assert.equal(transpile(source, { ...options, componentExport: null }).code, transpile(source, { ...options, componentExport: 'lazy' }).code);
});

test('componentExport: ssr keeps the class, adds cmpMeta, and imports the server runtime', () => {
  const ssr = transpile(source, { ...options, componentExport: 'ssr' }).code;
  assert.match(ssr, /^import \{ registerInstance as __stencil_registerInstance \} from "@stencil\/core\/runtime\/server";/);
  assert.match(ssr, /export class CmpA \{[\s\S]*static get cmpMeta\(\)[\s\S]*"\$tagName\$": "cmp-a"/);
});

test('an unknown componentExport throws', () => {
  assert.throws(() => transpile(source, { ...options, componentExport: 'nope' }), /unknown componentExport/);
});
