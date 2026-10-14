import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyze } from '../index.js';

test('analyze returns Stencil-shaped metadata through the native binding', () => {
  const { components, diagnostics } = analyze(
    `import { Component, Prop } from '@stencil/core';
     @Component({ tag: 'cmp-a', encapsulation: { type: 'scoped' } })
     export class CmpA { @Prop({ reflect: true }) firstName: string; }`,
    'cmp-a.tsx',
  );
  assert.deepEqual(diagnostics, []);
  assert.equal(components[0].tagName, 'cmp-a');
  assert.equal(components[0].encapsulation, 'scoped');
  assert.deepEqual(components[0].properties[0], {
    name: 'firstName',
    type: 'string',
    mutable: false,
    required: false,
    optional: false,
    getter: false,
    setter: false,
    reflect: true,
    attribute: 'first-name',
    complexTypeOriginal: 'string',
  });
});
