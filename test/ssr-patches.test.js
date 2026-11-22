// ssr-patches.js: each runtime patch against mock-doc's own behaviour (differential, on the runner bundled with and without
// the patch), and each patch's guard (it throws, naming itself, when the code it patches is not what it expects).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { rolldown } from 'rolldown';

import { RUNTIME_PATCHES, patchRuntime, runtimePatchesPlugin, selectPatches } from '../ssr-patches.js';

const require = createRequire(import.meta.url);
const core = dirname(require.resolve('@stencil/core/package.json'));
const runner = join(core, 'dist/runtime/server/runner.mjs');

const expose = {
  name: 'expose-internals',
  transform: (code, id) => (id === runner ? `${code}\nexport { MockWindow };\n` : null),
};
const stubs = {
  name: 'stubs',
  resolveId: (id) => (id === '@stencil/core/runtime/server/ssr-factory' ? '\0factory' : id === '@stencil/core/app-data' ? join(core, 'dist/app-data/index.js') : null),
  load: (id) => (id === '\0factory' ? 'export const ssrFactory = () => {};' : null),
};
const load = async (plugins) => {
  const bundle = await rolldown({ input: runner, treeshake: false, external: ['node:stream'], plugins: [stubs, ...plugins] });
  const { output } = await bundle.generate({ format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(output.find((o) => o.type === 'chunk').code).toString('base64')}`);
};
// The patches that target the runner module (the css cache targets the ssr factory, tested below).
const MOCK_DOC = selectPatches({ cssCache: false });
const plain = await load([expose]);
// `expose` must append its export before the patches' regions; either order works since both only append.
const patched = await load([runtimePatchesPlugin(MOCK_DOC), expose]);

const HTML = `<!doctype html><html lang="en"><head><title>t</title></head><body>
<div id="a" class="x y" data-n="1"><p>one</p>text<!-- c --><span part="p q" slot="s">two</span><svg xlink:href="#z" viewBox="0 0 1 1"><use xlink:href="#q"></use></svg></div>
<ul><li class="i">1</li><li>2</li><li class="i">3</li></ul>
</body></html>`;

/** Runs the same script of operations on a window from each bundle; the observable results must match exactly. */
const observe = ({ MockWindow }) => {
  const out = [];
  const win = new MockWindow(HTML);
  const doc = win.document;
  const a = doc.getElementById('a');
  out.push(a.getAttribute('class'), a.getAttribute('CLASS'), a.getAttribute('missing'), a.hasAttribute('data-n'), a.getAttributeNS(null, 'id'));
  a.setAttribute('data-n', '2');
  a.setAttribute('Data-New', 'v');
  a.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#h');
  a.setAttributeNS(null, 'title', 'T');
  a.setAttribute('style', 'color: red');
  out.push(a.getAttribute('data-n'), a.getAttribute('data-new'), a.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), a.getAttribute('title'), a.getAttribute('style'));
  a.removeAttribute('data-n');
  a.removeAttributeNS(null, 'title');
  out.push(a.hasAttribute('data-n'), a.getAttributeNames().join(','), a.attributes.length, a.attributes[0].name, a.attributes.item(1).value, [...a.attributes].map((x) => `${x.name}=${x.value}`).join(';'));
  // `attributes` replaced wholesale: lookups must follow the new map, not a cached one.
  const spare = doc.createElement('i');
  spare.setAttribute('only', 'here');
  a.attributes = spare.attributes;
  out.push(a.getAttribute('only'), a.getAttribute('class'), a.hasAttribute('id'));
  a.setAttribute('after', 'x');
  out.push(a.getAttribute('after'), spare.getAttribute('after'));
  const svgUse = doc.querySelector('use');
  out.push(svgUse.getAttribute('xlink:href'), svgUse.getAttributeNS('http://www.w3.org/1999/xlink', 'href'));
  // children getters
  const body = doc.body;
  out.push(body.children.length, body.childElementCount, body.firstElementChild?.nodeName, body.lastElementChild?.nodeName, doc.createElement('b').firstElementChild, doc.createElement('b').children.length);
  const ul = doc.querySelector('ul');
  out.push(ul.children.map((c) => c.textContent).join(), ul.firstElementChild.textContent, ul.lastElementChild.textContent, ul.nextElementSibling?.nodeName);
  ul.appendChild(doc.createTextNode('t'));
  out.push(ul.children.length, ul.childElementCount, ul.childNodes.length);
  const frag = doc.createDocumentFragment();
  frag.appendChild(doc.createElement('em'));
  frag.appendChild(doc.createTextNode('x'));
  out.push(frag.children.length, frag.childElementCount, frag.firstElementChild?.nodeName);
  out.push(doc.getElementsByTagName('li').length, doc.getElementsByTagName('*').length, body.getElementsByClassName('i').length, doc.getElementsByClassName('x y').length, ul.getElementsByTagName('LI').map((e) => e.textContent).join());
  // selectors: repeated (cache hits), from different contexts, and ones that throw / match nothing
  for (const sel of ['li.i', 'li.i', 'ul > li:first-child', 'p, span[part~="q"]', '[slot]', 'svg use', 'li:not(.i)', 'div#a']) {
    out.push(sel, doc.querySelectorAll(sel).map((e) => e.nodeName + e.textContent).join('|'), ul.querySelectorAll(sel).length, doc.querySelector(sel)?.nodeName ?? null);
  }
  const li = ul.firstElementChild;
  out.push(li.closest('ul').nodeName, li.closest('ul').nodeName, li.closest('.nope'), li.matches('li.i'), li.matches('li.i'), li.matches('p'));
  for (const bad of ['', '[', ':::', '1x', 'a >']) {
    try {
      out.push(bad, String(doc.querySelectorAll(bad).length));
    } catch (e) {
      out.push(bad, `throws ${e.constructor.name}`);
    }
  }
  out.push(doc.documentElement.outerHTML);
  win.close?.();
  return out;
};

test('patched mock-doc behaves as the original: attributes, children, selectors', () => {
  const expected = observe(plain);
  assert.deepEqual(observe(patched), expected);
  // twice more: the caches are warm now
  assert.deepEqual(observe(patched), expected);
});

test('the selector parse cache hands out a fresh array each time (nwsapi rewrites it in place)', () => {
  const win = new patched.MockWindow(HTML);
  const first = win.document.querySelectorAll('li.i').length;
  for (let i = 0; i < 3; i++) assert.equal(win.document.querySelectorAll('li.i').length, first);
  assert.equal(win.document.querySelectorAll('ul li.i, p').length, 3);
});

test('every runtime patch has a name, a summary and an anchor, and selectPatches opts out by name', () => {
  assert.deepEqual(RUNTIME_PATCHES.map((p) => p.name), ['selectorCache', 'attributes', 'elementChildren', 'cssCache']);
  for (const p of RUNTIME_PATCHES) assert.ok(p.summary && p.anchor && typeof p.apply === 'function', p.name);
  assert.equal(selectPatches(true).length, 4);
  assert.equal(selectPatches(false).length, 0);
  assert.deepEqual(selectPatches({ cssCache: false, attributes: false }).map((p) => p.name), ['selectorCache', 'elementChildren']);
  assert.throws(() => selectPatches({ nope: false }), /unknown runtime patch "nope"/);
});

// ---- guards: a module that has the anchor but not the rest of the code throws, naming the patch ----
const only = (name) => RUNTIME_PATCHES.filter((p) => p.name === name);
const real = (await import('node:fs')).readFileSync(runner, 'utf8');

test('each mock-doc patch applies to the installed runner, once', () => {
  for (const name of ['selectorCache', 'attributes', 'elementChildren']) {
    const { applied, code } = patchRuntime(real, only(name));
    assert.deepEqual(applied, [name]);
    assert.notEqual(code, real);
  }
});

test('a module without a patch\'s anchor is left alone', () => {
  assert.deepEqual(patchRuntime('const nothing = 1;', RUNTIME_PATCHES), { code: 'const nothing = 1;', applied: [] });
});

test('selectorCache throws when nwsapi\'s parse is defined twice', () => {
  // the anchor twice
  const twice = `${real.slice(0, real.length)}\n}, parse = function(selectors, type) {`;
  assert.throws(() => patchRuntime(twice, only('selectorCache')), /expected 1.*found 2/);
});

test('attributes throws when mock-doc\'s attribute map or element methods moved', () => {
  assert.throws(() => patchRuntime('var MockAttributeMap = class {\n\tother;', only('attributes')), /stencilrs ssr patch "attributes"/);
  assert.throws(() => patchRuntime(real.replaceAll('this.attributes.getNamedItemNS(', 'this.attrs.getNamedItemNS('), only('attributes')), /"attributes".*getNamedItemNS.*found 0/s);
  assert.throws(() => patchRuntime(real.replace('const attributes = this.attributes;', 'const attributes = this.attributes();'), only('attributes')), /"attributes".*expected 2.*found 1/s);
});

test('elementChildren throws when a children getter changed', () => {
  assert.throws(() => patchRuntime(real.replace('return this.children[0] || null;', 'return this.children.at(0) || null;'), only('elementChildren')), /"elementChildren".*firstElementChild|"elementChildren"/s);
  assert.throws(() => patchRuntime('get childElementCount() {', only('elementChildren')), /"elementChildren"/);
});

test('the plugin fails the build when an enabled patch found no module', async () => {
  const plugin = runtimePatchesPlugin(true);
  assert.equal(plugin.transform('const nothing = 1;'), null);
  assert.throws(() => plugin.buildEnd(), /runtime patch\(es\) selectorCache, attributes, elementChildren, cssCache found no module/);
  const ok = runtimePatchesPlugin({ selectorCache: false, attributes: false, elementChildren: false, cssCache: false });
  assert.doesNotThrow(() => ok.buildEnd());
});

// ---- cssCache: lives in the ssr factory (the server runtime), whose text is built per project: tested on its call sites ----
const FACTORY = `function init() {
	if (cmpMeta.$flags$ & CMP_FLAGS.shadowNeedsScopedCss) style = scopeCss(style, scopeId, true);
	else if (needsScopedSSR()) style = expandPartSelectors(style);
}`;

test('cssCache wraps both call sites and memoizes by style text and scope id', () => {
  const { code, applied } = patchRuntime(FACTORY, only('cssCache'));
  assert.deepEqual(applied, ['cssCache']);
  assert.match(code, /style = \$stencilrsCssMemo\("scope", scopeCss, style, scopeId\);/);
  assert.match(code, /style = \$stencilrsCssMemo\("parts", expandPartSelectors, style\);/);
  const region = code.slice(code.indexOf('//#region stencilrs ssr patch: cssCache'));
  const memo = new Function(`${region}\nreturn $stencilrsCssMemo;`)();
  let calls = 0;
  const scope = (css, id, comment) => (calls++, `${id}|${comment}|${css}`);
  const parts = (css) => (calls++, `parts|${css}`);
  assert.equal(memo('scope', scope, 'a{}', 'sc-x'), 'sc-x|true|a{}');
  assert.equal(memo('scope', scope, 'a{}', 'sc-x'), 'sc-x|true|a{}');
  assert.equal(memo('scope', scope, 'a{}', 'sc-y'), 'sc-y|true|a{}'); // another scope id is another entry
  assert.equal(memo('scope', scope, 'b{}', 'sc-x'), 'sc-x|true|b{}'); // another style is another entry
  assert.equal(memo('parts', parts, 'a{}'), 'parts|a{}'); // the two rewrites do not share entries
  assert.equal(memo('parts', parts, 'a{}'), 'parts|a{}');
  assert.equal(calls, 4);
  // an empty result is cached too, and a non-string style is passed through, never cached
  assert.equal(memo('parts', () => (calls++, ''), 'e{}'), '');
  assert.equal(memo('parts', () => (calls++, 'NOT CALLED'), 'e{}'), '');
  assert.equal(memo('parts', (s) => (calls++, `n:${s}`), undefined), 'n:undefined');
  assert.equal(calls, 6);
});

test('cssCache throws when a call site is missing or duplicated', () => {
  assert.throws(() => patchRuntime(FACTORY.replace('expandPartSelectors(style)', 'expandPartSelectors(style, 1)'), only('cssCache')), /"cssCache".*expandPartSelectors.*found 0/s);
  assert.throws(() => patchRuntime(`${FACTORY}\n${FACTORY}`, only('cssCache')), /"cssCache".*expected 1.*found 2/s);
});
