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
