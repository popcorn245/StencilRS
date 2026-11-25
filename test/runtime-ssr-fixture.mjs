// Compiles two components for the stencilrs runtime into a temp dir; used by runtime-ssr tests.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { transpile } from '../index.js';

const RUNTIME = pathToFileURL(new URL('../runtime.js', import.meta.url).pathname).href;

const SOURCES = {
  'ssr-badge': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'ssr-badge', styles: ':host{color:red}', encapsulation: { type: 'shadow' } })
export class SsrBadge {
  @Prop() count = 0;
  render() { return <span class="n">{this.count}</span>; }
}`,
  'ssr-card': `import { Component, Prop, State, h } from '@stencil/core';
@Component({ tag: 'ssr-card', styles: '.card{border:1px solid}', encapsulation: { type: 'scoped' } })
export class SsrCard {
  @Prop() heading = '';
  @State() clicks = 0;
  render() {
    return <div class="card">
      <h2>{this.heading}</h2>
      <header><slot name="title" /></header>
      <ssr-badge count={this.clicks} />
      <button onClick={() => this.clicks++}>+</button>
      <main><slot /></main>
    </div>;
  }
}`,
  'ssr-list': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'ssr-list', encapsulation: { type: 'scoped' } })
export class SsrList {
  @Prop() items = 'a,b,c';
  render() {
    const items = this.items.split(',');
    return <ssr-card heading="List">
      <span slot="title">{items.length} items</span>
      <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </ssr-card>;
  }
}`,
  'ssr-shop': `import { Component, Prop, State, h } from '@stencil/core';
@Component({ tag: 'ssr-shop', encapsulation: { type: 'scoped' } })
export class SsrShop {
  @Prop() items = 'a,bb,ccc';
  @State() count = 0;
  render() {
    return <div>
      <button onClick={() => this.count++}>{this.count}</button>
      <ul>{this.items.split(',').map((i) => <li key={i}><ssr-badge count={i.length} />{i}</li>)}</ul>
    </div>;
  }
}`,
  // A signal of Stencil 5's shape (`peek`, `subscribe`), passed to the template as it is.
  'ssr-live': `import { Component, h } from '@stencil/core';
const live = (globalThis.__ssrLive ||= (() => {
  let v = 'on';
  const subs = new Set();
  return {
    peek: () => v,
    get value() { return v; },
    set value(n) { v = n; for (const f of subs) f(v); },
    subscribe(f) { subs.add(f); f(v); return () => subs.delete(f); },
    get watchers() { return subs.size; },
  };
})());
@Component({ tag: 'ssr-live', encapsulation: { type: 'scoped' } })
export class SsrLive {
  render() { return <p class={live}>{live}</p>; }
}`,
  // Decorators of a third party (legacy, as TypeScript's `experimentalDecorators`): a field, a method and an accessor.
  'ssr-deco': `import { Component, h } from '@stencil/core';
const log = (globalThis.__decoLog ||= []);
const boxes = new WeakMap();
// A field decorator: an accessor on the prototype, so the initializer has to go through the setter.
const boxed = (proto, key) => Object.defineProperty(proto, key, {
  configurable: true, enumerable: true,
  get() { return boxes.get(this)?.[key]; },
  set(v) { log.push('set ' + key + '=' + v); (boxes.get(this) || boxes.set(this, {}).get(this))[key] = v; },
});
// A method decorator and an accessor decorator, each returning a replacement descriptor.
const shout = (suffix) => (proto, key, d) => ({ ...d, value() { return d.value.call(this).toUpperCase() + suffix; } });
const twice = (proto, key, d) => ({ ...d, get() { return d.get.call(this) * 2; } });
@Component({ tag: 'ssr-deco', encapsulation: { type: 'scoped' } })
export class SsrDeco {
  @boxed label = 'init';
  @boxed n = 2;
  @shout('!') hello() { return 'hi ' + this.label; }
  @twice get twin() { return this.n; }
  connectedCallback() { log.push('connected'); }
  render() { return <p>{this.label}|{this.hello()}|{this.twin}</p>; }
}`,
};

/** The fixtures compiled, with the runtime import replaced by `runtime` (a URL or path). */
export function compiledSources(runtime) {
  return Object.fromEntries(
    Object.entries(SOURCES).map(([tag, src]) => {
      const { code, diagnostics } = transpile(src, { file: `${tag}.tsx`, componentExport: 'stencilrs' });
      const errors = diagnostics.filter((d) => d.level === 'error');
      if (errors.length) throw new Error(errors.map((d) => d.message).join('\n'));
      return [tag, code.replaceAll('"@popcorn245/stencilrs/runtime"', JSON.stringify(runtime))];
    }),
  );
}

export function compileFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'rs-ssr-'));
  const files = [];
  for (const [tag, code] of Object.entries(compiledSources(RUNTIME))) {
    const file = join(dir, `${tag}.mjs`);
    writeFileSync(file, code);
    files.push(pathToFileURL(file).href);
  }
  return () => Promise.all(files.map((f) => import(f)));
}
