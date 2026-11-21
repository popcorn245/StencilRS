import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { build } from 'vite';

import stencilrs from '../vite.js';

const require = createRequire(import.meta.url);
// TypeScript is CommonJS: if anything loaded it, it is in the module cache.
const typescriptLoaded = () => Object.keys(require.cache).some((f) => /[\\/]node_modules[\\/]typescript[\\/]/.test(f));

const project = mkdtempSync(join(tmpdir(), 'stencilrs-vite-'));
after(() => rmSync(project, { recursive: true, force: true }));

const component = (tag, cls) => `import { Component, h } from '@stencil/core';
@Component({ tag: '${tag}' })
export class ${cls} {
  render() { return <div>${tag}</div>; }
}
`;
// Non-string `styles` is something stencilrs has not ported yet: the file is left to Stencil's compiler.
const unported = `import { Component, h } from '@stencil/core';
const css = ':host { color: red; }';
@Component({ tag: 'cmp-unported', styles: css })
export class CmpUnported {
  render() { return <div>cmp-unported</div>; }
}
`;
const ported = component('cmp-ported', 'CmpPorted');
const write = (name, text) => {
  mkdirSync(join(project, 'src'), { recursive: true });
  writeFileSync(join(project, 'src', name), text);
};
write('ported.tsx', ported);
write('unported.tsx', unported);
// A decorated word in a doc comment is not a decorated class.
write('util.ts', `/** Kept apart: a @Component() file may only export its class. */\nexport const x: number = 1;\n`);

const run = async (entry, options = {}) => {
  const result = await build({
    root: project,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs(options)],
    build: {
      write: false,
      lib: { entry: join(project, 'src', entry), formats: ['es'], fileName: 'out' },
      rollupOptions: { external: [/^@stencil\/core/] },
    },
  });
  return [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
};

test('a build stencilrs compiles entirely never loads TypeScript', async () => {
  write('both-ok.ts', `import './ported.tsx';\nimport { x } from './util.ts';\nconsole.log(x);\n`);
  const code = await run('both-ok.ts');
  assert.match(code, /cmp-ported/);
  assert.match(code, /defineCustomElement/);
  assert.equal(typescriptLoaded(), false, 'TypeScript was loaded');
});

test('a file stencilrs has not ported falls back to Stencil\'s compiler, loaded on demand', async () => {
  const code = await run('unported.tsx');
  assert.match(code, /cmp-unported/);
  assert.match(code, /defineCustomElement/);
  assert.equal(typescriptLoaded(), true, 'the fallback did not load Stencil\'s compiler');
});

test('fallback: false makes an unported file an error', async () => {
  await assert.rejects(run('unported.tsx', { fallback: false }), /not ported yet/);
});

test('a mode stylesheet of a scoped component is scoped to sc-<tag>-<mode>, the class the runtime sets', async () => {
  write('moded.tsx', `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-moded', styleUrls: { ios: 'moded.ios.css', md: 'moded.md.css' }, encapsulation: { type: 'scoped' } })
export class CmpModed { render() { return <div>x</div>; } }
`);
  write('moded.ios.css', ':host { display: block; } .a { color: red; }');
  write('moded.md.css', ':host { display: flex; }');
  const code = await run('moded.tsx');
  assert.match(code, /\.sc-cmp-moded-ios-h/);
  assert.match(code, /\.sc-cmp-moded-md-h/);
  assert.doesNotMatch(code, /\.sc-cmp-moded-h\b/);
});

test('component CSS: Stencil\'s autoprefix targets by default, `css` options to change them', async () => {
  write('styled.tsx', `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-styled', styleUrl: 'styled.css', encapsulation: { type: 'shadow' } })
export class CmpStyled { render() { return <div>x</div>; } }
`);
  write('styled.css', ':host { backdrop-filter: blur(2px); font-weight: bold; background: none; }');
  const out = async (css) => (await run('styled.tsx', css ? { css } : {})).match(/:host[^`"]*/)?.[0] ?? '';
  const stencil = await out();
  assert.match(stencil, /-webkit-backdrop-filter/, 'prefixed for the targets of `stencil build`');
  assert.match(stencil, /font-weight:\s*bold/, 'values as authored');
  assert.match(stencil, /background:\s*none/);
  assert.doesNotMatch(stencil, /\\n/, 'whitespace compacted');
  const legacy = await out({ targets: false, minify: true });
  assert.doesNotMatch(legacy, /-webkit-backdrop-filter/);
  assert.match(legacy, /font-weight:\s*700/, 'lightningcss minify');
  assert.match(await out({ targets: ['safari 13'] }), /-webkit-backdrop-filter/);
});

test('a util importing from @stencil/core gets the runtime the components use', async () => {
  write('mode-util.ts', `import { getMode } from '@stencil/core';\nexport const m = (el: HTMLElement) => getMode(el);\n`);
  write('uses-util.ts', `import './ported.tsx';\nimport { m } from './mode-util.ts';\nconsole.log(m);\n`);
  // (the shared `run` externalizes bare '@stencil/core' before any plugin sees it: only its subpaths here)
  const result = await build({
    root: project,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs()],
    build: { write: false, lib: { entry: join(project, 'src', 'uses-util.ts'), formats: ['es'], fileName: 'out' }, rollupOptions: { external: [/^@stencil\/core\//] } },
  });
  const code = [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
  assert.match(code, /@stencil\/core\/runtime\/client\/standalone/);
  assert.doesNotMatch(code, /from ['"]@stencil\/core['"]/);
});

test('a tsconfig with useDefineForClassFields: false makes @Prop defaults constructor assignments', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-udf-'));
  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { jsx: 'react', jsxFactory: 'h', useDefineForClassFields: false } }));
    writeFileSync(
      join(dir, 'src', 'p.tsx'),
      `import { Component, Prop, h } from '@stencil/core';\n@Component({ tag: 'cmp-p' })\nexport class CmpP { @Prop() kind = 'a'; render() { return <div>{this.kind}</div>; } }\n`,
    );
    const result = await build({
      root: dir,
      configFile: false,
      logLevel: 'silent',
      plugins: [stencilrs()],
      build: { write: false, lib: { entry: join(dir, 'src', 'p.tsx'), formats: ['es'], fileName: 'out' }, rollupOptions: { external: [/^@stencil\/core/] } },
    });
    const code = [result].flat().flatMap((r) => r.output.filter((o) => o.type === 'chunk').map((o) => o.code)).join('\n');
    assert.match(code, /__registerHost\(\)[\s\S]*this\.kind = "a"/);
    assert.doesNotMatch(code, /^\s*kind = "a"/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('component Sass is cached across rebuilds and never served stale: an edited stylesheet or partial recompiles', async () => {
  write('sassy.tsx', `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-sassy', styleUrl: 'sassy.scss', encapsulation: { type: 'shadow' } })
export class CmpSassy { render() { return <div>x</div>; } }
`);
  write('_vars.scss', '$c: red;');
  write('sassy.scss', "@use 'vars'; :host { color: vars.$c; }");
  const { createCssPipeline } = await import('../vite-css.js');
  const id = `\0stencil-css:${join(project, 'src', 'sassy')}?tag=cmp-sassy&encapsulation=shadow&__ext=scss`;
  const load = createCssPipeline({ cache: 'memory' });
  const first = await load(id, false);
  assert.match(first.code, /color:\s*(?:red|#f00)/);
  assert.deepEqual(first.deps, [join(project, 'src', '_vars.scss')]);
  assert.equal(await load(id, false), first, 'nothing changed: the earlier result is reused');
  write('_vars.scss', '$c: blue;');
  assert.match((await load(id, false)).code, /color:\s*(?:blue|#00f)/, 'an edited partial rebuilds the stylesheet');
  write('sassy.scss', "@use 'vars'; :host { color: vars.$c; margin: 0; }");
  assert.match((await load(id, false)).code, /margin/, 'an edited stylesheet rebuilds');
  assert.match((await load(id, true)).code, /color:\s*(?:blue|#00f)/, 'dev and build outputs are kept apart');
  // A new plugin instance (a cold build) reads the disk cache: still correct after the partial changed in between.
  const cold = createCssPipeline();
  assert.match((await cold(id, false)).code, /color:\s*(?:blue|#00f)/);
  write('_vars.scss', '$c: green;');
  assert.match((await createCssPipeline()(id, false)).code, /color:\s*(?:green|#008000)/, 'the disk cache is checked against the partial\'s content');
  assert.match((await createCssPipeline({ sass: { loadPaths: [] } })(id, false)).code, /color:\s*(?:green|#008000)/);
});

test('component Sass in a Vite build: an edited partial changes the next build', async () => {
  write('_tone.scss', '$t: red;');
  write('toned.scss', "@use 'tone'; :host { color: tone.$t; }");
  write('toned.tsx', `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-toned', styleUrl: 'toned.scss', encapsulation: { type: 'shadow' } })
export class CmpToned { render() { return <div>x</div>; } }
`);
  assert.match(await run('toned.tsx'), /color:\s*(?:red|#f00)/);
  write('_tone.scss', '$t: blue;');
  assert.match(await run('toned.tsx'), /color:\s*(?:blue|#00f)/);
});

test('a rebuild reuses what an unchanged component compiled to, until its source or a file it read changes', async () => {
  const dir = join(project, 'memo');
  mkdirSync(dir, { recursive: true });
  const typesFile = join(dir, 'types.ts');
  const cmpFile = join(dir, 'memo-cmp.tsx');
  writeFileSync(typesFile, `export type Size = 'small' | 'large';\n`);
  const source = `import { Component, Prop, h } from '@stencil/core';
import { Size } from './types';
@Component({ tag: 'memo-cmp' })
export class MemoCmp {
  @Prop() size: Size = 'small';
  render() { return <div>{this.size}</div>; }
}
`;
  writeFileSync(cmpFile, source);
  const [plugin] = stencilrs();
  plugin.configResolved({ command: 'build', root: project, plugins: [] });
  const ctx = { addWatchFile() {}, warn() {}, error: (m) => assert.fail(m), info() {}, resolve: async () => null };
  const compile = async (code = source) => {
    await plugin.buildStart.call(ctx);
    return plugin.transform.call(ctx, code, cmpFile, {});
  };
  const first = await compile();
  assert.ok(first.code.includes('memo-cmp'));
  assert.equal(await compile(), first, 'nothing changed: the same result');
  const second = await compile(source.replace('<div>', '<section>').replace('</div>', '</section>'));
  assert.notEqual(second, first);
  assert.ok(second.code.includes('section'));
  // The file the metadata came from changes (new size, new mtime): the component compiles again.
  await new Promise((r) => setTimeout(r, 20));
  writeFileSync(typesFile, `export type Size = 1 | 2;\n`);
  const third = await compile(source);
  assert.notEqual(third, first);
  assert.notEqual(third.code, first.code, 'the metadata follows the edited type');
  assert.equal(await compile(source), third, 'and is kept again');
});

test('serve pre-bundles the runtime imports the transform injects; Vite merges the user include', () => {
  const run = (options, command, userConfig = {}) => stencilrs(options)[0].config(userConfig, { command, mode: 'development' });
  const want = ['@stencil/core/app-data', '@stencil/core/runtime/client/standalone'];
  assert.deepEqual(run({}, 'serve').optimizeDeps.include, want);
  // Only the plugin's own entries: the user's `include` is left to Vite's array merge.
  assert.deepEqual(run({}, 'serve', { optimizeDeps: { include: ['lodash'] } }).optimizeDeps.include, want);
  assert.equal(run({}, 'build').optimizeDeps, undefined);
  assert.equal(run({ componentExport: 'ssr' }, 'serve').optimizeDeps, undefined);
  assert.equal(run({ mode: 'spec-page' }, 'serve').optimizeDeps, undefined);
});

test('a watch rebuild does not scan the stylesheets again, but a stylesheet that starts importing a virtual global is still handled', async () => {
  const root = join(project, 'watch-scan');
  mkdirSync(join(root, 'src'), { recursive: true });
  const sheet = join(root, 'src', 'a.css');
  writeFileSync(sheet, ':host { color: red; }');
  const generated = join(root, 'node_modules', '.stencil', 'virtual-css', 'build');
  const [plugin] = stencilrs();
  plugin.configResolved({ command: 'build', root, plugins: [] });
  const ctx = { addWatchFile() {}, warn() {}, error: (m) => assert.fail(m), info() {}, resolve: async () => null, meta: { watchMode: true } };
  await plugin.buildStart.call(ctx);
  assert.ok(!existsSync(generated), 'no stylesheet imports a virtual global: @stencil/unplugin stays unloaded');
  // The file changes behind the plugin's back (no watchChange): proof that a rebuild does not read the project again.
  writeFileSync(sheet, "@import 'stencil-css-components';");
  await plugin.buildStart.call(ctx);
  assert.ok(!existsSync(generated), 'the rebuild did not scan');
  // A rebuild that reports the change.
  plugin.watchChange.call(ctx, sheet, { event: 'update' });
  await plugin.buildStart.call(ctx);
  assert.ok(existsSync(generated), 'the stylesheet now imports a virtual global: generated before the build');
});

test('a stylesheet created after the first scan that imports a virtual global is handled when it is loaded', async () => {
  const root = join(project, 'watch-new');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'a.css'), ':host { color: red; }');
  const generated = join(root, 'node_modules', '.stencil', 'virtual-css', 'build');
  const [plugin] = stencilrs();
  plugin.configResolved({ command: 'build', root, plugins: [] });
  const ctx = { addWatchFile() {}, warn() {}, error: (m) => assert.fail(m), info() {}, resolve: async () => null, meta: { watchMode: true } };
  await plugin.buildStart.call(ctx);
  writeFileSync(join(root, 'src', 'new.css'), "@import 'stencil-hydrate';");
  assert.ok(!existsSync(generated));
  // Not in the watch graph, so no watchChange; the build that imports it loads it.
  await plugin.load.call(ctx, `\0stencil-css:${join(root, 'src', 'new')}?tag=x-y&encapsulation=none&__ext=css`);
  assert.ok(existsSync(generated));
});

test('the verbose message counts the build it ends: compiled apart from reused', async () => {
  const dir = join(project, 'counter');
  mkdirSync(dir, { recursive: true });
  const cmpFile = join(dir, 'counter-cmp.tsx');
  writeFileSync(cmpFile, component('counter-cmp', 'CounterCmp'));
  const [plugin] = stencilrs({ verbose: true });
  plugin.configResolved({ command: 'build', root: project, plugins: [] });
  const messages = [];
  const ctx = { addWatchFile() {}, warn() {}, error: (m) => assert.fail(m), info: (m) => messages.push(m), resolve: async () => null };
  const rebuild = async () => {
    messages.length = 0;
    await plugin.buildStart.call(ctx);
    await plugin.transform.call(ctx, component('counter-cmp', 'CounterCmp'), cmpFile, {});
    plugin.buildEnd.call(ctx);
    return messages.join('\n');
  };
  assert.match(await rebuild(), /compiled 1 component file\(s\), reused 0;/);
  assert.match(await rebuild(), /compiled 0 component file\(s\), reused 1;/);
  assert.match(await rebuild(), /compiled 0 component file\(s\), reused 1;/, 'not accumulated over rebuilds');
});

test('a stylesheet is not read again by a rebuild while its stamp is unchanged', async () => {
  const dir = join(project, 'stamp');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'plain.css');
  writeFileSync(file, ':host { color: red; }');
  const old = new Date(Date.now() - 60_000);
  utimesSync(file, old, old); // older than the 2 s racy window
  const { createCssPipeline } = await import('../vite-css.js');
  const load = createCssPipeline({ cache: 'memory' });
  const id = `\0stencil-css:${join(dir, 'plain')}?tag=cmp-plain&encapsulation=none&__ext=css`;
  const first = await load(id, false);
  assert.match(first.code, /color:\s*(?:red|#f00)/);
  // Same size and mtime, different text: only a re-read would notice.
  writeFileSync(file, ':host { color: tan; }');
  utimesSync(file, old, old);
  assert.equal((await load(id, false)).code, first.code, 'unchanged stamp: the earlier text is used');
  writeFileSync(file, ':host { color: green; margin: 0; }');
  assert.match((await load(id, false)).code, /green/, 'a changed stamp reads the file again');
});

test('serve does not watch the folders `stencil build` writes into; merged with the user ignored (string, function, array)', async () => {
  const { mergeConfig } = await import('vite');
  const win = process.platform === 'win32';
  const root = win ? 'C:\\proj (1)' : '/proj (1)';
  const run = (options, command, userConfig = {}) => stencilrs(options)[0].config({ root, ...userConfig }, { command, mode: 'development' });
  const [ignore] = run({}, 'serve').server.watch.ignored;
  const p = (rel) => (win ? `C:\\proj (1)\\${rel}` : `/proj (1)/${rel}`);
  for (const dir of ['www', 'dist', 'loader', 'hydrate', '.stencil']) {
    assert.equal(ignore(p(dir)), true, dir);
    assert.equal(ignore(p(`${dir}/build/app.js`)), true, `${dir}/...`);
  }
  // Source and look-alikes are never ignored; neither is a same-named folder deeper down.
  for (const rel of ['src/components/a.tsx', 'src/dist/a.ts', 'index.html', 'wwwroot/a.js', 'distance.ts', 'docs.json']) assert.equal(ignore(p(rel)), false, rel);
  assert.equal(ignore('/elsewhere/www/a.js'), false);

  // Vite concatenates a string, a function or an array with the plugin's entry.
  const userFn = () => false;
  for (const user of ['**/mine/**', userFn, ['**/a/**', userFn]]) {
    const merged = mergeConfig({ root, server: { watch: { ignored: user } } }, run({}, 'serve'));
    const list = merged.server.watch.ignored;
    assert.ok(Array.isArray(list) && list.length === [user].flat().length + 1, 'user entries kept, plugin entry added');
    for (const u of [user].flat()) assert.ok(list.includes(u));
  }

  // Off, replaced, not for build, or a watcher the user turned off.
  assert.equal(run({ watchIgnore: false }, 'serve').server, undefined);
  assert.equal(run({ watchIgnore: [] }, 'serve').server, undefined);
  assert.equal(run({}, 'build').server, undefined);
  assert.equal(run({}, 'serve', { server: { watch: null } }).server, undefined);
  const [custom] = run({ watchIgnore: ['components', './out/'] }, 'serve').server.watch.ignored;
  assert.deepEqual([custom(p('components/x.js')), custom(p('out/x.js')), custom(p('www/x.js'))], [true, true, false]);
});
