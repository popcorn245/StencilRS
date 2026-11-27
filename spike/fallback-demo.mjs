// Shows the fallback: pages the string renderer can't model are rendered by the happy-dom renderer in a
// worker, and come out as they would have without the string renderer.   node spike/fallback-demo.mjs
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { transpile } from '../index.js';
import { createStringRenderer } from './runtime-string.js';

const SRC = {
  'x-dom': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-dom', encapsulation: { type: 'scoped' } })
export class XDom {
  componentWillLoad() { this.w = document.createElement('i').localName; }
  w = '';
  render() { return <p>made with {this.w}</p>; }
}`,
  'x-ok': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-ok', encapsulation: { type: 'scoped' } })
export class XOk { @Prop() n = 1; render() { return <p>n={this.n}</p>; } }`,
};
const here = (p) => pathToFileURL(new URL(p, import.meta.url).pathname).href;
const dir = mkdtempSync(join(tmpdir(), 'rs-fb-'));
const build = (name, runtime) => {
  const sub = join(dir, name);
  mkdirSync(sub);
  return Object.entries(SRC).map(([tag, src]) => {
    const { code } = transpile(src, { file: `${tag}.tsx`, componentExport: 'stencilrs' });
    const f = join(sub, `${tag}.mjs`);
    writeFileSync(f, code.replaceAll('"@popcorn245/stencilrs/runtime"', JSON.stringify(runtime)));
    return pathToFileURL(f).href;
  });
};
const stringModules = build('s', here('./runtime-string.js'));
const domModules = build('d', here('../runtime.js'));

const worker = new Worker(new URL('./fallback-worker.mjs', import.meta.url), { workerData: { modules: domModules } });
await new Promise((r) => worker.once('message', r));
let nextId = 0;
const pending = new Map();
worker.on('message', (m) => pending.get(m.id)?.(m));
const viaWorker = (html, opts) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (m) => (m.error ? reject(new Error(m.error)) : resolve(m.html)));
    worker.postMessage({ id, html, opts });
  });

const render = await createStringRenderer(() => Promise.all(stringModules.map((m) => import(m))), { fallback: viaWorker });
console.log('x-ok  :', await render('<x-ok n="3"></x-ok>').then((h) => h.slice(0, 90)), `(fallbacks so far: ${render.fallbacks})`);
console.log('x-dom :', await render('<x-dom></x-dom>').then((h) => h.slice(0, 90)), `(fallbacks so far: ${render.fallbacks}, because: ${render.lastFallback})`);
await worker.terminate();
