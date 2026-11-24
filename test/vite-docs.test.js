// `docs`, `types`, `include` and `exclude` of the Vite plugin, without @stencil/unplugin: the output is
// @stencil/unplugin's (compared here with a build of the same project through it), and TypeScript is
// never loaded while every file compiles in stencilrs.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build } from 'vite';

import { createFileFilter } from '../vite-project.js';
import stencilrs from '../vite.js';

const repo = fileURLToPath(new URL('..', import.meta.url));
const project = mkdtempSync(join(tmpdir(), 'stencilrs-docs-'));
after(() => rmSync(project, { recursive: true, force: true }));

const write = (name, text) => {
  const file = join(project, name);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, text);
};

write('src/types.ts', `export interface Row { id: string }\nexport type Size = 'sm' | 'lg';\n`);
write(
  'src/panel/panel.tsx',
  `import { Component, Prop, Event, EventEmitter, Method, State, h } from '@stencil/core';
import { Row, Size } from '../types';

/**
 * A panel.
 * @slot header - The top.
 * @part body - The body.
 * @virtualProp {"ios" | "md"} mode - The mode.
 */
@Component({ tag: 'doc-panel', styleUrl: 'panel.scss', encapsulation: { type: 'shadow' } })
export class DocPanel {
  /** The size. */
  @Prop() size: Size = 'sm';
  /** Rows. */
  @Prop() rows: Row[] = [];
  /** Shown. */
  @Prop({ reflect: true }) open = false;
  /** @deprecated Use open. */
  @Prop() label: string = 'x';
  @Prop() get kind(): string { return 'k'; }
  @State() hidden = false;
  /** Picked. */
  @Event() picked!: EventEmitter<Row>;
  /** Closes it. */
  @Method() async close(force: boolean = false): Promise<void> { this.hidden = !force; }
  render() { return <div part="body"><slot name="header" /><slot /></div>; }
}
`,
);
write(
  'src/panel/panel.scss',
  `/**
 * @prop --panel-gap: The gap between rows.
 */
:host {
  /** The panel colour. */
  --panel-color: red;
  display: block;
}
@property --panel-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
`,
);
write(
  'src/plain/plain.tsx',
  `import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
@Component({ tag: 'doc-plain' })
export class DocPlain {
  @Prop() name?: string;
  @Prop() count: number = 3;
  @Prop() required!: string;
  @Event({ bubbles: false }) changed!: EventEmitter<{ id: number }>;
  render() { return <slot />; }
}
`,
);
write('src/excluded/skipped.tsx', `import { Component, h } from '@stencil/core';\n@Component({ tag: 'doc-skipped' })\nexport class DocSkipped { render() { return <p>skipped</p>; } }\n`);
write('entry.js', `import cem from '@stencil/unplugin/docs';\nexport default cem;\n`);

const bundle = async (plugins, entry = 'entry.js') => {
  const result = await build({
    root: project,
    configFile: false,
    logLevel: 'silent',
    plugins,
    build: { write: false, minify: false, lib: { entry: join(project, entry), formats: ['es'], fileName: 'out' }, rollupOptions: { external: [/^@stencil\/core/] } },
  });
  return [result].flat()[0].output.find((o) => o.type === 'chunk').code;
};
const manifestOf = async (code) => (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).default;
const types = () => readFileSync(join(project, 'src', 'components.d.ts'), 'utf8');

// @stencil/unplugin adds `@default` and `@readonly` to a prop's tags after its docs are made; `stencil build` (docs-json) has them first.
const withoutGeneratedTags = (value) => {
  if (Array.isArray(value)) return value.map(withoutGeneratedTags);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'tags' && Array.isArray(v)) {
        const kept = v.filter((t) => t.name !== 'default' && t.name !== 'readonly');
        if (kept.length) out[k] = kept;
      } else out[k] = withoutGeneratedTags(v);
    }
    return out;
  }
  return value;
};

test('include and exclude filter as @rollup/pluginutils does', () => {
  const root = process.cwd().replaceAll('\\', '/');
  const both = createFileFilter([/\.tsx?$/], ['node_modules/**']);
  assert.equal(both(`${root}/src/a.tsx`), true);
  assert.equal(both(`${root}/node_modules/x/a.tsx`), false, 'node_modules/** is the default exclude');
  assert.equal(both('\0virtual'), false);
  const some = createFileFilter(['src/**/*.tsx', /special\.ts$/], ['**/*.spec.tsx', 'src/legacy/**']);
  assert.equal(some(`${root}/src/a/b.tsx`), true);
  assert.equal(some(`${root}/src/a/b.spec.tsx`), false);
  assert.equal(some(`${root}/src/legacy/b.tsx`), false);
  assert.equal(some(`${root}/lib/b.tsx`), false, 'not matched by include');
  assert.equal(some(`${root}/lib/special.ts`), true, 'a RegExp include');
  assert.equal(createFileFilter('src/{a,b}/*.ts')(`${root}/src/b/c.ts`), true);
  assert.equal(createFileFilter('src/{a,b}/*.ts')(`${root}/src/c/c.ts`), false);
});

test('docs and types: stencilrs writes what @stencil/unplugin writes', async () => {
  const cwd = process.cwd();
  process.chdir(project);
  try {
    const { stencilVite } = await import('@stencil/unplugin');
    const expectedCem = await manifestOf(await bundle([stencilVite({ docs: true, types: true })]));
    const expectedTypes = types();
    rmSync(join(project, 'src', 'components.d.ts'));

    const ours = await manifestOf(await bundle([stencilrs({ docs: true, types: true, resolveImports: false })]));
    assert.equal(types(), expectedTypes, 'components.d.ts');
    assert.deepEqual(withoutGeneratedTags(ours), withoutGeneratedTags(expectedCem), 'the manifest');
    assert.equal(JSON.stringify(withoutGeneratedTags(ours)), JSON.stringify(withoutGeneratedTags(expectedCem)), 'the manifest, key order too');
    // The shapes this covers.
    assert.deepEqual(ours.modules.map((m) => m.path).sort(), ['src/panel/panel.tsx', 'src/plain/plain.tsx', 'src/excluded/skipped.tsx'].sort());
    const panel = ours.modules.find((m) => m.path === 'src/panel/panel.tsx').declarations[0];
    assert.deepEqual(panel.cssProperties.map((c) => c.name).sort(), ['--panel-angle', '--panel-color', '--panel-gap']);
    assert.deepEqual(panel.slots.map((s) => s.name), ['', 'header']);
    assert.deepEqual(panel.cssParts.map((s) => s.name), ['body']);
  } finally {
    process.chdir(cwd);
  }
});

test('docs and types never import TypeScript, Stencil\'s compiler or @stencil/unplugin when every file compiles in Rust', () => {
  // A module resolve hook sees every ESM import; CommonJS goes through `require.cache`.
  const hook = `export async function resolve(specifier, context, next) {
    if (/typescript|@stencil[\\\\/]core[\\\\/](dist[\\\\/])?compiler|@stencil[\\\\/]unplugin/.test(specifier)) process.stderr.write('IMPORTED ' + specifier + '\\n');
    return next(specifier, context);
  }`;
  const script = `
    import { register, createRequire } from 'node:module';
    register('data:text/javascript,' + encodeURIComponent(${JSON.stringify(hook)}));
    const { build } = await import('vite');
    const { default: stencilrs } = await import(${JSON.stringify(pathToFileURL(join(repo, 'vite.js')).href)});
    process.chdir(${JSON.stringify(project)});
    const out = await build({ root: ${JSON.stringify(project)}, configFile: false, logLevel: 'silent',
      plugins: [stencilrs({ docs: true, types: true, include: [/\\.tsx?$/], exclude: ['node_modules/**'] })],
      build: { write: false, lib: { entry: ${JSON.stringify(join(project, 'entry.js'))}, formats: ['es'], fileName: 'out' }, rollupOptions: { external: [/^@stencil\\/core/] } } });
    const require = createRequire(import.meta.url);
    const loaded = Object.keys(require.cache).filter((f) => /[\\\\/]node_modules[\\\\/]typescript[\\\\/]/.test(f));
    process.stderr.write('CJS ' + loaded.length + ' ' + ([out].flat()[0].output[0].code.includes('doc-panel') ? 'docs-ok' : 'docs-missing') + '\\n');
  `;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: repo, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.doesNotMatch(run.stderr, /IMPORTED/, run.stderr);
  assert.match(run.stderr, /CJS 0 docs-ok/);
});

test('exclude keeps a file out of the compile and out of the docs; include limits both to what it names', async () => {
  const cwd = process.cwd();
  process.chdir(project);
  try {
    const source = readFileSync(join(project, 'src/excluded/skipped.tsx'), 'utf8');
    const ctx = { addWatchFile() {}, warn() {}, error: (m) => assert.fail(m) };
    const compile = async (options, file) => {
      const [plugin] = stencilrs(options);
      return plugin.transform.call(ctx, source, join(project, file));
    };
    const plain = await compile({}, 'src/excluded/skipped.tsx');
    assert.match(plain.code, /defineCustomElement/, 'compiled without a filter');
    assert.equal(await compile({ exclude: ['src/excluded/**'] }, 'src/excluded/skipped.tsx'), null, 'excluded');
    assert.match((await compile({ exclude: ['src/excluded/**'] }, 'src/elsewhere/skipped.tsx')).code, /defineCustomElement/, 'not excluded');
    assert.equal(await compile({ include: ['src/panel/**'] }, 'src/excluded/skipped.tsx'), null, 'not included');

    const modules = async (options) => (await manifestOf(await bundle([stencilrs({ docs: true, ...options })]))).modules.map((m) => m.path).sort();
    assert.deepEqual(await modules({ exclude: ['src/excluded/**', 'node_modules/**'] }), ['src/panel/panel.tsx', 'src/plain/plain.tsx']);
    assert.deepEqual(await modules({ include: ['src/plain/**'] }), ['src/plain/plain.tsx']);
  } finally {
    process.chdir(cwd);
  }
});

test('a project with CSS-only components is left to @stencil/unplugin', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-cssonly-'));
  const cwd = process.cwd();
  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'badge.css'), '/** @component css-badge */\n:host { color: red; }\n');
    process.chdir(dir);
    const { createProject } = await import('../vite-project.js');
    const p = createProject({ stencil: { docs: true }, root: dir, resolveImports: true });
    await p.start();
    assert.match(p.unsupported, /CSS-only components/);
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }
});
