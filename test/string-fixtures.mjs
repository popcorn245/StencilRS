// Components and pages for the string renderer's differential tests (test/runtime-string.test.js): every page is
// rendered by the happy-dom renderer (the oracle) and by the string renderer, and the two must be byte-identical,
// or the string renderer must fall back (`fb`: the page cannot be written without a DOM, and says why).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { transpile } from '../index.js';
import { compiledSources } from './runtime-ssr-fixture.mjs';

export const RUNTIME_URL = pathToFileURL(new URL('../runtime.js', import.meta.url).pathname).href;
export const STRING_URL = pathToFileURL(new URL('../runtime-string.js', import.meta.url).pathname).href;

export const EXTRA = {
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
  // The order components run in, and what they take from a global counter in a field, a hook and a constructor.
  'x-uid': `import { Component, Prop, h } from '@stencil/core';
const g: any = globalThis;
@Component({ tag: 'x-uid', encapsulation: { type: 'scoped' } })
export class XUid {
  @Prop() name = '';
  fieldId = (g.__uid = (g.__uid || 0) + 1);
  loadId = 0;
  componentWillLoad() { this.loadId = (g.__uid = g.__uid + 1); }
  render() { return <i>{this.name}:{this.fieldId}/{this.loadId}</i>; }
}`,
  'x-order': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-order', encapsulation: { type: 'scoped' } })
export class XOrder {
  render() {
    return <div>
      <x-uid name="a"></x-uid>
      {[1, 2, 3].map((n) => <x-uid name={'l' + n} key={n}></x-uid>)}
      <x-uid name="b"></x-uid>
      {true && <section><x-uid name="s1"></x-uid><x-uid name="s2"></x-uid></section>}
      <x-uid name="c"></x-uid>
    </div>;
  }
}`,
  // render() returns a list directly: the entries connect last to first. A list in a list as well.
  'x-rootlist': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-rootlist', encapsulation: { type: 'scoped' } })
export class XRootList {
  render() {
    return [1, 2, 3].map((n) => <x-uid name={'r' + n} key={n}></x-uid>);
  }
}`,
  'x-nestlist': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-nestlist', encapsulation: { type: 'scoped' } })
export class XNestList {
  render() {
    return [[1, 2], [3]].map((row) => row.map((n) => <x-uid name={'n' + n} key={n}></x-uid>));
  }
}`,
  // A shadow component with light children from the parent: marks that belong to another component.
  'x-shell': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-shell', encapsulation: { type: 'shadow' } })
export class XShell { render() { return <div class="shell"><slot /></div>; } }`,
  'x-shellhost': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-shellhost', encapsulation: { type: 'scoped' } })
export class XShellHost {
  @Prop() n = 2;
  render() {
    return <x-shell>
      <p class="kid" onClick={() => {}}>{this.n}</p>
      {[1, 2].map((i) => <ssr-badge key={i} count={i}></ssr-badge>)}
      <x-attrs on={false}></x-attrs>
    </x-shell>;
  }
}`,
  // Property parts of native elements, a ref, a spread, svg.
  'x-parts': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-parts', encapsulation: { type: 'scoped' } })
export class XParts {
  @Prop() on = true;
  @Prop() extra: any = { id: 'sp', 'data-k': 'v', class: 'spc', style: { color: 'blue' }, title: 3 };
  box: any;
  render() {
    return <div ref={(el) => (this.box = el)}>
      <input placeholder={'p'} name={'n'} disabled={this.on} id={'i1'} />
      <button disabled={!this.on} name="b" title={this.on ? 'T' : null}>b</button>
      <a href={'/x?a=1&b=2'} target="_blank" rel="noopener" role="link" lang="en">a</a>
      <img src={'/i.png'} alt={'A'} width={10} />
      <p hidden={this.on} data-n={5} aria-hidden={true} tabindex={this.on ? 0 : -1}>t</p>
      <span {...this.extra}>spread</span>
      <b data-gone={null} data-no={false} data-yes={true}>x</b>
      <i foo={{ a: 1 }} bar={[1, 2]} baz={() => 1}>obj</i>
    </div>;
  }
}`,
  'x-svg': `import { Component, Prop, h } from '@stencil/core';
const Icon = ({ d }: { d: string }) => <path d={d} fill="none" stroke-width="2"></path>;
@Component({ tag: 'x-svg', encapsulation: { type: 'scoped' } })
export class XSvg {
  @Prop() size = 24;
  render() {
    return <svg viewBox={'0 0 ' + this.size + ' ' + this.size} class="ic" width={this.size}>
      <g class={{ on: true }}><Icon d="M0 0L10 10" /><circle cx={5} cy={5} r="2" /><linearGradient id="g1"><stop offset="0" stop-color="red" /></linearGradient></g>
      <text x="1" y="2">{this.size} &amp; co</text>
    </svg>;
  }
}`,
  'x-style': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-style', encapsulation: { type: 'scoped' } })
export class XStyle {
  @Prop() w = '10px';
  render() {
    return <div>
      <p style={{ color: 'red', fontSize: this.w, backgroundColor: '#fff', opacity: 0.5, zIndex: 3 }}>a</p>
      <p style={'color: red; margin-top: 4px'}>b</p>
      <p style={{ display: 'none' }}>c</p>
      <p style="width: 3px">d</p>
    </div>;
  }
}`,
  'x-styleunsafe': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-styleunsafe', encapsulation: { type: 'scoped' } })
export class XStyleUnsafe { render() { return <p style={{ margin: '0 auto' }}>m</p>; } }`,
  // Events: a component emitting in its hooks, the parent listening on the child's element or above it.
  'x-emit': `import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';
@Component({ tag: 'x-emit', encapsulation: { type: 'scoped' } })
export class XEmit {
  @Prop() bubbles = false;
  @Event() ping: EventEmitter<string>;
  @Event({ bubbles: true }) bub: EventEmitter<string>;
  componentWillLoad() { this.ping.emit('hello'); this.bub.emit('up'); }
  render() { return <b>emit</b>; }
}`,
  'x-listenown': `import { Component, State, h } from '@stencil/core';
@Component({ tag: 'x-listenown', encapsulation: { type: 'scoped' } })
export class XListenOwn {
  @State() got = 'none';
  seen = '';
  render() { return <p><x-emit onPing={(e) => { this.seen = e.detail; }}></x-emit>{this.seen}</p>; }
}`,
  'x-listenabove': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-listenabove', encapsulation: { type: 'scoped' } })
export class XListenAbove {
  log = '';
  render() { return <div onBub={(e) => { this.log += e.detail; }}><x-emit></x-emit>{this.log}</div>; }
}`,
  'x-hostlisten': `import { Component, Listen, h } from '@stencil/core';
@Component({ tag: 'x-hostlisten', encapsulation: { type: 'scoped' } })
export class XHostListen {
  got = 'no';
  @Listen('bub') onBub() { this.got = 'yes'; }
  render() { return <div><x-emit></x-emit>{this.got}</div>; }
}`,
  'x-wait': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-wait', encapsulation: { type: 'scoped' } })
export class XWait {
  @Prop() fn: any = undefined;
  @Prop() obj: any = undefined;
  render() { return <span onClick={() => {}}>{this.obj ? 'obj' : 'no'}</span>; }
}`,
  'x-listenhost': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-listenhost', encapsulation: { type: 'scoped' } })
export class XListenHostEv {
  render() { return <div><span onFocus={() => {}}>f</span><span onClick={() => {}}>c</span><span onMouseEnter={() => {}}>e</span><span onFooBar={() => {}}>x</span><span on-custom-ev={() => {}}>y</span></div>; }
}`,
  // Lifecycle hooks, in the order the DOM runs them (they log into a global).
  'x-hooks': `import { Component, Prop, h } from '@stencil/core';
const g: any = globalThis;
@Component({ tag: 'x-hooks', encapsulation: { type: 'scoped' } })
export class XHooks {
  @Prop() name = 'h';
  connectedCallback() { (g.__hooks ||= []).push('conn ' + this.name); }
  disconnectedCallback() { (g.__hooks ||= []).push('disc ' + this.name); }
  componentWillLoad() { g.__hooks.push('wl ' + this.name); }
  componentWillRender() { g.__hooks.push('wr ' + this.name); }
  componentDidRender() { g.__hooks.push('dr ' + this.name); }
  componentDidLoad() { g.__hooks.push('dl ' + this.name); }
  render() { g.__hooks.push('render ' + this.name); return <div><x-hooks-in name={this.name + '.in'}></x-hooks-in></div>; }
}`,
  'x-hooks-in': `import { Component, Prop, h } from '@stencil/core';
const g: any = globalThis;
@Component({ tag: 'x-hooks-in', encapsulation: { type: 'scoped' } })
export class XHooksIn {
  @Prop() name = 'h';
  connectedCallback() { g.__hooks.push('conn ' + this.name); }
  disconnectedCallback() { g.__hooks.push('disc ' + this.name); }
  componentWillLoad() { g.__hooks.push('wl ' + this.name); }
  componentDidLoad() { g.__hooks.push('dl ' + this.name); }
  render() { return <u>{this.name}</u>; }
}`,
  'x-hookslog': `import { Component, h } from '@stencil/core';
const g: any = globalThis;
@Component({ tag: 'x-hookslog', encapsulation: { type: 'scoped' } })
export class XHooksLog {
  render() { return <p>{(g.__hooks || []).length}</p>; }
}`,
  'x-misc': `import { Component, Prop, h, getAssetPath, getMode, Build } from '@stencil/core';
@Component({ tag: 'x-misc', encapsulation: { type: 'scoped' } })
export class XMisc {
  @Prop() src = 'img/a.png';
  render() { return <img src={getAssetPath(this.src)} alt={String(Build.isServer) + String(Build.isBrowser) + String(getMode(this))}></img>; }
}`,
  'x-text': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-text', encapsulation: { type: 'scoped' } })
export class XText {
  @Prop() v: any = 'a < b & c > d';
  render() { return <div>{this.v}<p>{'x'}{1}{2}{'  sp  '}</p>{[this.v, 3, null, 'z']}<pre-x>{0}</pre-x>text &amp; &lt;tag&gt; &quot;q&quot; &copy;</div>; }
}`,
  'x-json': `import { Component, Prop, State, h } from '@stencil/core';
@Component({ tag: 'x-json', encapsulation: { type: 'scoped' } })
export class XJson {
  @Prop() n = 0;
  @Prop() s = 's';
  @Prop() o: any = { a: 1 };
  @Prop() arr: any[] = [1, 'two', { three: 3 }];
  @State() st = 'state';
  render() { return <p>{this.n}{this.s}{JSON.stringify(this.o)}{this.arr.length}{this.st}</p>; }
}`,
  'x-fnprop': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-fnprop', encapsulation: { type: 'scoped' } })
export class XFnProp {
  @Prop() cb: any;
  @Prop() d: any;
  render() { return <p>{typeof this.cb}{this.d ? this.d.constructor.name : '-'}</p>; }
}`,
  'x-fnprophost': `import { Component, h } from '@stencil/core';
class Thing { a = 1; }
@Component({ tag: 'x-fnprophost', encapsulation: { type: 'scoped' } })
export class XFnPropHost {
  render() { return <div><x-fnprop cb={() => 1} d={new Thing()}></x-fnprop><x-fnprop></x-fnprop></div>; }
}`,
  'x-shadowlist': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-shadowlist', encapsulation: { type: 'shadow' }, styles: 'li{margin:0}' })
export class XShadowList {
  @Prop() n = 3;
  render() { return <ul>{Array.from({ length: this.n }, (_, i) => <li key={i}><ssr-badge count={i}></ssr-badge><x-attrs on={i % 2 === 0}></x-attrs></li>)}</ul>; }
}`,
  'x-listskip': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-listskip', encapsulation: { type: 'scoped' } })
export class XListSkip {
  render() {
    return <div>
      <ul>{[1, 2, 3].map((n) => <li key={n}>{n}</li>)}</ul>
      <ul>{[1, 2].map((n) => <li key={n}><x-fnprop cb={() => 1}></x-fnprop></li>)}</ul>
      <ul>{[1, 2].map((n) => <li key={n}><x-attrs></x-attrs></li>)}</ul>
      <ul>{[1, 2].map((n) => <li key={n} onClick={() => {}}>{n}</li>)}</ul>
      <ul>{[1, 2].map((n) => <li key={n}>{[n, n + 1].map((m) => <b key={m}>{m}</b>)}</li>)}</ul>
      <ul>{[]}</ul>
    </div>;
  }
}`,
  'x-matrix': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-matrix', encapsulation: { type: 'scoped' } })
export class XMatrix {
  @Prop() v: any = 'a "q" & <b>';
  render() {
    const v = this.v;
    return <div>
      <a href={v} title={v} id={v} lang={v} role={v} slot={v} target={v} rel={v}>1</a>
      <a href={null} title={null} id={undefined} target={false} rel={true}>2</a>
      <a title={0} id={5} lang={''}>3</a>
      <img src={v} alt={v} width={5} height="7" />
      <img src={null} alt={null} width={0} />
      <input placeholder={v} name={v} disabled={true} />
      <input placeholder={null} name={0} disabled={false} />
      <button name={v} disabled={0} hidden={1}>b</button>
      <button disabled={'yes'} hidden={''}>b</button>
      <p hidden={true}>h</p><p hidden={false}>h</p><p hidden={null}>h</p><p hidden={'x'}>h</p>
      <div data-a={v} aria-label={v} data-n={0} data-f={false} data-t={true} data-u={undefined} data-null={null} data-s="">x</div>
      <span class={null}></span><span class={undefined}></span><span class={''}></span><span class={{}}></span>
      <span class="  a   b " ></span>
      <span class={v}></span>
    </div>;
  }
}`,
  'x-classes': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-classes', encapsulation: { type: 'scoped' } })
export class XClasses {
  @Prop() on = true;
  render() {
    return <div class="base  extra">
      <p class="a b" id="x"></p>
      <p class={{ a: true, b: false, 'c d': true }}></p>
      <p class={'a  b c'}></p>
      <p class="s" ></p>
      <i class={'x'} title="t"></i>
      <b class={this.on ? 'on' : ''} style={{ color: 'red' }}></b>
    </div>;
  }
}`,
  'x-frag': `import { Component, Fragment, h } from '@stencil/core';
@Component({ tag: 'x-frag', encapsulation: { type: 'scoped' } })
export class XFrag { render() { return <><p>a</p><p>b</p>text<x-uid name="f"></x-uid></>; } }`,
  'x-nullroot': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-nullroot', encapsulation: { type: 'scoped' } })
export class XNullRoot { @Prop() show = false; render() { return this.show ? <p>shown</p> : null; } }`,
  'x-textroot': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-textroot', encapsulation: { type: 'scoped' } })
export class XTextRoot { @Prop() t = 'plain & text'; render() { return this.t as any; } }`,
  'x-norender': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-norender', encapsulation: { type: 'scoped' } })
export class XNoRender { @Prop() t = 'x'; }`,
  'x-reflect': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-reflect', encapsulation: { type: 'shadow' } })
export class XReflect {
  @Prop({ reflect: true }) a = 'str';
  @Prop({ reflect: true }) b = true;
  @Prop({ reflect: true }) c = 0;
  @Prop({ reflect: true }) d: any = { k: 1 };
  @Prop({ reflect: true }) e?: string;
  @Prop({ reflect: true, mutable: true }) f = false;
  @Prop() g = 5;
  componentWillLoad() { this.f = true; this.a = 'changed'; }
  render() { return <slot />; }
}`,
  'x-reflecthost': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-reflecthost', encapsulation: { type: 'scoped' } })
export class XReflectHost { render() { return <div><x-reflect a="in" c={3} e="set"></x-reflect><x-reflect b={false} d={{ z: [1] }}></x-reflect></div>; } }`,
  'x-parse': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-parse', encapsulation: { type: 'scoped' } })
export class XParse {
  @Prop() n = 1;
  @Prop() b = false;
  @Prop() s = 'x';
  @Prop() o: any = null;
  @Prop({ attribute: 'my-attr' }) myAttr = '';
  render() { return <p>{typeof this.n}:{this.n}|{typeof this.b}:{String(this.b)}|{this.s}|{this.myAttr}</p>; }
}`,
  'x-mixed': `import { Component, h } from '@stencil/core';
const f = (n: number) => (n % 2 ? <b key={n}>{n}</b> : n % 3 ? 'text' + n : null);
@Component({ tag: 'x-mixed', encapsulation: { type: 'scoped' } })
export class XMixed {
  render() {
    return <div>
      {[0, 1, 2, 3, 4, 5, 6].map(f)}
      {['a', 'b']}
      {[[1, 2], [], [3]]}
      {[<i key="dup">x</i>, <i key="dup">y</i>]}
      {[undefined, null, false, true, 0, '']}
      <ul>{[]}</ul>
      <ul>{[null]}</ul>
      {[0].map(() => [1, 2].map((n) => <u key={n}>{n}</u>))}
    </div>;
  }
}`,
  'x-hostmix': `import { Component, Prop, Host, h } from '@stencil/core';
@Component({ tag: 'x-hostmix', encapsulation: { type: 'scoped' } })
export class XHostMix {
  @Prop() on = true;
  @Prop() mode = 'a';
  render() { return <Host class={{ on: this.on }} aria-label={this.mode} data-m={this.mode} hidden={!this.on} style={{ color: 'red' }}><p>{this.mode}</p></Host>; }
}`,
  'x-hostuse': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-hostuse', encapsulation: { type: 'scoped' } })
export class XHostUse {
  render() { return <div><x-hostmix class="outer" mode="z" data-p={1}></x-hostmix><x-hostmix on={false} id="i" class={{ k: true }}></x-hostmix><x-hostmix title="t" aria-hidden="true"></x-hostmix></div>; }
}`,
  'x-hostusestyle': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-hostusestyle', encapsulation: { type: 'scoped' } })
export class XHostUseStyle { render() { return <x-hostmix style={{ display: 'block' }}></x-hostmix>; } }`,
  'x-lightnested': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-lightnested', encapsulation: { type: 'none' } })
export class XLightNested { render() { return <section><x-lightplain n={2}></x-lightplain><x-attrs></x-attrs><x-shell><span>k</span></x-shell></section>; } }`,
  'x-twostyles': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-twostyles', encapsulation: { type: 'shadow' }, styles: 'a{color:red} b{color:blue}' })
export class XTwoStyles { render() { return <div><x-attrs></x-attrs><x-lightplain></x-lightplain><x-attrs></x-attrs></div>; } }`,
  'x-strkey': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-strkey', encapsulation: { type: 'scoped' } })
export class XStrKey {
  @Prop() items = ['a', 'b', 'c'];
  render() { return <ol>{this.items.map((i, n) => <li key={i} class={{ first: n === 0 }}><x-parse n={n}></x-parse>{i}</li>)}</ol>; }
}`,
  'x-click': `import { Component, State, h } from '@stencil/core';
@Component({ tag: 'x-click', encapsulation: { type: 'scoped' } })
export class XClick {
  @State() n = 0;
  render() { return <div class="c"><button onClick={() => (this.n = this.n + 1)}>+</button><span class="n">{this.n}</span></div>; }
}`,
  // Everything below falls back.
  'x-dom': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-dom', encapsulation: { type: 'scoped' } })
export class XDom {
  componentWillLoad() { document.title = 'x'; }
  render() { return <p>dom</p>; }
}`,
  'x-typeof': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-typeof', encapsulation: { type: 'scoped' } })
export class XTypeof {
  render() { return <p>{typeof window !== 'undefined' ? 'browser' : 'server'}</p>; }
}`,
  'x-swallow': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-swallow', encapsulation: { type: 'scoped' } })
export class XSwallow {
  w = 'no';
  componentWillLoad() { try { this.w = String(document.title); } catch { this.w = 'caught'; } }
  render() { return <p>{this.w}</p>; }
}`,
  'x-async': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-async', encapsulation: { type: 'scoped' } })
export class XAsync {
  async componentWillLoad() { await Promise.resolve(); }
  render() { return <p>async</p>; }
}`,
  'x-thenable': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-thenable', encapsulation: { type: 'scoped' } })
export class XThenable {
  componentWillLoad() { return Promise.resolve(); }
  render() { return <p>thenable</p>; }
}`,
  'x-timer': `import { Component, State, h } from '@stencil/core';
@Component({ tag: 'x-timer', encapsulation: { type: 'scoped' } })
export class XTimer {
  @State() v = 'a';
  connectedCallback() { setTimeout(() => (this.v = 'b'), 0); }
  render() { return <p>{this.v}</p>; }
}`,
  'x-late': `import { Component, State, h } from '@stencil/core';
@Component({ tag: 'x-late', encapsulation: { type: 'scoped' } })
export class XLate {
  @State() v = 'a';
  async load() { await null; this.v = 'b'; }
  componentWillLoad() { this.load(); }
  render() { return <p>{this.v}</p>; }
}`,
  'x-after': `import { Component, State, h } from '@stencil/core';
@Component({ tag: 'x-after', encapsulation: { type: 'scoped' } })
export class XAfter {
  @State() v = 'a';
  componentDidLoad() { this.v = 'b'; }
  render() { return <p>{this.v}</p>; }
}`,
  'x-didrender': `import { Component, State, h } from '@stencil/core';
@Component({ tag: 'x-didrender', encapsulation: { type: 'scoped' } })
export class XDidRender {
  @State() v = 'a';
  componentDidRender() { if (this.v === 'a') this.v = 'b'; }
  render() { return <p>{this.v}</p>; }
}`,
  'x-element': `import { Component, Element, h } from '@stencil/core';
@Component({ tag: 'x-element', encapsulation: { type: 'scoped' } })
export class XElement {
  @Element() el!: HTMLElement;
  componentWillLoad() { this.el.setAttribute('data-x', '1'); }
  render() { return <p>el</p>; }
}`,
  'x-elementread': `import { Component, Element, h } from '@stencil/core';
@Component({ tag: 'x-elementread', encapsulation: { type: 'scoped' } })
export class XElementRead {
  @Element() el!: HTMLElement;
  render() { return <p>{this.el.id}</p>; }
}`,
  'x-ref': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-ref', encapsulation: { type: 'scoped' } })
export class XRef {
  input?: HTMLInputElement;
  componentDidLoad() { this.input!.focus(); }
  render() { return <input ref={(el) => (this.input = el)} />; }
}`,
  'x-refuse': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-refuse', encapsulation: { type: 'scoped' } })
export class XRefUse {
  render() { return <input ref={(el) => el!.setAttribute('data-r', '1')} />; }
}`,
  'x-signal': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-signal', encapsulation: { type: 'scoped' } })
export class XSignal {
  render() { return <p>{{ peek: () => 'x', subscribe: () => () => {} } as any}</p>; }
}`,
  'x-vnode': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-vnode', encapsulation: { type: 'scoped' } })
export class XVnode {
  render() { const Tag = 'section' as any; return <Tag class="dyn">dynamic</Tag>; }
}`,
  'x-table': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-table', encapsulation: { type: 'scoped' } })
export class XTable { render() { return <table><tr><td>1</td></tr></table>; } }`,
  'x-select': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-select', encapsulation: { type: 'scoped' } })
export class XSelect { render() { return <select><option value="1">1</option></select>; } }`,
  'x-textarea': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-textarea', encapsulation: { type: 'scoped' } })
export class XTextarea { render() { return <textarea>hi</textarea>; } }`,
  'x-pnest': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-pnest', encapsulation: { type: 'scoped' } })
export class XPNest { render() { return <p>a<div>b</div></p>; } }`,
  'x-valueprop': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-valueprop', encapsulation: { type: 'scoped' } })
export class XValueProp { render() { return <input value={'v'} checked={true} />; } }`,
  'x-propobj': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-propobj', encapsulation: { type: 'scoped' } })
export class XPropObj { render() { return <div title={{ a: 1 } as any}>x</div>; } }`,
  'x-tabindex': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-tabindex', encapsulation: { type: 'scoped' } })
export class XTabIndex { render() { return <div draggable={true}>x</div>; } }`,
  'x-writetask': `import { Component, h, writeTask } from '@stencil/core';
@Component({ tag: 'x-writetask', encapsulation: { type: 'scoped' } })
export class XWriteTask { componentDidLoad() { writeTask(() => {}); } render() { return <p>w</p>; } }`,
  'x-light': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-light', encapsulation: { type: 'none' }, styles: 'x-light{display:block}' })
export class XLight { render() { return <div class="l"><slot name="a" /><slot /></div>; } }`,
  'x-lightuse': `import { Component, h } from '@stencil/core';
@Component({ tag: 'x-lightuse', encapsulation: { type: 'scoped' } })
export class XLightUse { render() { return <x-light><b slot="a">A</b>rest</x-light>; } }`,
  'x-lightplain': `import { Component, Prop, h } from '@stencil/core';
@Component({ tag: 'x-lightplain', encapsulation: { type: 'none' }, styles: 'x-lightplain{display:block}' })
export class XLightPlain { @Prop() n = 1; render() { return <div class="lp">{this.n}</div>; } }`,
};

/** Pages: [name, html, options?, fallbackReason?]. A reason (substring) means the string renderer must fall back. */
export const PAGES = [
  ['shadow + style + prop', '<ssr-badge count="3"></ssr-badge>'],
  ['keyed list of shadow components + event', '<ssr-shop items="a,bb,ccc"></ssr-shop>'],
  ['same, not resumable', '<ssr-shop items="a,bb,ccc"></ssr-shop>', { resumable: false }],
  ['class, style, attr parts, scoped style, conditional', '<x-attrs></x-attrs>'],
  ['<Host>, reflect, shadow + slot element', '<x-host kind="b" n="2"></x-host>'],
  ['functional component, state set in componentWillLoad', '<x-fn rows="4"></x-fn>'],
  ['nested components, list in list', '<x-nest></x-nest>'],
  ['text around two components', 'hello <ssr-badge count="1"></ssr-badge> and <ssr-badge count="2"></ssr-badge>!'],
  ['a global counter in fields and hooks: the order components run in', '<x-order></x-order>'],
  ['a list returned straight from render: entries connect last to first', '<x-rootlist></x-rootlist>'],
  ['a list of lists returned from render', '<x-nestlist></x-nestlist>'],
  ['page-level components in order', '<x-uid name="p1"></x-uid><x-uid name="p2"></x-uid>'],
  ['shadow component with parts in its light children', '<x-shellhost n="5"></x-shellhost>'],
  ['properties, refs, spreads of native elements', '<x-parts></x-parts>'],
  ['properties, with the state flipped', '<x-parts on="false"></x-parts>'],
  ['svg: attributes, class, functional component, text', '<x-svg size="12"></x-svg>'],
  ['style objects and strings', '<x-style w="1.5em"></x-style>'],
  ['an event emitted to the element\'s own listener', '<x-listenown></x-listenown>'],
  ['a component with props the page cannot serialize (s-rh)', '<x-fnprophost></x-fnprophost>'],
  ['lists with and without something to run, skipped or not', '<x-listskip></x-listskip>'],
  ['shadow component list in a shadow root', '<x-shadowlist n="4"></x-shadowlist>'],
  ['hooks order and disconnected', '<x-hooks name="a"></x-hooks><x-hooks name="b"></x-hooks><x-hookslog></x-hookslog>'],
  ['getAssetPath, Build, getMode', '<x-misc></x-misc><x-misc src="/abs.png"></x-misc>'],
  ['text: escaping, entities, lists of text', '<x-text></x-text><x-text v="0"></x-text><x-text v="  &amp;  "></x-text>'],
  ['state script: numbers, objects, arrays, state', '<x-json n="5" s="t" st="x"></x-json><x-json></x-json>'],
  ['page markup: comments, void elements, attributes, entities, nested', '<!-- c --><div class="a  b" id=x data-q=\'1"2\' hidden><br><img src="a.png" alt=""><span>a &amp; b &lt; &gt; &quot; &nbsp; &#169;</span><!----></div> tail <p>para</p>'],
  ['page markup: svg', '<svg viewBox="0 0 10 10" class="x"><path d="M0 0" stroke-width="1"/><g><circle r="2"/></g></svg>'],
  ['page with only text', 'just text'],
  ['page with unknown custom element', '<unknown-el a="1"><b>x</b></unknown-el><ssr-badge count="1"></ssr-badge>'],
  ['light-DOM component, own content only', '<x-lightplain n="3"></x-lightplain>'],
  ['lazyDefine', '<ssr-badge count="1"></ssr-badge><x-fnprop></x-fnprop><x-listenhost></x-listenhost>', { lazyDefine: 'wake' }],
  ['lazyDefine idle', '<ssr-badge count="1"></ssr-badge><x-fnprop></x-fnprop>', { lazyDefine: 'idle' }],
  ['event types that wait, and ones that hydrate on load', '<x-listenhost></x-listenhost>'],
  ['property matrix on native elements', '<x-matrix></x-matrix>'],
  ['property matrix, plain values', '<x-matrix v="ok"></x-matrix>'],
  ['class forms', '<x-classes></x-classes>'],
  ['fragment root', '<x-frag></x-frag>'],
  ['null root', '<x-nullroot></x-nullroot><x-nullroot show></x-nullroot>'],
  ['text root', '<x-textroot></x-textroot><x-textroot t=""></x-textroot>'],
  ['no render method', '<x-norender></x-norender>'],
  ['reflected props, set in componentWillLoad', '<x-reflect a="attr" b="false" c="2" g="7"></x-reflect>'],
  ['reflected props set by a parent', '<x-reflecthost></x-reflecthost>'],
  ['attribute parsing of props', '<x-parse n="42" b="" s="y" my-attr="ma"></x-parse><x-parse n="abc" b="false"></x-parse>'],
  ['mixed lists: elements, text, null, nested, duplicate keys', '<x-mixed></x-mixed>'],
  ['<Host> with class, aria, hidden, style', '<x-hostmix></x-hostmix><x-hostmix on="false" mode="q"></x-hostmix>'],
  ['a component with attributes set by its parent', '<x-hostuse></x-hostuse>'],
  ['light components in light components', '<x-lightnested></x-lightnested>'],
  ['styles of several components in a shadow root', '<x-twostyles></x-twostyles>'],
  ['string keys, a component per entry', '<x-strkey></x-strkey>'],
  ['a component with state and a click handler', '<x-click></x-click>'],
  // Fallbacks
  ['FALLBACK style set by a parent and by <Host>', '<x-hostusestyle></x-hostusestyle>', undefined, 'style set by'],
  ['FALLBACK scoped <slot>', '<ssr-card heading="Hi"><b slot="title">T</b>body</ssr-card>', undefined, 'slot'],
  ['FALLBACK light children of a light component in the page', '<x-lightplain n="3"><b>kid</b></x-lightplain>', undefined, 'light'],
  ['FALLBACK light slots in a template', '<x-lightuse></x-lightuse>', undefined, 'slot'],
  ['FALLBACK document in a hook', '<x-dom></x-dom>', undefined, 'document'],
  ['FALLBACK typeof window in render', '<x-typeof></x-typeof>', undefined, 'window'],
  ['FALLBACK a hook that catches the DOM access', '<x-swallow></x-swallow>', undefined, 'document'],
  ['FALLBACK async componentWillLoad', '<x-async></x-async>', undefined, 'async'],
  ['FALLBACK a hook returning a promise', '<x-thenable></x-thenable>', undefined, 'promise'],
  ['FALLBACK a timer started by a hook', '<x-timer></x-timer>', undefined, 'setTimeout'],
  ['FALLBACK a promise continuation that sets state', '<x-late></x-late>', undefined, 'after'],
  ['FALLBACK state set in componentDidLoad', '<x-after></x-after>', undefined, 'after the first render'],
  ['FALLBACK state set in componentDidRender', '<x-didrender></x-didrender>', undefined, 'first render'],
  ['FALLBACK @Element used in a hook', '<x-element></x-element>', undefined, 'element'],
  ['FALLBACK @Element read in render', '<x-elementread></x-elementread>', undefined, 'element'],
  ['FALLBACK a ref used in a hook', '<x-ref></x-ref>', undefined, 'ref'],
  ['FALLBACK a ref callback using the element', '<x-refuse></x-refuse>', undefined, 'ref'],
  ['FALLBACK a signal in a part', '<ssr-live></ssr-live>', undefined, 'signal'],
  ['FALLBACK a dynamic tag (vnode)', '<x-vnode></x-vnode>', undefined, 'tag'],
  ['FALLBACK a table in a template', '<x-table></x-table>', undefined, 'table'],
  ['FALLBACK a select in a template', '<x-select></x-select>', undefined, 'select'],
  ['FALLBACK a textarea in a template', '<x-textarea></x-textarea>', undefined, 'textarea'],
  ['FALLBACK <div> inside <p>', '<x-pnest></x-pnest>', undefined, '<p>'],
  ['FALLBACK the value property', '<x-valueprop></x-valueprop>', undefined, 'property'],
  ['FALLBACK an object for a property', '<x-propobj></x-propobj>', undefined, 'property'],
  ['an attribute that happy-dom has no property for', '<x-tabindex></x-tabindex>'],
  ['FALLBACK writeTask', '<x-writetask></x-writetask>', undefined, 'writeTask'],
  ['FALLBACK an event that bubbles to a listener above the emitter', '<x-listenabove></x-listenabove>', undefined, 'listeners'],
  ['FALLBACK an event that a @Listen on the host hears', '<x-hostlisten></x-hostlisten>', undefined, 'listeners'],
  ['FALLBACK a style the DOM would rewrite', '<x-styleunsafe></x-styleunsafe>', undefined, 'style'],
  ['FALLBACK page markup the HTML parser restructures', '<table><tr><td>1</td></tr></table>', undefined, 'table'],
  ['FALLBACK a page <p> that a <div> closes', '<p>a<div>b</div></p>', undefined, '<p>'],
  ['FALLBACK an entity without a semicolon', 'a &copy 2020', undefined, 'entity'],
  ['FALLBACK an unknown entity', 'a &acd; b', undefined, 'entity'],
];

/** The component sources: the SSR fixtures, then the extra ones. */
export function sources() {
  return { ...compiledSources('@popcorn245/stencilrs/runtime'), ...Object.fromEntries(Object.entries(EXTRA).map(([tag, src]) => [tag, compile(tag, src)])) };
}
function compile(tag, src) {
  const { code, diagnostics } = transpile(src, { file: `${tag}.tsx`, componentExport: 'stencilrs' });
  const errors = diagnostics.filter((d) => d.level === 'error');
  if (errors.length) throw new Error(`${tag}: ${errors.map((d) => d.message).join('\n')}`);
  return code;
}

/** Writes every component for `runtimeUrl` into a fresh temp dir, and returns the loader of them all. */
export function writeBundle(runtimeUrl) {
  const dir = mkdtempSync(join(tmpdir(), 'rs-str-'));
  mkdirSync(dir, { recursive: true });
  const urls = [];
  for (const [tag, code] of Object.entries(sources())) {
    const file = join(dir, `${tag}.mjs`);
    writeFileSync(file, code.replaceAll('"@popcorn245/stencilrs/runtime"', JSON.stringify(runtimeUrl)));
    urls.push(pathToFileURL(file).href);
  }
  return { dir, urls, load: () => Promise.all(urls.map((u) => import(u))) };
}
