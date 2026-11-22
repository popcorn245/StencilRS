// buildHydrate's pieces that do not need a project: the factory wrapper lookup and the collection adapter.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { analyze } from '../index.js';
import { readFactoryWrapper } from '../ssr.js';
import { collectionComponentToSource } from '../ssr-collection.js';

const core = dirname(createRequire(import.meta.url).resolve('@stencil/core/package.json'));

test('readFactoryWrapper finds the ssrFactory wrapper in the installed Stencil', () => {
  const w = readFactoryWrapper(core);
  assert.match(w.SSR_FACTORY_INTRO, /export function ssrFactory\(/);
  assert.match(w.SSR_FACTORY_OUTRO, /hydrateAppClosure\(\$stencilWindow\)/);
  assert.match(w.MODE_RESOLVER_DECLARATION, /^modeResolver/);
});

test('readFactoryWrapper names what it looked for when the layout is not what it expects', () => {
  const fake = mkdtempSync(join(tmpdir(), 'fake-stencil-'));
  mkdirSync(join(fake, 'dist'));
  writeFileSync(join(fake, 'dist/compiler-abc.mjs'), 'const nothing = 1;\n');
  assert.throws(() => readFactoryWrapper(fake), /SSR_FACTORY_INTRO.*compiler-abc\.mjs.*layout of this @stencil\/core version has changed/s);
  const empty = mkdtempSync(join(tmpdir(), 'fake-stencil-'));
  mkdirSync(join(empty, 'dist'));
  assert.throws(() => readFactoryWrapper(empty), /no compiler chunk/);
});

const COLLECTION = `import { Host, h } from "@stencil/core";
import { helper } from "./helper";
export class Thing {
    constructor() { this.open = false; }
    changed() {}
    render() { return h(Host, null); }
    static get is() { return "x-thing"; }
    static get encapsulation() { return "shadow"; }
    static get styleUrls() { return { "$": ["thing.css"] }; }
    static get properties() { return { "open": { "type": "boolean", "mutable": true, "reflect": true, "attribute": "open", "complexType": { "original": "boolean", "resolved": "boolean", "references": {} } } }; }
    static get states() { return { "n": {} }; }
    static get elementRef() { return "el"; }
    static get watchers() { return [{ "propName": "open", "methodName": "changed" }]; }
}`;

test('a collection component is written back as decorated source stencilrs compiles', () => {
  const { code, tagName } = collectionComponentToSource(COLLECTION, '/pkg/dist/collection/thing.js');
  assert.equal(tagName, 'x-thing');
  assert.match(code, /@Component\(\{ tag: "x-thing", styleUrl: "thing\.css", encapsulation: \{ type: "shadow" \} \}\)/);
  assert.match(code, /@Prop\(\{ mutable: true, reflect: true, attribute: "open" \}\) open\?: boolean;/);
  assert.match(code, /@State\(\) n: any;/);
  assert.match(code, /@Element\(\) el: HTMLElement;/);
  assert.match(code, /@Watch\("open"\)\n\s*changed\(\)/);
  assert.match(code, /from "\/pkg\/dist\/collection\/helper"/);
  assert.doesNotMatch(code, /static get/);
  const meta = analyze(code, '/__x/thing.tsx');
  assert.deepEqual(meta.diagnostics, []);
  assert.equal(meta.components[0].tagName, 'x-thing');
});

test('a collection component with methods is refused by name', () => {
  const withMethod = COLLECTION.replace('static get states', 'static get methods() { return { "go": {} }; }\n    static get states');
  assert.throws(() => collectionComponentToSource(withMethod, '/pkg/thing.js'), /x-thing.*methods.*not supported/);
});

test('a module without a component is skipped', () => {
  assert.equal(collectionComponentToSource('export const a = 1;', '/pkg/a.js'), null);
});
