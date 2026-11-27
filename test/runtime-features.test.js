import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoRuntimeFeatures, detectUsedFeatures, runtimeFeatureDefines } from '../runtime-features.js';

const shadow = `@Component({ tag: 'a-b', encapsulation: { type: 'shadow' }, styleUrl: 'a.css' }) export class A { render() { return <div>{this.x}</div>; } }`;
const shadowTrue = `@Component({ tag: 'a-b', shadow: true }) export class A { render() { return <slot />; } }`;
const light = `@Component({ tag: 'a-c' }) export class C { render() { return <div><slot /></div>; } }`;
const scoped = `@Component({ tag: 'a-d', scoped: true }) export class D {}`;

test('light: any component that is not shadow', () => {
  assert.equal(detectUsedFeatures([shadow, shadowTrue]).light, false);
  assert.equal(detectUsedFeatures([shadow, light]).light, true);
  assert.equal(detectUsedFeatures([scoped]).light, true);
});

test('signals, h and spreads, functional components', () => {
  assert.equal(detectUsedFeatures([shadow]).signals, false);
  assert.equal(detectUsedFeatures([`import { signal } from '@stencil/core/signals';`]).signals, true);
  assert.equal(detectUsedFeatures([shadow]).vnode, false);
  assert.equal(detectUsedFeatures([`import { Component, h } from '@stencil/core';`]).vnode, true);
  assert.equal(detectUsedFeatures([`const x = <input {...props} />;`]).vnode, true);
  assert.equal(detectUsedFeatures([`const x = <Row id={1} />;`]).vnode, true);
  assert.equal(detectUsedFeatures([`const x = <Host><Fragment /></Host>;`]).vnode, false);
});

test('auto: a production browser build, hydration only with hydrateClient', () => {
  assert.deepEqual(autoRuntimeFeatures([shadow]), { server: false, hot: false, hydrate: false, resume: false, light: false, signals: false, vnode: false });
  assert.deepEqual(autoRuntimeFeatures([light], { hydrateClient: true }), { server: false, hot: false, hydrate: true, resume: true, light: true, signals: false, vnode: false });
});

test('defines: every feature is written, on unless turned off', () => {
  assert.deepEqual(runtimeFeatureDefines(undefined).__RS_FEAT_HYDRATE__, 'true');
  const d = runtimeFeatureDefines({ hydrate: false, light: true });
  assert.equal(d.__RS_FEAT_HYDRATE__, 'false');
  assert.equal(d.__RS_FEAT_LIGHT__, 'true');
  assert.equal(d.__RS_FEAT_SERVER__, 'true');
  assert.equal(Object.keys(d).length, 7);
  assert.throws(() => runtimeFeatureDefines({ slots: false }), /unknown feature "slots"/);
});
