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
    complexType: { original: 'string', resolved: 'string', references: {} },
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

test('analyze resolves complexType when asked and leaves what it cannot to Stencil', () => {
  const source = `import { Component, Prop, Event, EventEmitter, Method } from '@stencil/core';
     export type Mode = 'a' | 'b';
     @Component({ tag: 'cmp-a' })
     export class CmpA {
       @Prop() mode: Mode;
       @Prop() keys: keyof Mode;
       @Event() picked: EventEmitter<Mode[]>;
       @Method() async pick(x: Mode): Promise<void> {}
     }`;
  const { components, diagnostics } = analyze(source, 'cmp-a.tsx', { complexTypes: true });
  const [mode, keys] = components[0].properties;
  assert.deepEqual(mode.complexType, {
    original: 'Mode',
    resolved: '"a" | "b"',
    references: { Mode: { location: 'local', path: 'cmp-a.tsx', id: 'cmp-a.tsx::Mode' } },
  });
  assert.equal(components[0].events[0].complexType.resolved, '("a" | "b")[]');
  assert.equal(components[0].methods[0].complexType.signature, '(x: Mode) => Promise<void>');
  assert.deepEqual(components[0].methods[0].complexType.parameters, [{ name: 'x', type: '"a" | "b"', docs: '' }]);
  // `keyof` is Stencil's to compute: an `unported` error, and nothing made up.
  assert.equal(keys.complexType.resolved, '');
  assert.deepEqual(
    diagnostics.map((d) => d.message),
    ['stencilrs: the type of prop `keys` (`keyof`, `readonly` or `unique symbol`) is not ported yet.'],
  );
  // Off by default, so the Vite plugin does not fall back for it.
  assert.deepEqual(analyze(source, 'cmp-a.tsx').diagnostics, []);
});
