import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

import { build } from 'vite';

import stencilrs from '../vite.js';
import { buildFeatures, foldBuildReads, scanComponents, standaloneFlags } from '../vite-fold.js';

const meta = (over = {}) => ({ htmlTagNames: [], encapsulation: 'none', hasRenderFn: true, ...over });

test('buildFeatures: every flag is the OR of the components, allRenderFn the AND', () => {
  const f = buildFeatures([meta({ hasProp: true, hasVdomClass: true }), meta({ hasRenderFn: false, hasEvent: true, encapsulation: 'shadow' })]);
  assert.equal(f.prop, true);
  assert.equal(f.event, true);
  assert.equal(f.vdomClass, true);
  assert.equal(f.shadowDom, true);
  assert.equal(f.allRenderFn, false);
  assert.equal(f.hasRenderFn, true);
  assert.equal(f.state, false);
  assert.equal(f.slotRelocation, false);
  // `<slot>` outside shadow DOM relocates; inside it does not.
  assert.equal(buildFeatures([meta({ htmlTagNames: ['slot'], encapsulation: 'scoped' })]).slotRelocation, true);
  assert.equal(buildFeatures([meta({ htmlTagNames: ['slot'], encapsulation: 'shadow' })]).slotRelocation, false);
  // reflect implies the vdom attribute / prop-or-attr paths.
  const r = buildFeatures([meta({ hasReflect: true })]);
  assert.equal(r.vdomAttribute && r.vdomPropOrAttr, true);
});

test('standaloneFlags: the light-DOM patches follow slot relocation, hydrateClientSide is opt-in', () => {
  const off = standaloneFlags([meta({ hasProp: true, isUpdateable: true })]);
  assert.equal(off.lightDomPatches || off.slotChildNodes || off.slotDomMutations || off.slotTextContent, false);
  assert.equal(off.hydrateClientSide, false);
  assert.equal(off.updatable, true);
  const on = standaloneFlags([meta({ htmlTagNames: ['slot'] })], { hydrateClientSide: true, signals: true });
  assert.equal(on.slotRelocation && on.lightDomPatches && on.slotChildNodes && on.slotDomMutations && on.slotTextContent, true);
  assert.equal(on.hydrateClientSide && on.updatable && on.member && on.vdomSignals, true);
});

test('foldBuildReads: reads become literals, writes stay, unknown flags read undefined', () => {
  const out = foldBuildReads('if (BUILD$1.a) x(); if (BUILD.b) y(); BUILD.c = 1; if (BUILD$1.zz) z(); BUILD.a == 1;', { a: true, b: false, c: true });
  assert.equal(out, 'if (true) x(); if (false) y(); BUILD.c = 1; if (void 0) z(); true == 1;');
});

// A project inside the repo, so that `@stencil/core` resolves from the repo's node_modules.
const project = mkdtempSync(join(fileURLToPath(new URL('..', import.meta.url)), '.tmp-fold-'));
after(() => rmSync(project, { recursive: true, force: true }));
mkdirSync(join(project, 'src'), { recursive: true });
writeFileSync(
  join(project, 'src', 'my-cmp.tsx'),
  `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'my-cmp', encapsulation: { type: 'shadow' } })
export class MyCmp {
  @Prop() label = 'x';
  render() { return <button>{this.label}</button>; }
}
`,
);

const run = async (options) => {
  const result = await build({
    root: project,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs(options)],
    build: { write: false, lib: { entry: join(project, 'src', 'my-cmp.tsx'), formats: ['es'], fileName: 'out' } },
  });
  return [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
};

test('scanComponents reads the flags-relevant metadata of the project', () => {
  const { cmps, complete, problems } = scanComponents(project, { dirs: [join(project, 'src')] });
  assert.deepEqual(problems, []);
  assert.equal(complete, true);
  assert.equal(cmps.length, 1);
  assert.equal(cmps[0].tagName, 'my-cmp');
  assert.equal(cmps[0].hasProp, true);
});

test('foldRuntimeFlags: the production bundle drops the runtime features no component uses', async () => {
  const plain = await run({});
  const folded = await run({ foldRuntimeFlags: true });
  const noHydration = await run({ foldRuntimeFlags: true, buildFlags: { hydrateClientSide: false } });
  assert.ok(folded.length < plain.length * 0.8, `folded ${folded.length} B vs ${plain.length} B`);
  // Hydration of server-rendered nodes stays on unless `buildFlags` turns it off, as without folding.
  assert.ok(noHydration.length < folded.length * 0.85, `no hydration ${noHydration.length} B vs ${folded.length} B`);
  assert.ok(folded.includes('s-cr'));
  // Slot relocation, server-side hydration and the dev code are not in a project without slots.
  assert.ok(plain.includes('s-cr'));
  assert.ok(!noHydration.includes('s-cr') && !noHydration.includes('hydrateServerSide') && !folded.includes('hydrateServerSide'));
  assert.ok(noHydration.includes('my-cmp'));
});

test('foldRuntimeFlags warns about a package whose components were compiled elsewhere', async () => {
  mkdirSync(join(project, 'node_modules', 'prebuilt-cmps'), { recursive: true });
  writeFileSync(join(project, 'node_modules', 'prebuilt-cmps', 'index.js'), `import { h } from '@stencil/core';\nexport const view = () => h('div', null);\n`);
  writeFileSync(join(project, 'src', 'uses-lib.tsx'), `import { view } from 'prebuilt-cmps';\nexport const v = view();\n`);
  const warnings = [];
  const customLogger = { info() {}, warn: (m) => warnings.push(m), warnOnce: (m) => warnings.push(m), error() {}, clearScreen() {}, hasErrorLogged: () => false, hasWarned: false };
  await build({
    root: project,
    configFile: false,
    customLogger,
    plugins: [stencilrs({ foldRuntimeFlags: true })],
    build: { write: false, lib: { entry: [join(project, 'src', 'my-cmp.tsx'), join(project, 'src', 'uses-lib.tsx')], formats: ['es'] } },
  });
  assert.ok(warnings.some((w) => /foldRuntimeFlags: 1 module\(s\) from node_modules use the Stencil runtime \(prebuilt-cmps/.test(w)), warnings.join('\n'));
});
