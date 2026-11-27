// Byte-compares the string renderer with the happy-dom renderer on small components that cover more
// than the 500-card page: shadow DOM + styles, scoped CSS, keyed lists of nested components, class /
// style / attribute parts, reflected props, <Host>, functional components, lifecycle hooks, and the
// things that must fall back (slots, DOM access in a hook, async componentWillLoad).
//   node spike/compare-fixtures.mjs
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transpile } from '../index.js';
import { compiledSources } from '../test/runtime-ssr-fixture.mjs';
import { createStringRenderer, Fallback } from './runtime-string.js';
import { createRenderer } from '../runtime-server.js';

const EXTRA = {
  'x-attrs': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-attrs', encapsulation: { type: 'scoped' }, styles: '.a{color:red}' })
export class XAttrs {
  @Prop() on = true;
  @Prop() label = 'a & b <c> "q"';
  render() {
    return <div class={{ a: true, on: this.on, off: !this.on }} style={{ color: 'red', fontSize: '12px' }} data-x={this.label} title="T" hidden={false} aria-label={this.label}>
      <a class="lnk" href={'/x?a=1&b=2'}>{this.label}</a>
      {this.on ? <b>yes</b> : <i>no</i>}
      {null}{false}{0}{''}
    </div>;
  }
}`,
  'x-host': `import { Component, Prop, Host, h } from '@stencil/core';
@Component({ tag: 'x-host', encapsulation: { type: 'shadow' }, styles: ':host{display:block}' })
export class XHost {
  @Prop({ reflect: true }) kind = 'a';
  @Prop() n = 1;
  render() {
    return <Host class={{ k: true, [this.kind]: true }} role="note"><span>{this.n}</span><slot /></Host>;
  }
}`,
  'x-fn': `import { Component, Prop, State, h } from '@stencil/core';
const Row = (props: { label: string }, children: any) => <li class="row">{props.label}{children}</li>;
@Component({ tag: 'x-fn', encapsulation: { type: 'scoped' } })
export class XFn {
  @Prop() rows = 3;
  @State() ready = false;
  componentWillLoad() { this.ready = true; }
  render() {
    return <ul>{Array.from({ length: this.rows }, (_, i) => <Row label={'r' + i}><em>{i}</em></Row>)}{this.ready && <li>ready</li>}</ul>;
  }
}`,
  'x-nest': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-nest', encapsulation: { type: 'scoped' } })
export class XNest {
  render() {
    return <section>
      <x-fn rows={2}></x-fn>
      <x-attrs on={false} label="L"></x-attrs>
      <ssr-badge count={7}></ssr-badge>
      <ul>{[1, 2].map((n) => <li key={n}><x-attrs on={n === 1}></x-attrs>{[10, 20].map((m) => <ssr-badge key={m} count={m}></ssr-badge>)}</li>)}</ul>
    </section>;
  }
}`,
  'x-dom': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-dom', encapsulation: { type: 'scoped' } })
export class XDom {
  componentWillLoad() { document.title = 'x'; }
  render() { return <p>dom</p>; }
}`,
  'x-async': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-async', encapsulation: { type: 'scoped' } })
export class XAsync {
  async componentWillLoad() { await Promise.resolve(); }
  render() { return <p>async</p>; }
}`,
};

const dir = mkdtempSync(join(tmpdir(), 'rs-str-'));
const build = (runtimeUrl) => {
  const files = [];
  const sources = compiledSources(runtimeUrl);
  for (const [tag, src] of Object.entries(EXTRA)) {
    const { code, diagnostics } = transpile(src, { file: `${tag}.tsx`, componentExport: 'stencilrs' });
    const errors = diagnostics.filter((d) => d.level === 'error');
    if (errors.length) throw new Error(`${tag}: ${errors.map((d) => d.message).join('\n')}`);
    sources[tag] = code.replaceAll('"@popcorn245/stencilrs/runtime"', JSON.stringify(runtimeUrl));
  }
  const sub = join(dir, runtimeUrl.includes('runtime-string') ? 's' : 'd');
  import('node:fs').then(() => {});
  return { sources, sub };
};
import { mkdirSync } from 'node:fs';
const mk = (runtimeUrl) => {
  const { sources, sub } = build(runtimeUrl);
  mkdirSync(sub, { recursive: true });
  const urls = [];
  for (const [tag, code] of Object.entries(sources)) {
    writeFileSync(join(sub, `${tag}.mjs`), code);
    urls.push(pathToFileURL(join(sub, `${tag}.mjs`)).href);
  }
  return () => Promise.all(urls.map((u) => import(u)));
};
// The string renderer runs first: happy-dom's createRenderer installs window/document globals, and a
// DOM-less renderer must see none (a hook that touches `document` has to fall back, not find one).
const str = await createStringRenderer(mk(pathToFileURL(new URL('./runtime-string.js', import.meta.url).pathname).href));
const PAGES = [
  ['shadow + style + prop', '<ssr-badge count="3"></ssr-badge>'],
  ['keyed list of shadow components + event', '<ssr-shop items="a,bb,ccc"></ssr-shop>'],
  ['same, not resumable', '<ssr-shop items="a,bb,ccc"></ssr-shop>', { resumable: false }],
  ['class / style / attr parts, scoped style, conditional', '<x-attrs></x-attrs>'],
  ['<Host>, reflect, shadow + slot element', '<x-host kind="b" n="2"></x-host>'],
  ['functional component, state set in componentWillLoad', '<x-fn rows="4"></x-fn>'],
  ['nested components, list in list, many hosts', '<x-nest></x-nest>'],
  ['two components side by side + text', 'hello <ssr-badge count="1"></ssr-badge> and <ssr-badge count="2"></ssr-badge>!'],
  ['EXPECT FALLBACK: scoped <slot>', '<ssr-card heading="Hi"><b slot="title">T</b>body</ssr-card>'],
  ['EXPECT FALLBACK: document in componentWillLoad', '<x-dom></x-dom>'],
  ['EXPECT FALLBACK: async componentWillLoad', '<x-async></x-async>'],
  ['EXPECT FALLBACK: signal', '<ssr-live></ssr-live>'],
];
const results = PAGES.map(([name, html, opts]) => {
  try {
    return { s: str.sync(html, opts) };
  } catch (e) {
    if (!(e instanceof Fallback)) throw e;
    return { fb: e.message };
  }
});
const dom = await createRenderer(mk(pathToFileURL(new URL('../runtime.js', import.meta.url).pathname).href));
let bad = 0;
for (const [k, [name, html, opts]] of PAGES.entries()) {
  const d = await dom(html, opts);
  const { s, fb } = results[k];
  if (fb !== undefined) {
    console.log(`${name.startsWith('EXPECT') ? 'ok  ' : 'FAIL'} fallback  ${name}: ${fb}`);
    if (!name.startsWith('EXPECT')) bad++;
    continue;
  }
  if (name.startsWith('EXPECT')) {
    bad++;
    console.log(`FAIL did not fall back  ${name}`);
    continue;
  }
  if (s === d) console.log(`ok   identical (${s.length} B)  ${name}`);
  else {
    bad++;
    let i = 0;
    while (s[i] === d[i]) i++;
    console.log(`FAIL different  ${name}\n  string: ${JSON.stringify(s.slice(Math.max(0, i - 100), i + 140))}\n  dom   : ${JSON.stringify(d.slice(Math.max(0, i - 100), i + 140))}`);
  }
}
console.log(bad ? `${bad} problems` : 'all as expected');
process.exit(bad ? 1 : 0);
