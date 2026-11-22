// Differential test: ssr-serializer.js against mock-doc's own `serializeNodeToHtml`, byte for byte.
//
// Stencil ships mock-doc inlined in its hydrate runner, so the runner (`@stencil/core/runtime/server/
// runner.mjs`) is bundled twice with a stub in place of the components: as it is, and through
// `fastSerializerPlugin()`. Trees are built by that runner's MockWindow, and each is serialized by
// the original and by the patched bundle's function, across an options matrix.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { rolldown } from 'rolldown';

import { fastSerializerPlugin, hasSerializer, patchSerializer } from '../ssr.js';

const require = createRequire(import.meta.url);
const core = dirname(require.resolve('@stencil/core/package.json'));
const runner = join(core, 'dist/runtime/server/runner.mjs');

// Both bundles also export what the test needs from inside the runner.
const exposeInternals = {
  name: 'expose-internals',
  transform: (code, id) => (id === runner ? `${code}\nexport { MockWindow, serializeNodeToHtml as __serialize };\n` : null),
};
const stubs = {
  name: 'stubs',
  resolveId: (id) => (id === '@stencil/core/runtime/server/ssr-factory' ? '\0factory' : id === '@stencil/core/app-data' ? join(core, 'dist/app-data/index.js') : null),
  load: (id) => (id === '\0factory' ? 'export const ssrFactory = () => {};' : null),
};
const load = async (plugins) => {
  const bundle = await rolldown({ input: runner, treeshake: false, external: ['node:stream'], plugins: [stubs, ...plugins] });
  const { output } = await bundle.generate({ format: 'esm' });
  const code = output.find((o) => o.type === 'chunk').code;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
};
// The plugin must run before `exposeInternals` appends its export (which names the function), and
// the fast bundle's `__serialize` is the forwarding wrapper.
const slow = await load([exposeInternals]);
const fast = await load([fastSerializerPlugin(), exposeInternals]);

const { MockWindow } = slow;
const parse = (html) => new MockWindow(html).document;
const NBSP = ' ';

/** Named inputs: `html` is parsed, `build(doc)` then edits the tree (shadow roots, odd attributes). */
const corpus = {
  minimal: { html: '<!doctype html><html><head></head><body><p>hi</p></body></html>' },
  text: { html: `<html><body><p>a &amp; b &lt; c &gt; d ${NBSP}e "q" 'r'</p>  <p>  padded   text  </p><span> x </span><span>y </span></body></html>` },
  entities: { html: '<html><body><p>&copy; &nbsp; &#x1F600; &euro;</p><a title="a &amp; b &quot;c&quot; &lt;d&gt;">x</a></body></html>' },
  attrs: {
    html: `<html><body><div id="" class="" lang="" dir="" title="" name="" data-a="" data-b="x" aria-label="a &quot;b&quot; &amp; c" data-q='"' data-s="it's" data-n="a${NBSP}b" hidden disabled="" checked="checked" x-y="" foo=bar baz="a b" e="" f="a-b" g="a=b" h="a/b" i="a\`b" j="a<b" k="a>b" l="a\\b" m="a\tb"></div></body></html>`,
  },
  booleans: { html: '<html><body><input type="checkbox" checked disabled readonly required><select multiple><option selected>a</option></select><details open><summary>s</summary></details><video autoplay controls loop muted></video></body></html>' },
  comments: { html: '<html><head><!-- head --></head><body><!-- a --><p><!-- b -->x<!--r.1--></p><!--o.2--><!--s.3--><!--t.4--><!----></body></html>' },
  whitespace: { html: '<html><body>\n  <div>\n    <p> one </p>\n\n    <p>two</p>\n  </div>\n  <span> a </span> <span>b</span>\n</body></html>' },
  sensitive: { html: '<html><body><pre>  a\n  <b> b </b>\n  </pre><textarea>\n  x &amp; y </textarea><code> c  d </code><output> o </output><div>  <pre>  </pre>  </div></body></html>' },
  rawText: { html: '<html><head><style> a > b { x: "y" } </style><script>if (a < b && c) { x = "</" + "b>"; }</script><noscript> <img src=x> </noscript></head><body><iframe> t </iframe><script>  </script><style></style></body></html>' },
  template: { html: '<html><body><template><p> in </p><span>x</span></template><template id="t"></template><div><template><b>y</b></template></div></body></html>' },
  svg: { html: '<html><body><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1 1"><use xlink:href="#a"></use><path d="M0 0"/><foreignObject><div>x</div></foreignObject><text xml:lang="en">t</text></svg></body></html>' },
  styleAttr: { html: '<html><body><div style="color: red; background: blue"><span style="">x</span><p style="margin:0">y</p></div></body></html>' },
  voids: { html: '<html><head><meta charset="utf-8"><link rel="stylesheet" href="a.css"><base href="/"></head><body><br><hr><img src="a.png" alt=""><input value="v"><wbr></body></html>' },
  longLine: { html: `<html><head><title>${'long title '.repeat(20)}</title></head><body><div class="a b c" data-one="1111111111" data-two="2222222222" data-three="3333333333" data-four="4444444444" style="color:red;background:blue;margin:0;padding:0">${'word '.repeat(60)}</div></body></html>` },
  hydrated: {
    // Parsed output of an earlier render: a hydrated host with its declarative shadow root template.
    html: '<html><body><my-cmp s-id="1" class="hydrated b a"><template shadowrootmode="open"><style>:host{display:block}</style><slot></slot></template><!--r.1-->light <b>x</b></my-cmp><my-cmp s-id="2"></my-cmp><other-cmp><template shadowrootmode="open"><p>x</p></template></other-cmp></body></html>',
  },
  shadow: {
    html: '<html><body><my-a id="a">light</my-a><my-b id="b"></my-b><my-c id="c"><i> i </i></my-c><my-d id="d"> </my-d><my-e id="e"></my-e><my-f id="f"><span>x</span></my-f></body></html>',
    build(doc) {
      const a = doc.getElementById('a').attachShadow({ mode: 'open' });
      a.innerHTML = '<style>:host { display: block }</style><div class="w  v"><slot></slot></div> text &amp; more';
      doc.getElementById('b').attachShadow({ mode: 'open', delegatesFocus: true }).innerHTML = '<button>b</button>';
      const c = doc.getElementById('c').attachShadow({ mode: 'open', delegatesFocus: true, clonable: true });
      c.innerHTML = '<slot></slot>';
      c.serializable = true;
      // Nested: a shadow root inside a shadow root inside the light tree.
      const inner = a.querySelector('div');
      const nested = doc.createElement('my-nested');
      inner.appendChild(nested);
      nested.attachShadow({ mode: 'open' }).innerHTML = '<p>nested <my-deep></my-deep></p>';
      nested.shadowRoot.querySelector('my-deep').attachShadow({ mode: 'open' }).innerHTML = '<em>deep</em>';
      doc.getElementById('d').attachShadow({ mode: 'open' });
      doc.getElementById('e').attachShadow({ mode: 'open' }).innerHTML = ' ';
      doc.getElementById('f').attachShadow({ mode: 'open' }).innerHTML = '<pre> a\n b </pre>';
    },
  },
  scoped: { html: '<html><body><my-s class="sc-my-s-h hydrated" s-id="3"><!--r.3--><div class="sc-my-s"><!--o.0.1--><span s-id="4" c-id="1.0.0.0"><!--t.1.2.3.4--><!--s.5-->t</span></div></my-s></body></html>' },
  mutated: {
    html: '<html><body><div id="x"></div></body></html>',
    build(doc) {
      const x = doc.getElementById('x');
      x.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:lang', 'en');
      x.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:foo', 'urn:x');
      x.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'urn:y');
      x.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#z');
      x.setAttributeNS('urn:other', 'o:thing', 'v');
      x.setAttribute('weird', 12);
      x.appendChild(doc.createTextNode(''));
      x.appendChild(doc.createTextNode('   '));
      x.appendChild(doc.createTextNode(`${NBSP}lead and trail${NBSP}`));
      x.appendChild(doc.createComment(' c '));
      x.appendChild(doc.createComment(''));
      const t = doc.createElement('textarea');
      t.appendChild(doc.createTextNode('  keep\n me  '));
      x.appendChild(t);
    },
  },
};

// The ui-kit page its smoke test renders, when it has been built: real component output.
const uiKitPage = join(dirname(fileURLToPath(import.meta.url)), '../examples/ui-kit/dist/hydrate-smoke/page.html');
if (existsSync(uiKitPage)) corpus['ui-kit render'] = { html: readFileSync(uiKitPage, 'utf8') };

const make = ({ html, build }) => {
  const doc = parse(html);
  build?.(doc);
  return doc;
};

const product = (axes) => axes.reduce((acc, [key, values]) => acc.flatMap((o) => values.map((v) => (v === undefined ? o : { ...o, [key]: v }))), [{}]);
const layout = product([
  ['prettyHtml', [undefined, false, true]],
  ['newLines', [undefined, false, true]],
  ['indentSpaces', [undefined, 0, 2]],
  ['approximateLineWidth', [undefined, -1, 30, 80]],
]);
const quoting = product([
  ['removeEmptyAttributes', [undefined, false]],
  ['removeAttributeQuotes', [undefined, true]],
  ['removeBooleanAttributeQuotes', [undefined, true]],
  ['removeHtmlComments', [undefined, true]],
]);
const structure = product([
  ['serializeShadowRoot', [undefined, false, 'scoped']],
  ['excludeTags', [undefined, ['span', 'my-a', 'template'], ['body']]],
  ['excludeTagContent', [undefined, ['p', 'my-c', 'style']]],
  ['fullDocument', [undefined, false]],
]);

test('the plugin patched the runner, and the original stayed intact', () => {
  assert.equal(slow.__serialize.toString().includes('stencilrsFastSerialize'), false);
  assert.equal(fast.__serialize.toString().includes('stencilrsFastSerialize'), true);
});

for (const [name, entry] of Object.entries(corpus)) {
  test(`byte-identical to mock-doc: ${name}`, () => {
    const doc = make(entry);
    const targets = [['document', doc, [false]], ['element', doc.body.firstElementChild ?? doc.body, [true]]];
    let cases = 0;
    // The full product is ~190k serializations per input: every layout x quoting pair gets one
    // structure option set (rotating, so all of them are met), and every structure set meets a few
    // fixed layout x quoting bases.
    const bases = [{}, { newLines: true, indentSpaces: 2, approximateLineWidth: 30 }, { removeAttributeQuotes: true, removeBooleanAttributeQuotes: true, removeHtmlComments: true, removeEmptyAttributes: false }];
    const sets = [];
    layout.forEach((l, i) => quoting.forEach((q, j) => sets.push({ ...l, ...q, ...structure[(i * quoting.length + j) % structure.length] })));
    for (const b of bases) for (const s of structure) sets.push({ ...b, ...s });
    for (const [label, , outer] of targets) {
      for (const set of sets) {
        // A fresh tree per prettyHtml case: the original rewrites class attributes there.
        const tree = set.prettyHtml ? make(entry) : doc;
        const node = label === 'document' ? tree : tree.body.firstElementChild ?? tree.body;
        const opts = { ...set, outerHtml: outer[0] };
        const want = slow.__serialize(node, opts);
        const got = fast.__serialize(node, opts);
        if (want !== got) assert.equal(got, want, `${label} ${JSON.stringify(opts)}`);
        cases++;
      }
    }
    assert.ok(cases > 1000);
  });
}

test('the property getters that use the serializer agree (outerHTML, innerHTML)', () => {
  for (const entry of Object.values(corpus)) {
    const a = make(entry);
    const b = make(entry);
    // Different bundles, equal trees: compare the serializers' results on them.
    assert.equal(fast.__serialize(b), slow.__serialize(a));
    assert.equal(fast.__serialize(b.body, { newLines: false, indentSpaces: 0 }), slow.__serialize(a.body, { newLines: false, indentSpaces: 0 }));
  }
});

test('the guard fails loudly when the runner is not the one it was written for', () => {
  const source = readFileSync(runner, 'utf8');
  assert.ok(hasSerializer(source));
  assert.throws(() => patchSerializer('const x = 1;'), /has mock-doc changed/);
  assert.throws(() => patchSerializer(source.replace('const HYDRATE_ID = "s-id";', 'const HYDRATE_ID = "other";')), /HYDRATE_ID/);
  assert.throws(() => patchSerializer(`${source}\nfunction serializeNodeToHtml(a) {}`), /expected one/);
  const plugin = fastSerializerPlugin();
  assert.equal(plugin.transform('const y = 2;'), null);
  assert.throws(() => plugin.buildEnd(), /slow serializer would ship/);
});
