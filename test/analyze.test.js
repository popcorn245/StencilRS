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
    complexType: { original: 'string', resolved: '', references: {} },
    docs: { text: '', tags: [] },
  });
});

test('analyze carries the JSDoc text and tags of the component and its members', () => {
  const { components } = analyze(
    `import { Component, Prop } from '@stencil/core';
     /** A card. */
     @Component({ tag: 'cmp-a' })
     export class CmpA {
       /**
        * The name.
        * @since 1.0
        */
       @Prop() name: string;
     }`,
    'cmp-a.tsx',
  );
  assert.deepEqual(components[0].docs, { text: 'A card.', tags: [] });
  assert.deepEqual(components[0].properties[0].docs, {
    text: 'The name.',
    tags: [{ name: 'since', text: '1.0' }],
  });
});
