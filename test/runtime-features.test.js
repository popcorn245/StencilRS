// Which features of the stencilrs runtime a build needs: detection from what the plugin compiled (component metadata and the compiled
// code, not a scan of the sources), the option's modes and default, and the constants written into the runtime.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { transpile } from '../index.js';
import { allFeatures, applyRuntimeFeatures, autoRuntimeFeatures, compiledUses, DEFAULT_RUNTIME_FEATURES, FeatureScan, lightOffError, otherUses, resolveRuntimeFeatures, runtimeFeatureDefines } from '../runtime-features.js';

/** A source compiled as the plugin compiles it, and what `compiledUses` says of it. */
const uses = (source, file = 'x.tsx') => {
  const r = transpile(source, { file, componentExport: 'stencilrs', resolveImports: false, jsx: 'classic' });
  const errors = r.diagnostics.filter((d) => d.level === 'error');
  assert.deepEqual(errors, []);
  return compiledUses({ components: r.components, code: r.code, source });
};

const HEAD = `import { Component, h, Prop, State, Host, Fragment } from '@stencil/core';\n`;
const comp = (encapsulation, body = '<p>x</p>', extra = '') => `${HEAD}${extra}\n@Component({ tag: 'a-b'${encapsulation} }) export class A { render() { return ${body}; } }`;
const SHADOW = `, encapsulation: { type: 'shadow' }`;

test('light: from the component\'s encapsulation, not from how it is written', () => {
  assert.equal(uses(comp(SHADOW)).light, false);
  assert.equal(uses(comp('')).light, true, 'no encapsulation is none');
  assert.equal(uses(comp(`, encapsulation: { type: 'scoped' }`)).light, true);
  assert.equal(uses(comp(`, encapsulation: { type: 'none' }`)).light, true);
  assert.equal(uses(comp(`, encapsulation: { type: 'shadow', delegatesFocus: true }`)).light, false);
  // a `shadow` word elsewhere in the file says nothing
  assert.equal(uses(comp('', '<p>x</p>', `// encapsulation: { type: 'shadow' }\nconst shadow = true;`)).light, true);
  assert.equal(uses(comp(SHADOW, '<p>x</p>', `// @Component({ tag: 'q-q' })`)).light, false);
});

test('light: metadata with several components, and a <slot> part in a template', () => {
  const u = compiledUses({ components: [{ tagName: 'a-b', encapsulation: 'shadow' }, { tagName: 'a-c', encapsulation: 'none' }], code: '' });
  assert.equal(u.light, true);
  assert.deepEqual(u.components, [{ tag: 'a-b', encapsulation: 'shadow' }, { tag: 'a-c', encapsulation: 'none' }]);
  // a shadow component's `<slot>` is the browser's: no part
  assert.equal(uses(comp(SHADOW, '<div><slot /><slot name="q" /></div>')).light, false);
  assert.equal(uses(comp(`, encapsulation: { type: 'scoped' }`, '<div><slot /></div>')).light, true);
});

test('vnode: h() called, Fragment, a functional component, a spread', () => {
  assert.equal(uses(comp(SHADOW)).vnode, false, 'h imported for JSX and never called is not a use');
  assert.equal(uses(comp(SHADOW, `h('p', null, 'x')`)).vnode, true);
  assert.equal(uses(comp(SHADOW, '<Host><b/></Host>')).vnode, false);
  assert.equal(uses(comp(SHADOW, '<Fragment><b/></Fragment>')).vnode, false, 'compiled JSX Fragments are templates');
  assert.equal(uses(comp(SHADOW, '<R n={1} />', 'const R = (p) => <i>{p.n}</i>;')).vnode, true);
  assert.equal(uses(comp(SHADOW, '<input {...this.attrs} class="a" />')).vnode, true);
  assert.equal(uses(comp(SHADOW, '<input class="a" onClick={() => {}} />')).vnode, false);
});

test('signals: an import of the signals module', () => {
  assert.equal(uses(comp(SHADOW)).signals, false);
  assert.equal(uses(comp(SHADOW, '<p/>', `import { Signal } from '@popcorn245/stencilrs/signals';`)).signals, true);
  assert.equal(uses(comp(SHADOW, '<p/>', `import { signal } from '@stencil/core/signals';`)).signals, true);
});

test('other modules: a hand-written component, h, signals; plain modules are no use', () => {
  assert.deepEqual(otherUses(`export const x = 1;`), { light: false, vnode: false, signals: false });
  assert.deepEqual(otherUses(`import { getAssetPath, Build } from '@stencil/core';`), { light: false, vnode: false, signals: false });
  assert.equal(otherUses(`import { h } from '@stencil/core'; export const f = () => h('i');`).vnode, true);
  assert.equal(otherUses(`import { Fragment } from '@stencil/core';`).vnode, true);
  assert.equal(otherUses(`import { signal } from '@stencil/core/signals';`).signals, true);
  assert.equal(otherUses(`const m = await import('@popcorn245/stencilrs/signals');`).signals, true);
  // nothing says what a hand-written component renders: light and vnode both count
  assert.deepEqual(otherUses(`import { Base, define } from '@popcorn245/stencilrs/runtime';`), { light: true, vnode: true, signals: false });
  assert.equal(otherUses(`import { Mixin } from '@stencil/core';`).light, true);
});

test('FeatureScan: the modules of the bundle only, the last word on a file, and why', () => {
  const scan = new FeatureScan();
  const shadowSrc = comp(SHADOW);
  const r = transpile(shadowSrc, { file: 'a.tsx', componentExport: 'stencilrs', resolveImports: false, jsx: 'classic' });
  scan.compiled('/p/a.tsx', { components: r.components, code: r.code, source: shadowSrc });
  scan.other('/p/util.js', `import { Fragment } from '@stencil/core';`);
  scan.compiled('/p/gone.tsx', { components: [{ tagName: 'g-g', encapsulation: 'none' }], code: '' });
  const inBundle = scan.features(['/p/a.tsx', '/p/util.js?x', '/p/other.css']);
  assert.deepEqual({ light: inBundle.light, vnode: inBundle.vnode, signals: inBundle.signals }, { light: false, vnode: true, signals: false });
  assert.deepEqual(inBundle.files.vnode, ['/p/util.js']);
  assert.equal(scan.features().light, true, 'without a module list: every file seen');
  // a file that changed: its new entry replaces the old one
  scan.other('/p/util.js', `export const x = 1;`);
  assert.equal(scan.features(['/p/a.tsx', '/p/util.js']).vnode, false);
});

test('auto: a production browser build; hydration and resuming only with hydrateClient, signals with the plugin\'s option', () => {
  const none = { light: false, vnode: false, signals: false };
  assert.deepEqual(autoRuntimeFeatures(none), { server: false, hot: false, hydrate: false, resume: false, light: false, signals: false, vnode: false });
  assert.deepEqual(autoRuntimeFeatures({ ...none, light: true, vnode: true }, { hydrateClient: true }), { server: false, hot: false, hydrate: true, resume: true, light: true, signals: false, vnode: true });
  assert.equal(autoRuntimeFeatures(none, { signals: true }).signals, true);
});

test('the option: the default, the whole runtime, auto, an object, and what it refuses', () => {
  assert.equal(DEFAULT_RUNTIME_FEATURES, 'auto');
  assert.deepEqual(resolveRuntimeFeatures(undefined), resolveRuntimeFeatures(DEFAULT_RUNTIME_FEATURES));
  assert.deepEqual(resolveRuntimeFeatures('all'), { mode: 'all' });
  assert.deepEqual(resolveRuntimeFeatures(false), { mode: 'all' });
  assert.deepEqual(resolveRuntimeFeatures('auto'), { mode: 'auto' });
  assert.deepEqual(resolveRuntimeFeatures({ hydrate: false }), { mode: 'explicit', features: { hydrate: false } });
  assert.throws(() => resolveRuntimeFeatures({ slots: false }), /unknown feature "slots"/);
  assert.throws(() => resolveRuntimeFeatures('some'), /must be 'auto', 'all', false or an object/);
  assert.throws(() => resolveRuntimeFeatures(true), /must be 'auto'/);
  assert.deepEqual(allFeatures({ hot: false }), { server: true, hydrate: true, resume: true, light: true, signals: true, vnode: true, hot: false });
});

test('defines: every feature is written, on unless turned off', () => {
  assert.equal(runtimeFeatureDefines(undefined).__RS_FEAT_HYDRATE__, 'true');
  const d = runtimeFeatureDefines({ hydrate: false, light: true });
  assert.equal(d.__RS_FEAT_HYDRATE__, 'false');
  assert.equal(d.__RS_FEAT_LIGHT__, 'true');
  assert.equal(d.__RS_FEAT_SERVER__, 'true');
  assert.equal(Object.keys(d).length, 7);
  assert.throws(() => runtimeFeatureDefines({ slots: false }), /unknown feature "slots"/);
});

test('applyRuntimeFeatures: literals in place of the constants, no position moves', () => {
  const code = `const F_LIGHT = typeof __RS_FEAT_LIGHT__ === 'undefined' || !!__RS_FEAT_LIGHT__;\nconst F_HOT = typeof __RS_FEAT_HOT__ === 'undefined' || !!__RS_FEAT_HOT__;\nconst __RS_FEAT_X__ = 1;`;
  const out = applyRuntimeFeatures(code, { light: false, hot: true });
  assert.equal(out.length, code.length);
  assert.match(out.split('\n')[0], /^const F_LIGHT = typeof false +=== 'undefined' \|\| !!false +;$/);
  assert.match(out, /typeof true +=== 'undefined' \|\| !!true +;/);
  assert.match(out, /const __RS_FEAT_X__ = 1;/, 'a name that is no feature stays');
  assert.equal(applyRuntimeFeatures('no markers', {}), 'no markers');
  assert.match(applyRuntimeFeatures(`!!__RS_FEAT_SERVER__`, {}), /^!!true +$/, 'a feature left out is on');
});

test('lightOffError: only an explicit light: false with a component that is not shadow', () => {
  const none = [{ tagName: 'a-b', encapsulation: 'none' }];
  assert.match(lightOffError('/p/a.tsx', none, { light: false }), /light is false, but \/p\/a\.tsx has <a-b> \(none\)/);
  assert.match(lightOffError('/p/a.tsx', [{ tagName: 'a-s', encapsulation: 'scoped' }], { light: false }), /<a-s> \(scoped\)/);
  assert.equal(lightOffError('/p/a.tsx', [{ tagName: 'a-b', encapsulation: 'shadow' }], { light: false }), null);
  assert.equal(lightOffError('/p/a.tsx', none, { light: true }), null);
  assert.equal(lightOffError('/p/a.tsx', none, {}), null);
  assert.equal(lightOffError('/p/a.tsx', none, undefined), null);
});
