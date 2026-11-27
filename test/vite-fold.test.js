import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

import { build } from 'vite';

import stencilrs from '../vite.js';
import { FOLD_RUNTIME_FLAGS_DEFAULT, buildFeatures, createFoldScanner, foldBuildReads, foldRuntimeFlagsOption, scanComponents, standaloneFlags } from '../vite-fold.js';

const meta = (over = {}) => ({ htmlTagNames: [], encapsulation: 'none', hasRenderFn: true, ...over });

// --- the flag computation -----------------------------------------------------------------------------------------------

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
  // form-associated, and a listener on `window`: each one component is enough.
  assert.equal(buildFeatures([meta(), meta({ formAssociated: true })]).formAssociated, true);
  assert.equal(buildFeatures([meta(), meta({ hasListener: true, hasListenerTargetWindow: true })]).hostListenerTargetWindow, true);
  assert.equal(buildFeatures([meta()]).hostListenerTargetWindow, false);
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

test('standaloneFlags: a user flag is applied before the rules that follow from it', () => {
  const f = standaloneFlags([meta()], { overrides: { slotRelocation: true } });
  assert.equal(f.slotRelocation && f.lightDomPatches && f.slotChildNodes && f.slotDomMutations && f.slotTextContent, true);
  assert.equal(standaloneFlags([meta()], { overrides: { prop: true } }).prop, true);
});

test('foldBuildReads: reads become literals, writes stay, unknown flags read undefined', () => {
  const out = foldBuildReads('if (BUILD$1.a) x(); if (BUILD.b) y(); BUILD.c = 1; if (BUILD$1.zz) z(); BUILD.a == 1;', { a: true, b: false, c: true });
  assert.equal(out, 'if (true) x(); if (false) y(); BUILD.c = 1; if (void 0) z(); true == 1;');
});

test('foldRuntimeFlags option: one constant is the default, false opts out, dirs narrow the scan', () => {
  assert.equal(FOLD_RUNTIME_FLAGS_DEFAULT, true, 'the default is on (flip it in vite-fold.js to make the option opt-in)');
  assert.deepEqual(foldRuntimeFlagsOption(undefined), { enabled: FOLD_RUNTIME_FLAGS_DEFAULT, dirs: ['src'] });
  assert.deepEqual(foldRuntimeFlagsOption(false), { enabled: false, dirs: ['src'] });
  assert.deepEqual(foldRuntimeFlagsOption(true), { enabled: true, dirs: ['src'] });
  assert.deepEqual(foldRuntimeFlagsOption({ dirs: ['a', 'b'] }), { enabled: true, dirs: ['a', 'b'] });
  assert.throws(() => foldRuntimeFlagsOption({ dir: ['a'] }), /unknown option "dir"/);
  assert.throws(() => foldRuntimeFlagsOption({ dirs: 'a' }), /dirs must be an array/);
});

// --- projects on disk -----------------------------------------------------------------------------------------------------

// Inside the repo, so that `@stencil/core` resolves from the repo's node_modules.
const tmp = mkdtempSync(join(fileURLToPath(new URL('..', import.meta.url)), '.tmp-fold-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
let counter = 0;
const write = (root, files) => {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
};
/** A project folder with `files`; `src/a.tsx` is the entry. */
const project = (files) => {
  const root = join(tmp, `p${counter++}`);
  write(root, files);
  return root;
};

const cmp = (tag, { encapsulation = 'shadow', body = '<button>{this.label}</button>', extra = '', imports = '' } = {}) => `import { Component, Prop, h${imports ? ', ' + imports : ''} } from '@stencil/core';
@Component({ tag: '${tag}', encapsulation: { type: '${encapsulation}' } })
export class C${tag.replace(/\W/g, '')} {
  @Prop() label = 'x';
${extra}
  render() { return ${body}; }
}
`;

const quiet = { info() {}, warn() {}, warnOnce() {}, error() {}, clearScreen() {}, hasErrorLogged: () => false, hasWarned: false };
const run = async (root, options, { entry = 'src/a.tsx', warnings = [], lib = {} } = {}) => {
  const entries = [entry].flat().map((e) => join(root, e));
  const result = await build({
    root,
    configFile: false,
    customLogger: { ...quiet, warn: (m) => warnings.push(m), warnOnce: (m) => warnings.push(m) },
    plugins: [stencilrs(options)],
    build: { write: false, lib: { entry: entries.length === 1 ? entries[0] : entries, formats: ['es'], fileName: 'out', ...lib } },
  });
  return [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
};

// Strings only these runtime features contain (checked against the bundles below).
const SLOT_RELOCATION = 's-sr'; // `slotReferenceDebugNode` / the slot reference of a relocated node
const FORM_ASSOCIATED = 'attachInternals';
const HYDRATE = 's-cr'; // hydration of server-rendered nodes (content reference), also present with slot relocation
const NO_HYDRATION = { buildFlags: { hydrateClientSide: false } };

// Neither compiler can find a component in this.
const BROKEN = `import { Component } from '@stencil/core';\n@Component({ tag: 'my-broken'\nexport {{{\n`;

const plainProject = () => project({ 'src/a.tsx': cmp('my-cmp') });

// --- the scan -------------------------------------------------------------------------------------------------------------

test('scanComponents reads the flags-relevant metadata of the project', async () => {
  const root = plainProject();
  const { cmps, complete, problems } = await scanComponents(root, { dirs: [join(root, 'src')] });
  assert.deepEqual(problems, []);
  assert.equal(complete, true);
  assert.equal(cmps.length, 1);
  assert.equal(cmps[0].tagName, 'my-cmp');
  assert.equal(cmps[0].hasProp, true);
});

test('the scan is cached per file and follows additions, edits and deletions', async () => {
  const root = project({ 'src/a.tsx': cmp('my-a'), 'src/b.tsx': cmp('my-b') });
  const scanner = createFoldScanner();
  const dirs = [join(root, 'src')];
  const first = await scanner.scan(root, { dirs });
  const second = await scanner.scan(root, { dirs });
  assert.equal(first.cmps.length, 2);
  // Nothing changed: the very same metadata objects, no new transpile.
  assert.ok(second.cmps.every((m) => first.cmps.includes(m)));
  // One file edited (a new mtime and size): that one is read again, the other is not.
  write(root, { 'src/b.tsx': cmp('my-b', { body: '<slot />', encapsulation: 'scoped' }) });
  const third = await scanner.scan(root, { dirs });
  const [a1] = first.cmps.filter((m) => m.tagName === 'my-a');
  assert.ok(third.cmps.includes(a1));
  assert.equal(third.cmps.find((m) => m.tagName === 'my-b').htmlTagNames.includes('slot'), true);
  // A file added, a file deleted.
  write(root, { 'src/c.tsx': cmp('my-c') });
  rmSync(join(root, 'src/a.tsx'));
  const fourth = await scanner.scan(root, { dirs });
  assert.deepEqual(fourth.cmps.map((m) => m.tagName).sort(), ['my-b', 'my-c']);
});

test('the scan sees an edit of a local module a component renders (its `<slot>`)', async () => {
  const root = project({
    'src/a.tsx': `import { Component, h } from '@stencil/core';\nimport { Body } from './body';\n@Component({ tag: 'my-a' })\nexport class A { render() { return <Body />; } }\n`,
    'src/body.tsx': `import { h } from '@stencil/core';\nexport const Body = () => <div>plain</div>;\n`,
  });
  const scanner = createFoldScanner();
  const dirs = [join(root, 'src')];
  assert.equal((await scanner.scan(root, { dirs })).cmps[0].htmlTagNames.includes('slot'), false);
  write(root, { 'src/body.tsx': `import { h } from '@stencil/core';\nexport const Body = () => <div><slot /></div>;\n` });
  assert.equal((await scanner.scan(root, { dirs })).cmps[0].htmlTagNames.includes('slot'), true);
});

test('a file stencilrs does not port yet is read by Stencil\'s compiler, and a `<slot>` in it counts', async () => {
  const root = project({
    // A `styles` that is not a string literal: a `stencilrs:` diagnostic.
    'src/a.tsx': `import { Component, h } from '@stencil/core';\nconst STYLES = ':host { color: red }';\n@Component({ tag: 'my-un', styles: STYLES })\nexport class Un { render() { return <div><slot /></div>; } }\n`,
  });
  const scan = await createFoldScanner().scan(root, { dirs: [join(root, 'src')] });
  assert.equal(scan.failed.length, 0);
  assert.equal(scan.fallback.length, 1);
  assert.equal(scan.cmps.length, 1);
  assert.equal(scan.cmps[0].tagName, 'my-un');
  assert.equal(buildFeatures(scan.cmps).slotRelocation, true);
});

// --- builds ---------------------------------------------------------------------------------------------------------------

test('the production bundle drops the runtime features no component uses, by default', async () => {
  const root = plainProject();
  const off = await run(root, { foldRuntimeFlags: false });
  const folded = await run(root, {});
  const noHydration = await run(root, NO_HYDRATION);
  assert.ok(folded.length < off.length * 0.8, `folded ${folded.length} B vs ${off.length} B`);
  assert.equal(folded, await run(root, { foldRuntimeFlags: true }), 'the default is the option on');
  // Hydration of server-rendered nodes stays on unless `buildFlags` turns it off, as without folding.
  assert.ok(noHydration.length < folded.length * 0.85, `no hydration ${noHydration.length} B vs ${folded.length} B`);
  assert.ok(off.includes(HYDRATE) && folded.includes(HYDRATE));
  assert.ok(!noHydration.includes(HYDRATE) && !folded.includes('hydrateServerSide'));
  assert.ok(off.includes(SLOT_RELOCATION) && !noHydration.includes(SLOT_RELOCATION));
  assert.ok(noHydration.includes('my-cmp'));
});

test('foldRuntimeFlags: false is the unfolded output: the components set the flags at run time', async () => {
  const root = plainProject();
  const off = await run(root, { foldRuntimeFlags: false });
  assert.ok(off.includes('slotRelocation'), 'the runtime still reads the BUILD object');
  assert.ok(!(await run(root, {})).includes('slotRelocation'), 'folded, the flags are literals');
  // Opt-out is one more build with the same bytes (nothing in it depends on the scan).
  assert.equal(off, await run(root, { foldRuntimeFlags: false }));
  // A project the scan cannot vouch for gives the very same bytes: every flag on, the components set them as before.
  const bad = project({ 'src/a.tsx': cmp('my-cmp'), 'src/broken.tsx': BROKEN });
  const offBad = await run(bad, { foldRuntimeFlags: false });
  const warnings = [];
  assert.equal(await run(bad, {}, { warnings }), offBad);
});

test('a feature used by one component survives: slot relocation in a non-shadow component', async () => {
  const root = project({ 'src/a.tsx': cmp('my-a'), 'src/b.tsx': cmp('my-b', { encapsulation: 'none', body: '<div><slot /></div>' }) });
  const plain = await run(plainProject(), NO_HYDRATION);
  const withSlot = await run(root, { ...NO_HYDRATION }, { entry: ['src/a.tsx', 'src/b.tsx'] });
  assert.ok(!plain.includes(SLOT_RELOCATION));
  assert.ok(withSlot.includes(SLOT_RELOCATION), 'the slot relocation code is in the bundle');
});

test('a feature used by one component survives: form-associated', async () => {
  const root = project({
    'src/a.tsx': cmp('my-a'),
    'src/f.tsx': `import { AttachInternals, Component, h } from '@stencil/core';\n@Component({ tag: 'my-f' })\nexport class F {\n  @AttachInternals() internals: ElementInternals;\n  render() { return <input />; }\n}\n`,
  });
  const plain = await run(plainProject(), NO_HYDRATION);
  const withForm = await run(root, NO_HYDRATION, { entry: ['src/a.tsx', 'src/f.tsx'] });
  assert.ok(!plain.includes(FORM_ASSOCIATED));
  assert.ok(withForm.includes(FORM_ASSOCIATED));
});

test('a component outside `dirs` that the bundle imports counts (no feature is lost)', async () => {
  const root = project({
    'src/app/a.tsx': cmp('my-a') + `import './../shared/wide';\n`,
    'src/shared/wide.tsx': cmp('my-wide', { encapsulation: 'none', body: '<div><slot /></div>' }),
  });
  const warnings = [];
  const out = await run(root, { ...NO_HYDRATION, foldRuntimeFlags: { dirs: ['src/app'] } }, { entry: 'src/app/a.tsx', warnings });
  assert.ok(out.includes(SLOT_RELOCATION));
  assert.deepEqual(warnings, []);
});

test('a file neither stencilrs nor Stencil can read keeps every flag on, with one warning naming the file', async () => {
  const root = project({
    'src/a.tsx': cmp('my-a'),
    'src/broken.tsx': BROKEN,
  });
  const warnings = [];
  const out = await run(root, { buildFlags: { hydrateClientSide: false } }, { entry: 'src/a.tsx', warnings });
  const mine = warnings.filter((w) => /foldRuntimeFlags/.test(w));
  assert.equal(mine.length, 1, warnings.join('\n'));
  assert.match(mine[0], /broken\.tsx/);
  assert.match(mine[0], /every runtime feature stays on/i);
  assert.ok(out.includes(SLOT_RELOCATION), 'nothing was folded away');
});

test('a package of prebuilt components keeps every flag on, with one warning naming it', async () => {
  const root = project({
    'src/a.tsx': cmp('my-a'),
    'src/uses.ts': `import { view } from 'prebuilt-cmps';\nexport const v = view();\n`,
    'node_modules/prebuilt-cmps/package.json': JSON.stringify({ name: 'prebuilt-cmps', version: '1.0.0', main: 'index.js', type: 'module', peerDependencies: { '@stencil/core': '*' } }),
    'node_modules/prebuilt-cmps/index.js': `import { h } from '@stencil/core';\nexport const view = () => h('div', null);\n`,
  });
  const warnings = [];
  const out = await run(root, NO_HYDRATION, { warnings, entry: ['src/a.tsx', 'src/uses.ts'] });
  const mine = warnings.filter((w) => /foldRuntimeFlags/.test(w));
  assert.equal(mine.length, 1, warnings.join('\n'));
  assert.match(mine[0], /prebuilt-cmps/);
  assert.ok(out.includes(SLOT_RELOCATION));
});

// The scan follows what the bundler resolves, aliases and workspace packages included: a component behind an alias counts.
test('a component reached through a path alias counts (the bundler resolves it)', async () => {
  const root = project({
    'src/a.tsx': cmp('my-a'),
    'src/uses.ts': `import '@lib/wide';\n`,
    'lib/wide.tsx': cmp('my-wide', { encapsulation: 'none', body: '<div><slot /></div>' }),
  });
  const warnings = [];
  const out = await build({
    root,
    configFile: false,
    customLogger: { ...quiet, warn: (m) => warnings.push(m), warnOnce: (m) => warnings.push(m) },
    resolve: { alias: { '@lib': join(root, 'lib') } },
    plugins: [stencilrs(NO_HYDRATION)],
    build: { write: false, lib: { entry: [join(root, 'src/a.tsx'), join(root, 'src/uses.ts')], formats: ['es'] } },
  });
  assert.deepEqual(warnings, []);
  assert.ok([out].flat().flatMap((r) => r.output.map((o) => o.code ?? '')).join('\n').includes(SLOT_RELOCATION));
});

test('a module that uses the runtime and was never scanned is reported at the end of the build', async () => {
  const root = project({
    // `import.meta.glob` reaches files no import names: the scan cannot see them.
    'src/a.tsx': cmp('my-a'),
    'src/uses.ts': `export const mods = import.meta.glob('../lib/*.ts', { eager: true });\n`,
    'lib/view.ts': `import { h } from '@stencil/core';\nexport const view = () => h('div', null);\n`,
  });
  const warnings = [];
  await build({
    root,
    configFile: false,
    customLogger: { ...quiet, warn: (m) => warnings.push(m), warnOnce: (m) => warnings.push(m) },
    plugins: [stencilrs(NO_HYDRATION)],
    build: { write: false, lib: { entry: [join(root, 'src/a.tsx'), join(root, 'src/uses.ts')], formats: ['es'] } },
  });
  const mine = warnings.filter((w) => /foldRuntimeFlags/.test(w));
  assert.equal(mine.length, 1, warnings.join('\n'));
  assert.match(mine[0], /lib\/view\.ts/);
});

test('buildFlags win over the computed flags, and what follows from them follows', async () => {
  const root = plainProject();
  const base = await run(root, NO_HYDRATION);
  assert.ok(!base.includes(SLOT_RELOCATION));
  const forced = await run(root, { buildFlags: { hydrateClientSide: false, slotRelocation: true } });
  assert.ok(forced.includes(SLOT_RELOCATION));
  assert.ok(forced.length > base.length);
});

test('hydrateClient keeps hydration on, over a buildFlags that turns it off', async () => {
  const root = plainProject();
  const out = await run(root, { hydrateClient: { split: false, manifest: false }, buildFlags: { hydrateClientSide: false } });
  assert.ok(out.includes(HYDRATE));
  const without = await run(root, NO_HYDRATION);
  assert.ok(!without.includes(HYDRATE));
});

test('a watch rebuild computes the flags again when a component file changes', async () => {
  const root = project({ 'src/a.tsx': cmp('my-cmp') });
  const outputs = [];
  let step = 0;
  const watcher = await build({
    root,
    configFile: false,
    customLogger: quiet,
    plugins: [
      stencilrs(NO_HYDRATION),
      {
        name: 'collect',
        generateBundle(_, bundle) {
          outputs.push(Object.values(bundle).filter((o) => o.type === 'chunk').map((o) => o.code).join('\n'));
        },
      },
    ],
    build: { watch: {}, write: false, lib: { entry: join(root, 'src/a.tsx'), formats: ['es'] } },
  });
  const next = () => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no rebuild after step ${step}`)), 20000);
    const want = outputs.length + 1;
    const poll = setInterval(() => {
      if (outputs.length >= want) {
        clearTimeout(timer);
        clearInterval(poll);
        resolve(outputs[want - 1]);
      }
    }, 50);
  });
  try {
    const first = await next();
    assert.ok(!first.includes(SLOT_RELOCATION));
    // The component gets a `<slot>` in light DOM: the rebuild must have slot relocation.
    step = 1;
    const rebuilt = next();
    await new Promise((r) => setTimeout(r, 300));
    write(root, { 'src/a.tsx': cmp('my-cmp', { encapsulation: 'none', body: '<div><slot /></div>' }) });
    const second = await rebuilt;
    assert.ok(second.includes(SLOT_RELOCATION), 'the rebuild has slot relocation');
    // And back: the flags shrink again.
    step = 2;
    const back = next();
    await new Promise((r) => setTimeout(r, 300));
    write(root, { 'src/a.tsx': cmp('my-cmp') });
    assert.ok(!(await back).includes(SLOT_RELOCATION), 'the rebuild after it is folded again');
  } finally {
    await watcher.close();
  }
});

test('a scanned project is read once per build: a second build is as fast as the stamps allow', async () => {
  const root = project(Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`src/c${i}.tsx`, cmp(`my-c${i}`)])));
  const scanner = createFoldScanner();
  const dirs = [join(root, 'src')];
  const cold = await scanner.scan(root, { dirs });
  const warm = await scanner.scan(root, { dirs });
  assert.equal(cold.cmps.length, 40);
  assert.ok(warm.cmps.every((m) => cold.cmps.includes(m)));
  assert.ok(warm.ms < Math.max(cold.ms, 20), `warm ${warm.ms.toFixed(1)} ms, cold ${cold.ms.toFixed(1)} ms`);
  // touching a file without changing it re-reads that one only
  const later = new Date(Date.now() + 5000);
  utimesSync(join(root, 'src/c0.tsx'), later, later);
  const touched = await scanner.scan(root, { dirs });
  assert.equal(touched.cmps.filter((m) => !cold.cmps.includes(m)).length, 1);
});

test('a file read by Stencil\'s compiler keeps its features in the build, without a warning', async () => {
  const root = project({
    'src/a.tsx': `import { Component, h } from '@stencil/core';\nconst STYLES = ':host { color: red }';\n@Component({ tag: 'my-un', encapsulation: { type: 'none' }, styles: STYLES })\nexport class Un { render() { return <div><slot /></div>; } }\n`,
  });
  const warnings = [];
  const out = await run(root, NO_HYDRATION, { warnings });
  assert.deepEqual(warnings, []);
  assert.ok(out.includes(SLOT_RELOCATION));
  assert.ok(out.length < (await run(root, { foldRuntimeFlags: false })).length * 0.8);
});

test('a package of components that bundles a runtime of its own (a standalone build) does not stop the fold', async () => {
  const root = project({
    'src/a.tsx': cmp('my-a'),
    'src/uses.ts': `import { view } from 'standalone-cmps/view.js';\nexport const v = view();\n`,
    'node_modules/standalone-cmps/package.json': JSON.stringify({ name: 'standalone-cmps', version: '1.0.0', type: 'module', dependencies: { '@stencil/core': '*' }, collection: 'dist/collection/collection-manifest.json' }),
    'node_modules/standalone-cmps/view.js': `import { r } from './runtime.js';\nexport const view = () => r('div');\n`,
    'node_modules/standalone-cmps/runtime.js': `export const r = (tag) => ({ tag });\n`,
  });
  const warnings = [];
  const out = await run(root, NO_HYDRATION, { warnings, entry: ['src/a.tsx', 'src/uses.ts'] });
  assert.deepEqual(warnings, []);
  assert.ok(!out.includes(SLOT_RELOCATION), 'folded');
});

test('a build whose @stencil/core is external is not folded: the components keep setting the flags of the consumer\'s runtime', async () => {
  const root = plainProject();
  const external = { rollupOptions: { external: [/^@stencil\/core/] } };
  const run2 = async (options) => {
    const result = await build({
      root,
      configFile: false,
      customLogger: quiet,
      plugins: [stencilrs(options)],
      build: { write: false, minify: false, ...external, lib: { entry: join(root, 'src/a.tsx'), formats: ['es'] } },
    });
    return [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
  };
  const folded = await run2(NO_HYDRATION);
  assert.equal(folded, await run2({ ...NO_HYDRATION, foldRuntimeFlags: false }));
  assert.match(folded, /app-data/);
});

test('the scan and the build share one compile per component, the very result `transform` would compute', async () => {
  const { transpile } = await import('../index.js');
  const source = cmp('my-a', { encapsulation: 'none', body: '<div><slot /></div>' });
  const root = project({ 'src/a.tsx': source });
  const file = join(root, 'src/a.tsx').replaceAll('\\', '/');
  const options = (code, f) => ({ file: f, resolveImports: true, componentExport: 'customelement', useDefineForClassFields: true, jsx: 'classic' });
  const scanner = createFoldScanner({ compileOptions: options });
  const asked = scanner.compile(file, source, 'build'); // the build's transform asks first
  assert.equal(scanner.compile(file, source, 'build'), asked, 'the same compile, not a second one');
  const scan = await scanner.scan(root, { dirs: [join(root, 'src')] });
  assert.equal(buildFeatures(scan.cmps).slotRelocation, true);
  const handed = await asked;
  const plain = transpile(source, options(source, file));
  assert.equal(handed.code, plain.code, 'the code is exactly the one without any metadata');
  assert.equal(handed.map, plain.map);
  assert.deepEqual(handed.diagnostics, plain.diagnostics);
  assert.equal(handed.compilerMeta.length, 1);
  // another source is another compile
  assert.notEqual(scanner.compile(file, source + ' ', 'build'), asked);
});

test('a member with no default (`"defaultValue": undefined` in the compiler\'s metadata) is read without compiling the literal', async () => {
  const root = project({ 'src/a.tsx': cmp('my-a', { extra: '  @Prop() nothing?: string;' }) });
  const { cmps } = await scanComponents(root, { dirs: [join(root, 'src')] });
  assert.equal(cmps.length, 1);
  assert.equal(cmps[0].hasProp, true);
  assert.equal(cmps[0].properties.find((p) => p.name === 'nothing').defaultValue, undefined);
});

test('a watch rescan asks the bundler once per specifier, and again when a file appears or disappears', async () => {
  const root = project({
    'src/a.tsx': `import { Component, h } from '@stencil/core';\nimport '@lib/wide';\n@Component({ tag: 'my-a' })\nexport class A { render() { return <div />; } }\n`,
    'lib/wide.tsx': cmp('my-wide', { encapsulation: 'none', body: '<div><slot /></div>' }),
  });
  const asked = [];
  const resolveSpec = async (spec) => {
    asked.push(spec);
    return { id: join(root, 'lib/wide.tsx') };
  };
  const scanner = createFoldScanner();
  const options = { dirs: [join(root, 'src')], resolveSpec, aliases: ['@lib'] };
  const first = await scanner.scan(root, options);
  assert.deepEqual(asked, ['@lib/wide']);
  assert.deepEqual(first.cmps.map((m) => m.tagName).sort(), ['my-a', 'my-wide']);
  const second = await scanner.scan(root, options);
  assert.deepEqual(asked, ['@lib/wide'], 'the answer is remembered');
  assert.deepEqual(second.cmps.map((m) => m.tagName).sort(), ['my-a', 'my-wide']);
  write(root, { 'src/b.ts': 'export const b = 1;\n' });
  await scanner.scan(root, options);
  assert.deepEqual(asked, ['@lib/wide', '@lib/wide'], 'a new file may change what a specifier resolves to');
  // The file it resolved to is gone: the component is gone from the project, and the bundler is asked again.
  rmSync(join(root, 'lib/wide.tsx'));
  const gone = await scanner.scan(root, options);
  assert.deepEqual(gone.cmps.map((m) => m.tagName), ['my-a']);
  assert.equal(asked.length, 3);
});
