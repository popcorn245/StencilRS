import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

import { build } from 'vite';

import { generateTypes } from '../index.js';
import stencilrs from '../vite.js';

const require = createRequire(import.meta.url);
const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const project = mkdtempSync(join(tmpdir(), 'stencilrs-types-'));
after(() => rmSync(project, { recursive: true, force: true }));
// So `@stencil/core/runtime` and `typescript` resolve from the project.
symlinkSync(join(repo, 'node_modules'), join(project, 'node_modules'), 'dir');

const write = (name, text) => {
  const file = join(project, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
};

write('stubs/some-package.d.ts', 'export interface Config { debug: boolean }\n');
write('src/types.ts', `export interface Foo { a: string }\nexport type Bar = number;\n`);
const cornProbe = `import { Component, Prop, Event, EventEmitter, Method } from '@stencil/core';
import { Foo, Bar as Baz } from './types';
import type { Config } from 'some-package';

export interface Local { x: number }
interface Secret { y: number }

/** A probe. */
@Component({ tag: 'corn-probe', styleUrl: 'corn-probe.css', encapsulation: { type: 'shadow' } })
export class CornProbe {
  /** The topology to show. */
  @Prop() topology: { nodes: { id: string }[] } = { nodes: [] };
  @Prop() src?: string;
  @Prop() required!: Foo;
  @Prop() renamed: Baz;
  @Prop() local: Local;
  @Prop() secret: Secret;
  @Prop() config: Config;
  @Prop() unknown: SomeAmbientThing;
  @Event() cornSelect!: EventEmitter<{ id: string }>;
  /** Fired with a Foo. */
  @Event() fooPicked: EventEmitter<Foo>;
  @Event() plain: EventEmitter;
  /** Focus a node. */
  @Method() async focusNode(id: string): Promise<void> {}
  @Method() async getFoo(): Promise<Foo> { return null as any; }
}
`;
const cornProbeFile = write('src/corn-probe.tsx', cornProbe);
const outFile = join(project, 'dist/components.d.ts');
const gen = generateTypes([{ file: cornProbeFile, source: cornProbe }], { outFile });
const dts = gen.code;
// `tag: 'x'` plus the second component, in a file of its own.
const plainSource = `import { Component, h } from '@stencil/core';
@Component({ tag: 'app-plain' })
export class AppPlain { render() { return <p/>; } }
`;

test('element interface carries @Prop properties and @Method methods', () => {
  assert.deepEqual(gen.components, ['corn-probe']);
  assert.match(dts, /export namespace Components \{[\s\S]*interface CornProbe \{/);
  assert.match(dts, /"topology": \{ nodes: \{ id: string \}\[\] \};/);
  assert.match(dts, /"focusNode": \(id: string\) => Promise<void>;/);
  assert.match(dts, /"getFoo": \(\) => Promise<Foo>;/);
  assert.match(dts, /interface HTMLCornProbeElement extends Components\.CornProbe, HTMLStencilElement \{/);
  assert.match(dts, /var HTMLCornProbeElement: \{\n\s+prototype: HTMLCornProbeElement;\n\s+new \(\): HTMLCornProbeElement;/);
});

test('the tag is in HTMLElementTagNameMap', () => {
  assert.match(dts, /interface HTMLElementTagNameMap \{\n\s+"corn-probe": HTMLCornProbeElement;/);
});

test('custom events are typed, with Stencil\'s CustomEvent interface and addEventListener overloads', () => {
  assert.match(dts, /export interface CornProbeCustomEvent<T> extends CustomEvent<T> \{\n\s+detail: T;\n\s+target: HTMLCornProbeElement;/);
  assert.match(dts, /interface HTMLCornProbeElementEventMap \{\n\s+"cornSelect": \{ id: string \};/);
  assert.match(dts, /addEventListener<K extends keyof HTMLCornProbeElementEventMap>\(type: K, listener: \(this: HTMLCornProbeElement, ev: CornProbeCustomEvent<HTMLCornProbeElementEventMap\[K\]>\)/);
  assert.match(dts, /"plain": any;/);
});

test('JSX: LocalJSX, IntrinsicElements and the @stencil/core augmentation', () => {
  assert.match(dts, /declare namespace LocalJSX \{\n\s+\/\*\* A probe\. \*\/\n\s+interface CornProbe \{/);
  assert.match(dts, /"onCornSelect"\?: \(event: CornProbeCustomEvent<\{ id: string \}>\) => void;/);
  assert.match(dts, /"onFooPicked"\?: \(event: CornProbeCustomEvent<Foo>\) => void;/);
  assert.match(dts, /interface IntrinsicElements \{\n\s+"corn-probe": CornProbe;/);
  assert.match(dts, /export \{ LocalJSX as JSX \};/);
  assert.match(dts, /declare module "@stencil\/core" \{[\s\S]*"corn-probe": LocalJSX\.IntrinsicElements\["corn-probe"\] & JSXBase\.HTMLAttributes<HTMLCornProbeElement>;/);
  assert.match(dts, /import \{ HTMLStencilElement, JSXBase \} from "@stencil\/core\/runtime";/);
});

test('required props lose the ? in JSX, optional ones keep it on the element too', () => {
  const [components, , jsx] = dts.split(/^declare (?:global|namespace LocalJSX)/m);
  assert.match(components, /"src"\?: string;/);
  assert.match(components, /"topology": \{/); // has a default: not optional on the element
  assert.match(components, /"required": Foo;/);
  assert.match(jsx, /"required": Foo;/);
  assert.match(jsx, /"topology"\?: \{/);
  assert.match(jsx, /"src"\?: string;/);
});

test('JSDoc from the source is carried over', () => {
  assert.match(dts, /\/\*\* A probe\. \*\/\n\s+interface CornProbe/);
  assert.match(dts, /\* The topology to show\.\n\s+\* @default \{ nodes: \[\] \}\n\s+\*\/\n\s+"topology"/);
  assert.match(dts, /\/\*\* Focus a node\. \*\/\n\s+"focusNode"/);
  assert.match(dts, /\/\*\* Fired with a Foo\. \*\/\n\s+"onFooPicked"/);
});

test('imported types are imported relative to the declaration file; packages stay as written', () => {
  assert.match(dts, /import type \{ Foo, Bar as Baz \} from "\.\.\/src\/types";/);
  assert.match(dts, /export type \{ Foo, Bar as Baz \} from "\.\.\/src\/types";/);
  assert.match(dts, /import type \{ Config \} from "some-package";/);
  assert.match(dts, /"renamed": Baz;/);
  // A type declared in the component file comes from that file, and only when exported.
  assert.match(dts, /import type \{ Local \} from "\.\.\/src\/corn-probe";/);
});

test('a type that cannot be resolved is any, with a comment, and a diagnostic', () => {
  assert.match(dts, /"secret": any \/\* unresolved: Secret \*\/;/);
  assert.match(dts, /"unknown": any \/\* unresolved: SomeAmbientThing \*\/;/);
  assert.ok(gen.diagnostics.some((d) => /Secret/.test(d.message) && /not exported/.test(d.message)));
  assert.ok(gen.diagnostics.some((d) => /SomeAmbientThing/.test(d.message)));
});

test('imports from different modules with the same name do not collide', () => {
  const source = `import { Component, Prop } from '@stencil/core';
import { Item } from './a';
import { Item as Other } from './b';
@Component({ tag: 'x-y' })
export class XY { @Prop() one: Item; @Prop() two: Other[]; }`;
  write('src/a.ts', 'export type Item = 1;');
  write('src/b.ts', 'export type Item = 2;');
  const { code } = generateTypes([{ file: join(project, 'src/x-y.tsx'), source }], { outFile });
  assert.match(code, /import type \{ Item \} from "\.\.\/src\/a";/);
  assert.match(code, /import type \{ Item as Other \} from "\.\.\/src\/b";/);
  assert.match(code, /"two": Other\[\];/);
});

test('components in several modules are sorted by tag, once each', () => {
  const { code, components } = generateTypes(
    [
      { file: join(project, 'src/plain.tsx'), source: plainSource },
      { file: cornProbeFile, source: cornProbe },
    ],
    { outFile },
  );
  assert.deepEqual(components, ['app-plain', 'corn-probe']);
  assert.ok(code.indexOf('"app-plain": HTMLAppPlainElement') < code.indexOf('"corn-probe": HTMLCornProbeElement'));
  assert.doesNotMatch(code.split('declare global')[0].split('export namespace')[1] ?? '', /CustomEvent<T>[\s\S]*AppPlain/);
});

// The generated file and a consumer, through the TypeScript compiler.
const typecheck = (files, extra = {}) => {
  const ts = require('typescript');
  const program = ts.createProgram(files, {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'],
    baseUrl: project,
    paths: { 'some-package': ['./stubs/some-package.d.ts'] },
    ...extra,
  });
  // Only what is in the generated file and the consumer: not Stencil's own typings or the component sources.
  const mine = (d) => d.file && !/[\\/](node_modules|src)[\\/]/.test(d.file.fileName);
  return ts.getPreEmitDiagnostics(program).filter(mine).map((d) => `${d.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
};

test('the generated declarations type-check, and a consumer sees typed props, events and JSX', () => {
  // Without the unresolvable members, which are `any` anyway.
  const good = cornProbe.replace(/  @Prop\(\) (secret|unknown).*\n/g, '');
  const { code } = generateTypes([{ file: cornProbeFile, source: good }], { outFile });
  const dtsFile = write('dist/components.d.ts', code);
  const consumer = write(
    'consumer/use.tsx',
    `import type { CornProbeCustomEvent, JSX } from '../dist/components';
const el = document.querySelector('corn-probe')!;
el.topology = { nodes: [] };
el.src = 'x';
el.addEventListener('cornSelect', (event) => { const id: string = event.detail.id; void id; });
el.addEventListener('click', (event) => { void event.clientX; });
const done: Promise<void> = el.focusNode('a');
void done;
const onSel = (e: CornProbeCustomEvent<{ id: string }>) => e.detail.id;
const props: JSX.CornProbe = { topology: { nodes: [{ id: 'a' }] }, required: { a: 'x' }, onCornSelect: onSel };
void props;
const tag: HTMLElementTagNameMap['corn-probe'] = el;
void tag;
`,
  );
  assert.deepEqual(typecheck([dtsFile, consumer]), []);

  // And it rejects what it should.
  const bad = write(
    'consumer/bad.ts',
    `import '../dist/components';
const el = document.querySelector('corn-probe')!;
el.topology = 5;
el.addEventListener('cornSelect', (event) => { event.detail.nope; });
`,
  );
  const errors = typecheck([dtsFile, bad]);
  assert.equal(errors.length, 2, errors.join('\n'));
});

test('the declarations with unresolved members still type-check', () => {
  const dtsFile = write('dist/components.d.ts', dts);
  assert.deepEqual(typecheck([dtsFile]), []);
});

test('vite build with dts: true writes components.d.ts beside the library output', async () => {
  const root = join(project, 'lib');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src/types.ts'), 'export interface Foo { a: string }\n');
  writeFileSync(join(root, 'src/corn-probe.css'), ':host { display: block; }\n');
  writeFileSync(
    join(root, 'src/corn-probe.tsx'),
    `import { Component, Prop, Event, EventEmitter, Method, h } from '@stencil/core';
import { Foo } from './types';
@Component({ tag: 'corn-probe', styleUrl: 'corn-probe.css', encapsulation: { type: 'shadow' } })
export class CornProbe {
  @Prop() topology: { nodes: { id: string }[] } = { nodes: [] };
  @Prop() src?: string;
  @Prop() foo?: Foo;
  @Event() cornSelect!: EventEmitter<{ id: string }>;
  @Method() async focusNode(id: string): Promise<void> {}
  render() { return <div />; }
}
`,
  );
  writeFileSync(join(root, 'src/index.ts'), `export { CornProbe } from './corn-probe';\n`);
  const run = (dts, dir) =>
    build({
      root,
      logLevel: 'silent',
      configFile: false,
      plugins: [stencilrs({ dts })],
      build: { outDir: dir, lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'components' } },
    });
  await run(true, 'dist');
  assert.ok(existsSync(join(root, 'dist/components.mjs')) || existsSync(join(root, 'dist/components.js')));
  const text = readFileSync(join(root, 'dist/components.d.ts'), 'utf8');
  assert.match(text, /"corn-probe": HTMLCornProbeElement;/);
  assert.match(text, /import type \{ Foo \} from "\.\.\/src\/types";/);
  assert.deepEqual(typecheck([join(root, 'dist/components.d.ts')]), []);

  await run({ fileName: 'types/corn.d.ts' }, 'dist2');
  const nested = readFileSync(join(root, 'dist2/types/corn.d.ts'), 'utf8');
  assert.match(nested, /from "\.\.\/\.\.\/src\/types";/);

  await run(false, 'dist3');
  assert.ok(!existsSync(join(root, 'dist3/components.d.ts')), 'off by default');
});
