import assert from 'node:assert/strict';
import { test } from 'node:test';

import { transpile } from '../index.js';

const source = `import { Component, h } from '@stencil/core';
@Component({ tag: 'cmp-a' })
export class CmpA { render() { return <div />; } }`;
const options = { file: 'cmp-a.tsx', jsx: 'classic', sourceMap: false };

test('componentExport picks the output', () => {
  assert.match(transpile(source, options).code, /defineCustomElement\(CmpA/);
  assert.match(transpile(source, { ...options, componentExport: 'module' }).code, /export const CmpA = class extends HTMLElement[\s\S]*proxyCustomElement\(CmpA/);
  const lazy = transpile(source, { ...options, componentExport: 'lazy' }).code;
  assert.match(lazy, /export const CmpA = class \{\s*constructor\(hostRef\) \{\s*__stencil_registerInstance\(this, hostRef\)/);
});

test('componentExport: null is the lazy output, as in Stencil', () => {
  assert.equal(transpile(source, { ...options, componentExport: null }).code, transpile(source, { ...options, componentExport: 'lazy' }).code);
});

test('componentExport: ssr keeps the class, adds cmpMeta, and imports the server runtime', () => {
  const ssr = transpile(source, { ...options, componentExport: 'ssr' }).code;
  assert.match(ssr, /^import \{ registerInstance as __stencil_registerInstance \} from "@stencil\/core\/runtime\/server";/);
  assert.match(ssr, /export class CmpA \{[\s\S]*static get cmpMeta\(\)[\s\S]*"\$tagName\$": "cmp-a"/);
});

test('an unknown componentExport throws', () => {
  assert.throws(() => transpile(source, { ...options, componentExport: 'nope' }), /unknown componentExport/);
});

test("componentMetadata: 'compilerstatic' adds COMPILER_META, and style: null drops styles", () => {
  const spec = { ...options, componentExport: null, componentMetadata: 'compilerstatic', coreImportPath: '@stencil/core/testing', style: null };
  const code = transpile(source, spec).code;
  assert.match(code, /from "@stencil\/core\/testing"/);
  assert.match(code, /static get COMPILER_META\(\) \{\s*return \{[\s\S]*"tagName": "cmp-a"[\s\S]*"hasVdomRender": true/);
  assert.doesNotMatch(transpile(source, options).code, /COMPILER_META/);
  assert.throws(() => transpile(source, { ...options, componentMetadata: 'bogus' }), /unknown componentMetadata/);
});

test('foldBuildFlags folds Build flags imported from @stencil/core, padded to the original length', async () => {
  const { foldBuildFlags } = await import('../index.js');
  const code = "import { Build } from '@stencil/core';\nif (Build.isServer) a(); else b(Build.isBrowser);";
  assert.equal(
    foldBuildFlags(code, 'a.ts', { isBrowser: true, isServer: false }),
    "import { Build } from '@stencil/core';\nif (false         ) a(); else b(true           );",
  );
  assert.equal(foldBuildFlags(code, 'a.ts', {}), null);
  assert.equal(foldBuildFlags('const Build = {}; Build.isServer', 'a.ts', { isServer: true }), null);
});

test('useDefineForClassFields: false assigns field initializers in the constructor, after the host is registered', () => {
  const src = `import { Component, Prop, State, Element, h } from '@stencil/core';
@Component({ tag: 'cmp-f', encapsulation: { type: 'shadow' } })
export class CmpF {
  @Element() el!: HTMLElement;
  @Prop({ mutable: true }) mode = 'md';
  @State() count?: number;
  private timer: number | undefined;
  handler = () => this.mode;
  static tag = 'cmp-f';
  render() { return <div />; }
}`;
  const code = transpile(src, { ...options, useDefineForClassFields: false }).code;
  const ctor = code.slice(code.indexOf('constructor('), code.indexOf('get el()'));
  // registerHost, attachShadow, then the initializers in declaration order
  assert.match(ctor, /__registerHost\(\)[\s\S]*__attachShadow\(\)[\s\S]*this\.mode = "md";[\s\S]*this\.handler = \(\) => this\.mode;/);
  // no class field is left to shadow the prototype's accessors, with or without an initializer
  assert.doesNotMatch(code, /^\s*(mode|count|timer|handler)\b[^(]*[=;]/m);
  assert.match(code, /static tag = "cmp-f"/); // statics are not instance fields
  // the default (TypeScript's at ES2022): fields stay fields
  const dflt = transpile(src, options).code;
  assert.match(dflt, /^\s*mode = "md";/m);
  assert.doesNotMatch(dflt, /this\.mode = "md"/);
});

test('@Signal() (experimental): a constructor assignment and a decorator call after the class, in every output', () => {
  const src = `import { Component, h } from '@stencil/core';
import { Signal as S } from '@popcorn245/stencilrs/signals';
@Component({ tag: 'cmp-s' })
export class CmpS {
  @S({ equals: Object.is }) count = 0;
  @S() later: number;
  render() { return <b>{this.count}</b>; }
}`;
  for (const componentExport of ['customelement', 'lazy', 'ssr']) {
    for (const useDefineForClassFields of [false, true]) {
      const { code, diagnostics } = transpile(src, { ...options, componentExport, useDefineForClassFields });
      assert.deepEqual(diagnostics, []);
      assert.match(code, /this\["count"\] = 0;/, `${componentExport}/${useDefineForClassFields}`);
      assert.doesNotMatch(code, /@S\(|^\s*count = 0;|^\s*later;/m);
      assert.match(code, /\};?\s*S\(\{ equals: Object\.is \}\)\(CmpS\.prototype, "count"\);\nS\(\)\(CmpS\.prototype, "later"\);/);
    }
  }
});

test('a decorator named Signal from anywhere else is left alone', () => {
  const src = `import { Component, h } from '@stencil/core';
import { Signal } from './elsewhere';
@Component({ tag: 'cmp-t' })
export class CmpT { @Signal() count = 0; render() { return <b />; } }`;
  assert.doesNotMatch(transpile(src, { ...options, useDefineForClassFields: true }).code, /Signal\(\)\(CmpT\.prototype/);
});

test("componentExport: 'stencilrs' (experimental) compiles JSX to hoisted templates and parts", () => {
  const src = `import { Component, Host, Prop, State, h } from '@stencil/core';
@Component({ tag: 'cmp-f', encapsulation: { type: 'shadow' } })
export class CmpF {
  @Prop() label = 'Hi';
  @State() items: string[] = [];
  render() {
    return <Host class={{ on: true }}><p title={this.label}>{this.label}!</p>{this.items.map((i) => <li key={i}>{i}</li>)}</Host>;
  }
}`;
  const { code, diagnostics } = transpile(src, { file: 'cmp-f.tsx', componentExport: 'stencilrs' });
  assert.deepEqual(diagnostics, []);
  assert.match(code, /from "@popcorn245\/stencilrs\/runtime"/);
  assert.doesNotMatch(code, /@stencil\/core/);
  assert.match(code, /export class CmpF extends __rs_Base/);
  assert.match(code, /__rs_template\("<p rs><!--rs-->!<\/p><!--rs-->"/);
  assert.match(code, /__rs_template\("<li><!--rs--><\/li>"/);
  assert.match(code, /__rs_t\(__rs_tmpl\d, \[i\], i\)/);
  assert.match(code, /__rs_define\(CmpF, \{\s*tag: "cmp-f",\s*scoped: false,\s*shadow: true/);
});
