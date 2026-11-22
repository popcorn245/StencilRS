// The BUILD flags buildHydrate derives from components (ssr-features.js): what each fact turns on, and the
// conservative merge of the modules a component imports.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { readComponentMetadata, SSR_BUILD, ssrBuildConditionals } from '../ssr-features.js';

const dir = mkdtempSync(join(tmpdir(), 'ssr-features-'));
const write = (name, code) => {
  const file = join(dir, name);
  writeFileSync(file, code);
  return { file, code };
};

const PLAIN = write('plain.tsx', `import { Component, h, Prop } from '@stencil/core';
@Component({ tag: 'x-plain', encapsulation: { type: 'scoped' } })
export class Plain { @Prop() label = ''; render() { return <div class="a">{this.label}</div>; } }`);

const RICH = write('rich.tsx', `import { Component, h, Element, Event, EventEmitter, Listen, Method, State, Watch } from '@stencil/core';
@Component({ tag: 'x-rich', encapsulation: { type: 'shadow' } })
export class Rich {
  @Element() el!: HTMLElement;
  @State() n = 0;
  @Event() done!: EventEmitter<void>;
  @Listen('resize', { target: 'window' }) onResize() {}
  @Watch('n') nChanged() {}
  @Method() async go() {}
  componentWillLoad() {}
  render() { return <div ref={(e) => e} key="k" onClick={() => {}} style={{ color: 'red' }}><slot /><svg /></div>; }
}`);

test('a scoped component with one prop and class turns off what nothing uses', async () => {
  const b = ssrBuildConditionals(await readComponentMetadata([PLAIN]));
  assert.equal(b.scoped, true);
  assert.equal(b.prop, true);
  assert.equal(b.propString, true);
  assert.equal(b.vdomClass, true);
  for (const off of ['shadowDom', 'slot', 'svg', 'event', 'hostListener', 'hostListenerTargetWindow', 'method', 'state', 'vdomRef', 'vdomListener', 'vdomStyle', 'lifecycle', 'propBoolean', 'propNumber', 'serializer', 'patchAll']) {
    assert.equal(b[off], false, off);
  }
});

test('every feature of a component turns its flag on', async () => {
  const b = ssrBuildConditionals(await readComponentMetadata([PLAIN, RICH]));
  for (const on of ['shadowDom', 'scoped', 'slot', 'svg', 'event', 'state', 'method', 'hostListener', 'hostListenerTargetWindow', 'lifecycle', 'vdomRef', 'vdomKey', 'vdomListener', 'vdomStyle', 'observeAttribute', 'propChangeCallback']) {
    assert.equal(b[on], true, on);
  }
  assert.equal(b.hostListenerTargetBody, false);
  assert.equal(b.formAssociated, false);
});

test('the ssr target forces its own flags whatever the components use', async () => {
  const b = ssrBuildConditionals(await readComponentMetadata([PLAIN]));
  for (const [k, v] of Object.entries(SSR_BUILD)) assert.equal(b[k], v, k);
  assert.equal(b.hydrateServerSide, true);
  assert.equal(b.slotRelocation, true);
});

test('a module a component imports that renders JSX turns the vdom flags on', async () => {
  write('helper.tsx', `import { h } from '@stencil/core';
export const Icon = () => <svg><slot /></svg>;`);
  const user = write('user.tsx', `import { Component, h } from '@stencil/core';
import { Icon } from './helper';
@Component({ tag: 'x-user' })
export class User { render() { return <Icon />; } }`);
  const alone = ssrBuildConditionals(await readComponentMetadata([user]));
  assert.equal(alone.vdomRef, true);
  assert.equal(alone.svg, true);
  write('util.ts', 'export const twice = (n: number) => n * 2;');
  const clean = write('clean.tsx', `import { Component, h } from '@stencil/core';
import { twice } from './util';
@Component({ tag: 'x-clean' })
export class Clean { render() { return <div>{twice(2)}</div>; } }`);
  const b = ssrBuildConditionals(await readComponentMetadata([clean]));
  assert.equal(b.vdomRef, false);
  assert.equal(b.svg, false);
});
