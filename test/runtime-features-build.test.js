// `runtimeFeatures` in a production build (`runtime: 'stencilrs'`): which parts of runtime.js are in the bundle for what the build
// compiles. Unminified bundles, each feature's code looked for by a name only it has (`MARKERS`); the runtime's own `F_*` constants
// are folded by the bundler, so a feature that is off has no trace.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { build } from 'vite';

import stencilrs from '../vite.js';

const fixture = join(import.meta.dirname, 'fixtures/runtime-features');

/** Code only this feature of runtime.js has (unminified output). */
const MARKERS = {
  server: '__live',
  hydrate: 'function hydrateEl',
  resume: 'resumeEl',
  light: 'SlotPart =',
  signals: '__RS_BIND__',
  vnode: 'SpreadPart =',
  hot: 'hot.swap',
};
const features = (code) => Object.fromEntries(Object.entries(MARKERS).map(([k, m]) => [k, code.includes(m)]));
const OFF = { server: false, hydrate: false, resume: false, light: false, signals: false, vnode: false, hot: false };
const HYD = { ...OFF, hydrate: true, resume: true }; // what 'auto' keeps when nothing else is used
const ALL = Object.fromEntries(Object.keys(OFF).map((k) => [k, true]));

const bundle = async (entry, options = {}, { root = fixture, plugins = [] } = {}) => {
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs({ runtime: 'stencilrs', ...options }), ...plugins],
    build: { write: false, minify: false, lib: { entry: join(root, entry), formats: ['es'], fileName: 'out' } },
  });
  return [result].flat().flatMap((r) => r.output).map((o) => (o.type === 'chunk' ? o.code : '')).join('\n');
};
const used = async (entry, options, extra) => features(await bundle(entry, options, extra));

test('the markers: the whole runtime has every one, so an absent marker means the feature is gone', async () => {
  assert.deepEqual(await used('shadow.ts', { runtimeFeatures: false }), ALL);
  assert.deepEqual(await used('shadow.ts', { runtimeFeatures: 'all' }), ALL);
  assert.deepEqual(await used('shadow.ts', { runtimeFeatures: { hot: true } }), ALL);
});

test('default (auto): shadow components keep hydration and resuming only; client (no server renders the app) keeps nothing optional', async () => {
  const code = await bundle('shadow.ts');
  assert.deepEqual(features(code), HYD);
  const client = await bundle('shadow.ts', { runtimeFeatures: 'client' });
  assert.deepEqual(features(client), OFF);
  assert.equal(client, await bundle('shadow.ts', { runtimeFeatures: OFF }), 'the same as turning every part off by hand');
  assert.deepEqual(features(await bundle('shadow.ts', { hydrateClient: { split: false } })), HYD, 'hydrateClient changes nothing under auto');
  assert.match(code, /customElements\.define/, 'the runtime itself is there');
  assert.equal(code, await bundle('shadow.ts', { runtimeFeatures: 'auto' }), 'the default is auto');
});

test('light: a component that is not shadow DOM brings the light-DOM half', async () => {
  assert.deepEqual(await used('only-light.ts', { runtimeFeatures: 'client' }), { ...OFF, light: true });
  assert.deepEqual(await used('only-none.ts', { runtimeFeatures: 'client' }), { ...OFF, light: true }, 'the default encapsulation is none');
  assert.equal((await used('only-counter.ts', { runtimeFeatures: 'client' })).light, false);
});

test('vnode: h(), a spread and a functional component bring vnode support; JSX alone does not', async () => {
  assert.deepEqual(await used('only-vnode.ts', { runtimeFeatures: 'client' }), { ...OFF, vnode: true });
  assert.deepEqual(await used('only-spread.ts', { runtimeFeatures: 'client' }), { ...OFF, vnode: true });
  assert.deepEqual(await used('only-fn.ts', { runtimeFeatures: 'client' }), { ...OFF, vnode: true });
  assert.equal((await used('only-counter.ts', { runtimeFeatures: 'client' })).vnode, false);
});

test('signals: an import of the signals module (the plugin\'s signals option makes it importable)', async () => {
  assert.deepEqual(await used('only-signal.ts', { signals: true, runtimeFeatures: 'client' }), { ...OFF, signals: true });
  assert.equal((await used('only-counter.ts', { signals: true, runtimeFeatures: 'client' })).signals, true, 'the option alone keeps the binder: the page may load a signal from anywhere');
  assert.equal((await used('only-counter.ts', { runtimeFeatures: 'client' })).signals, false);
});

test('hydrate and resume: on under auto, off under client; server and hot never', async () => {
  assert.deepEqual(await used('shadow.ts', { hydrateClient: true }), HYD);
  assert.deepEqual(await used('only-light.ts', { signals: true }), { ...HYD, light: true, signals: true });
  assert.deepEqual(await used('only-light.ts', { runtimeFeatures: 'client', signals: true }), { ...OFF, light: true, signals: true });
});

test('an object turns off what it names, and leaves out what it does not mention (on)', async () => {
  assert.deepEqual(await used('only-light.ts', { runtimeFeatures: { server: false, hot: false } }), { ...ALL, server: false, hot: false });
  assert.deepEqual(await used('shadow.ts', { runtimeFeatures: { hydrate: false, resume: false } }), { ...ALL, hydrate: false, resume: false });
  // resuming needs hydration: `resume: true` with `hydrate: false` has neither
  assert.deepEqual(await used('shadow.ts', { runtimeFeatures: { ...ALL, hydrate: false } }), { ...ALL, hydrate: false, resume: false });
});

test('the option refuses what it does not know, and hydrateClient without hydration', async () => {
  assert.throws(() => stencilrs({ runtime: 'stencilrs', runtimeFeatures: 'small' }), /must be 'auto', 'client', 'all', false or an object/);
  assert.throws(() => stencilrs({ runtime: 'stencilrs', runtimeFeatures: { slots: false } }), /unknown feature "slots"/);
  await assert.rejects(bundle('shadow.ts', { hydrateClient: true, runtimeFeatures: { hydrate: false } }), /leaves hydration out .* but hydrateClient is on/);
  await assert.rejects(bundle('shadow.ts', { hydrateClient: true, runtimeFeatures: 'client' }), /leaves hydration out/);
});

test('an explicit light: false with a component that is not shadow DOM fails the build, naming it', async () => {
  await assert.rejects(bundle('only-light.ts', { runtimeFeatures: { light: false } }), /runtimeFeatures\.light is false, but .*rf-light\.tsx has <rf-light> \(scoped\)/);
  await assert.rejects(bundle('only-none.ts', { runtimeFeatures: { ...ALL, light: false } }), /<rf-none> \(none\)/);
  // a shadow-only app is fine, and so is light: false with `auto` in front of a light app (auto turns it on)
  assert.equal((await used('shadow.ts', { runtimeFeatures: { light: false } })).light, false);
  assert.equal((await used('only-light.ts', { runtimeFeatures: 'auto' })).light, true);
  await assert.rejects(bundle('only-light.ts', { runtimeFeatures: { light: false } }), /light is false/);
});

// Projects of their own, inside the package so that the compiled components' import of `@popcorn245/stencilrs/runtime` resolves (removed at the end).
const projects = [];
after(() => projects.forEach((p) => rmSync(p, { recursive: true, force: true })));
const project = (files) => {
  const root = mkdtempSync(join(fixture, '.tmp-'));
  projects.push(root);
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(root, name, '..'), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  return root;
};
const SHADOW_SRC = `import { Component, h } from '@stencil/core';\n@Component({ tag: 'p-s', encapsulation: { type: 'shadow' } }) export class PS { render() { return <p>s</p>; } }\n`;

test('modules the plugin does not compile: a hand-written component and h() in a helper count (conservatively)', async () => {
  const root = project({
    'shadow.tsx': SHADOW_SRC,
    'hand.js': `import { Base, define } from '@stencil/core';\nexport class Hand extends Base { render() { return null; } }\ndefine(Hand, { tag: 'p-hand' });\n`,
    'helper.ts': `import { h } from '@stencil/core';\nexport const row = (n: number) => h('li', null, String(n));\n`,
    'plain.ts': `import { getAssetPath, Build } from '@stencil/core';\nexport const a = () => (Build.isBrowser ? getAssetPath('x') : '');\n`,
    'main-hand.ts': `import './shadow.tsx';\nimport './hand.js';\n`,
    'main-helper.ts': `import './shadow.tsx';\nimport './helper.ts';\n`,
    'main-plain.ts': `import './shadow.tsx';\nimport './plain.ts';\n`,
  });
  assert.deepEqual(await used('main-hand.ts', { runtimeFeatures: 'client' }, { root }), { ...OFF, light: true, vnode: true });
  assert.deepEqual(await used('main-helper.ts', { runtimeFeatures: 'client' }, { root }), { ...OFF, vnode: true });
  assert.deepEqual(await used('main-plain.ts', { runtimeFeatures: 'client' }, { root }), OFF, 'a module that only reads Build or getAssetPath asks for nothing');
});

test('collections: a component from a package the build compiles (hydrateClient.collections) counts', async () => {
  const collection = (encapsulation) => `import { h } from "@stencil/core";
export class Fk {
    render() { return h('div', null, 'fk'); }
    static get is() { return "fk-thing"; }
${encapsulation ? `    static get encapsulation() { return "${encapsulation}"; }\n` : ''}}`;
  for (const [enc, light] of [['shadow', false], ['scoped', true], ['', true]]) {
    const root = project({
      'node_modules/fakecol/package.json': JSON.stringify({ name: 'fakecol', collection: 'collection/collection-manifest.json' }),
      'node_modules/fakecol/collection/collection-manifest.json': JSON.stringify({ entries: ['fk-thing.js'] }),
      'node_modules/fakecol/collection/fk-thing.js': collection(enc),
      'shadow.tsx': SHADOW_SRC,
      'main.ts': `import './shadow.tsx';\n`,
    });
    const without = await used('main.ts', { hydrateClient: { split: false } }, { root });
    const withCollection = await used('main.ts', { hydrateClient: { collections: ['fakecol'] } }, { root });
    assert.equal(without.light, false);
    assert.equal(withCollection.light, light, `a ${enc || 'none'} collection component`);
    assert.equal(withCollection.hydrate, true);
  }
});

test('a module the build loads after the features were chosen, that needs one that was left out, fails the build (never a broken page)', async () => {
  const late = { name: 'late-entry', buildStart() { this.emitFile({ type: 'chunk', id: join(fixture, 'only-light.ts'), fileName: 'late.js' }); } };
  await assert.rejects(bundle('shadow.ts', {}, { plugins: [late] }), /'auto' left out light.*only-light|'auto' left out light.*rf-light/s);
  // the same build with the features given explicitly is the user's word
  assert.equal((await used('shadow.ts', { runtimeFeatures: 'all' }, { plugins: [late] })).light, true);
});
