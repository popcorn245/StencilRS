// Islands in scoped mode (#206): `serializeShadowRoot: 'scoped'` renders a shadow component as light DOM with slots, so the children of such a component are
// relocation candidates (Stencil moves each to its slot and annotates it with `c-id` / `s-sn` and an `<!--o.-->` comment in the host). An island that is a direct child
// of one has to carry that annotation: the shell gets a marker per top-level element, and each element takes the place and the annotation of its marker.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { stencilEngine } from '../express.js';
import { findMarkers, pieceHtml, splitIslands, stripAnnotations, topLevelElements } from '../express-islands.js';
import { ISLAND_B } from './fixtures/islands/build.mjs';
import { buildFixture } from './fixtures/islands/setup.mjs';

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  // no browser here
}
const skip = !chromium && 'playwright not installed';

// --- the pure pieces -------------------------------------------------------------------------------------------------

test('topLevelElements: the elements at the top, void and self-closing ones included, and whether there is text beside them', () => {
  const html = '<!-- c --> <a x="1>2"><i>y</i></a>\n<br><svg><path d="m"/></svg><c-d/> <p>open';
  const { roots, stray } = topLevelElements(html);
  assert.deepEqual(roots.map((r) => html.slice(r.start, r.end)), ['<a x="1>2"><i>y</i></a>', '<br>', '<svg><path d="m"/></svg>', '<c-d/>', '<p>open']);
  assert.equal(stray, false, 'whitespace and comments are not text');
  assert.equal(topLevelElements('<b>x</b> and <i>y</i>').stray, true);
  assert.deepEqual(topLevelElements('just text'), { roots: [], stray: true });
  assert.deepEqual(topLevelElements('  '), { roots: [], stray: false });
});

test('splitIslands with relocate: one marker per top-level element, carrying its slot; without it the shell is as it was', () => {
  const view = '<x-p><stencil-island name="a"><b slot="end">1</b> <i>2</i><u slot=\'s"\'>3</u></stencil-island></x-p><stencil-island name="b">text</stencil-island><stencil-island name="c">  </stencil-island>';
  const plain = splitIslands(view);
  assert.equal(plain.shell, '<x-p><stencil-island data-island-slot="0"></stencil-island></x-p><stencil-island data-island-slot="1"></stencil-island><stencil-island data-island-slot="2"></stencil-island>');
  assert.equal(plain.relocate, false);
  assert.deepEqual(plain.islands.map((i) => i.roots), [1, 1, 1]);
  const split = splitIslands(view, { relocate: true });
  assert.equal(split.shell, '<x-p><stencil-island data-island-slot="0" data-island-root="0" slot="end"></stencil-island><stencil-island data-island-slot="0" data-island-root="1"></stencil-island><stencil-island data-island-slot="0" data-island-root="2" slot="s&quot;"></stencil-island></x-p><stencil-island data-island-slot="1" data-island-root="0"></stencil-island><stencil-island data-island-slot="2" data-island-root="0"></stencil-island>');
  assert.deepEqual(split.islands.map((i) => i.roots), [3, 1, 1], 'an island with no element (text, nothing) keeps one marker');
  assert.equal(split.relocate, true);
});

test('findMarkers: markers that scoped rendering moved apart, their annotation, and the DSD refusal of an annotated marker', () => {
  const islands = [{ name: 'a', roots: 2 }, { name: 'b', roots: 1 }];
  const shell = '<x-p><!--o.0.2.--><stencil-island data-island-slot="0" data-island-root="1" slot="s" hidden="" c-id="0.3"></stencil-island><div><stencil-island data-island-slot="0" data-island-root="0" c-id="0.2" s-sn=""></stencil-island></div></x-p><stencil-island data-island-slot="1" data-island-root="0"></stencil-island>';
  const found = findMarkers(shell, islands, { relocate: true });
  assert.deepEqual(found.map((m) => [m.slot, m.root, m.relocation]), [[0, 1, { cid: '0.3', sn: undefined }], [0, 0, { cid: '0.2', sn: '' }], [1, 0, null]], 'in document order, each says which element it stands for');
  assert.throws(() => findMarkers(shell, islands), /island "a" sits directly inside a component that is not a shadow host and has slots/);
  assert.throws(() => findMarkers(shell.replace('<stencil-island data-island-slot="1" data-island-root="0"></stencil-island>', ''), islands, { relocate: true }), /island "b": its marker is not in the rendered shell/);
  assert.throws(() => findMarkers(shell.replace(/<div>.*<\/div>/, ''), islands, { relocate: true }), /island "a": its marker is not in the rendered shell/);
});

test('findMarkers: the markers of an island that nothing annotated, and that stayed together, are one place', () => {
  const islands = [{ name: 'a', roots: 3 }];
  const marker = (k) => `<stencil-island data-island-slot="0" data-island-root="${k}"></stencil-island>`;
  const found = findMarkers(`<div>${marker(0)}${marker(1)}\n${marker(2)}</div>`, islands, { relocate: true });
  assert.deepEqual(found.map((m) => [m.slot, m.root, m.relocation]), [[0, 0, null]]);
  const apart = findMarkers(`<div>${marker(0)}${marker(1)}</div><p>${marker(2)}</p>`, islands, { relocate: true });
  assert.deepEqual(apart.map((m) => m.root), [0, 2], 'not adjacent: a place each');
  const annotated = findMarkers(`<x>${marker(0).replace('>', ' c-id="0.2">')}${marker(1)}${marker(2)}</x>`, islands, { relocate: true });
  assert.deepEqual(annotated.map((m) => m.root), [0, 1, 2], 'an island with an annotated marker keeps a place per element');
});

test('pieceHtml: the whole island, or the element of the marker', () => {
  assert.equal(pieceHtml({ html: '<a></a><b></b>' }, 0), '<a></a><b></b>');
  assert.equal(pieceHtml({ html: '<a></a><b></b>', pieces: ['<a></a>', '<b></b>'] }, 1), '<b></b>');
  assert.equal(pieceHtml({ html: '', pieces: ['', ''] }, 5), '');
});

test('stripAnnotations leaves what the shell annotated to the caller: a static island in scoped mode keeps only the annotations it is given back', () => {
  const html = '<isl-tag s-id="1002" c-id="0.3" s-sn="" class="x"><!--r.1002--><!--o.0.1002.c--><span c-id="1002.0.0.0"><!--s.1002.1.1.0.--><!--t.0.1002-->two</span></isl-tag>';
  assert.equal(stripAnnotations(html), '<isl-tag class="x"><span>two</span></isl-tag>');
});

// --- the engine ------------------------------------------------------------------------------------------------------

const built = await buildFixture({ client: true });
const dir = mkdtempSync(join(tmpdir(), 'stencilrs-islands-scoped-'));
const engines = [];
const make = (options) => engines.push(stencilEngine({ hydrate: built.hydrate, renderOptions: { buildId: 'b', serializeShadowRoot: 'scoped' }, ...options })) && engines.at(-1);
after(() => Promise.all(engines.map((e) => e.close())));
let n = 0;
const view = (html) => {
  const file = join(dir, `v${n++}.html`);
  writeFileSync(file, html);
  return file;
};
const renderView = (engine, file, locals = {}) => new Promise((ok, no) => engine(file, locals, (err, html) => (err ? no(err) : ok(html))));
const collect = async (iterable) => {
  const out = [];
  for await (const c of iterable) out.push(c);
  return out;
};
const count = (s, text) => s.split(text).length - 1;
const DOC = (body) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>t</title></head>\n<body>${body}</body></html>`;

// What `isl-counter` (shadow, one default slot) gets as children is relocated into its `.box`; `slot="s"` has no slot to go to, so Stencil puts it first and hides it.
const A = '<isl-tag tone="loud">alpha</isl-tag> <isl-tag slot="s">two</isl-tag> <isl-tag>three</isl-tag>';
const page = (island) => DOC(`<h1>shell</h1><isl-counter label="S" count="1">\n${island('a', A)}\n</isl-counter>\n<section id="b">${island('b', ISLAND_B)}</section><footer>end</footer>`);
const WHOLE = page((_name, html) => html);
const SPLIT = page((name, html) => `<stencil-island name="${name}" client="visible">${html}</stencil-island>`);

/** A page as the DOM it describes: ids, island marks and Stencil's `hidden` left out, attributes sorted (an island writes its annotation where the full render does not). */
const shape = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[rostc]\.[^>]*-->/g, '')
    .replace(/ (?:s-id|data-island|data-client)="[^"]*"| hidden=""/g, '')
    .replace(/<([a-z][\w-]*)((?: [^<>]*?)?)(\/?)>/g, (_m, tag, attrs, close) => `<${tag}${[...attrs.matchAll(/ ([^\s=]+)(?:="([^"]*)")?/g)].map((a) => a[0]).sort().join('')}${close}>`)
    .replace(/ c-id="[^"]*"/g, ' c-id')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ');
/** The relocation marks of a page: for each node with a `c-id` of the root level, its tag and the `s-sn`, and the `<!--o.-->` comments, by number. */
const relocations = (html) => ({
  nodes: [...html.matchAll(/<([a-z][\w-]*)\b[^>]*? c-id="0\.(\d+)"[^>]*>/g)].map((m) => [m[1], / s-sn="([^"]*)"/.exec(m[0])?.[1] ?? null, Number(m[2])]),
  origins: [...html.matchAll(/<!--o\.0\.(\d+)\.(\w*)-->/g)].map((m) => Number(m[1])),
});

for (const [name, options] of [['in-process', {}], ['workers: 2', { workers: 2 }]]) {
  test(`scoped islands (${name}): the engine takes the option, and the page is the full render's, relocation marks and all`, async () => {
    const engine = make({ ...options, islands: {} });
    await engine.ready;
    const plain = make({ ...options });
    const html = await renderView(engine, view(SPLIT));
    const full = await renderView(plain, view(WHOLE));
    assert.ok(!html.includes('stencil-island'));
    assert.equal(shape(html), shape(full), 'the same page as the one rendered whole');
    // the island that is a direct child of isl-counter: each element has its marker's c-id, and the host's <!--o.--> comment for it is still there
    const rel = relocations(html);
    assert.equal(rel.nodes.length, 4, '3 elements of island a, and the isl-tag inside the isl-counter of island b');
    const inA = rel.nodes.filter(([tag, , id]) => tag === 'isl-tag' && id < 100);
    assert.equal(inA.length, 3);
    for (const [, , id] of inA) assert.ok(rel.origins.includes(id), `<!--o.0.${id}.--> in the shell`);
    assert.deepEqual(inA.map(([, sn]) => sn), [null, '', ''], 'in document order: the element that names its slot has no s-sn, the others have the default slot');
    assert.deepEqual(relocations(full).nodes.map(([t, sn]) => [t, sn]).sort(), rel.nodes.map(([t, sn]) => [t, sn]).sort(), 'the same relocated nodes as the full render');
    // where Stencil put the marker is where the element is: slot="s" first (hidden by Stencil in the full render), the others in the .box, in order
    assert.match(html, /<isl-counter [^>]*><!--r\.1-->(?:<!--o\.0\.\d+\.-->){2}<isl-tag data-island="a" data-client="visible" c-id="0\.\d+" slot="s"/);
    assert.ok(html.indexOf('>alpha<') < html.indexOf('>three<') && html.indexOf('>three<') < html.indexOf('data-island="b"'));
    // no id twice: host ids (islands from their own ranges) and the root-level ones
    const hostIds = [...html.matchAll(/\bs-id="(\d+)"/g)].map((m) => m[1]);
    assert.equal(new Set(hostIds).size, hostIds.length);
    assert.deepEqual(hostIds.filter((i) => Number(i) < 1000), ['1']);
    const rootIds = [...html.matchAll(/ c-id="0\.(\d+)"/g)].map((m) => m[1]);
    assert.equal(new Set(rootIds).size, rootIds.length, 'every relocated node has an id of its own');
    assert.equal(count(html, 'data-island="a"'), 3 + 0 + 0 + 0, 'island a: its three top-level elements');
  });

  test(`scoped islands (${name}): the component styles come back in result.styles and are written once, in the head, ahead of the island that needs them`, async () => {
    const engine = make({ ...options, islands: {} });
    const html = await renderView(engine, view(SPLIT));
    const full = await renderView(make({ ...options }), view(WHOLE));
    for (const id of ['sc-isl-tag', 'sc-isl-counter']) {
      assert.equal(count(html, `sty-id="${id}"`), count(full, `sty-id="${id}"`), id);
      assert.ok(html.indexOf(`sty-id="${id}"`) < html.indexOf('</head>'), `${id} in the head`);
    }
    assert.ok(count(html, 'sty-id="sc-isl-counter"') >= 1, 'scoped mode: the shadow component is styled from the head');
    assert.equal(html.match(/<style sty-id="[^"]+"/g).length, new Set(html.match(/<style sty-id="[^"]+"/g)).size, 'no style twice');
  });

  test(`scoped islands (${name}): a view without islands renders as it does without the option, byte for byte`, async () => {
    const views = [WHOLE, DOC(`<script>var s = '<stencil-island name="a">x</stencil-island>';</script>${ISLAND_B}<!-- <stencil-island name="b"> -->`), `${ISLAND_B}<p>fragment</p>`];
    const [plain, withIslands] = [make({ workers: 1 }), make({ workers: 1, islands: { earlyHead: true } })];
    for (const v of views) assert.equal(await renderView(withIslands, view(v)), await renderView(plain, view(v)), v.slice(0, 60));
    assert.equal(await withIslands.renderIslands(view(views[0])), null);
  });
}

test('scoped islands: the stride check, the early head, and streaming in order and out of order all go through the same pieces', async () => {
  const engine = make({ workers: 2, islands: {} });
  const early = make({ workers: 2, islands: { earlyHead: true } });
  const file = view(SPLIT);
  const whole = await renderView(engine, file);
  const strip = (h) => h.replace(/<style sty-id="[^"]+">[^]*?<\/style>/g, '');
  // in order: the page, the islands' styles in the body instead of the head
  const inOrder = (await collect(engine.stream(file))).join('');
  assert.equal(strip(inOrder), strip(whole));
  // early head: the head first, the shell's styles at the top of the body; the markup is the page's
  const chunks = await collect(early.stream(file));
  assert.match(chunks[0], /^<!doctype html><html lang="en" data-stencil-build="b" class="hydrated"><head>[^]*<body>$/);
  assert.equal(shape(chunks.join('')), shape(whole), 'the head is the view\'s own text, the rest the page');
  // out of order: every marker has an anchor, every element a container, and the elements are the page's (the swap moves each in front of its anchor)
  const ooo = (await collect(engine.stream(file, {}, { mode: 'out-of-order' }))).join('');
  assert.equal(count(ooo, '<template id="s-isl-'), 4, 'one anchor per marker: three elements in island a, one in b');
  assert.equal(count(ooo, '<div hidden id="s-isl-c-'), 4);
  const moved = ooo.replace(/<noscript id="s-isl-ns">[^]*?<\/noscript>/, '').replace(/<script>function \$ISL[^]*?<\/script>/, '');
  const swapped = new Map();
  const containers = [...moved.matchAll(/<div hidden id="s-isl-c-(\d+)">([^]*?)<\/div><script>\$ISL\(\d+\)<\/script>/g)];
  let page = moved.replace(/<div hidden id="s-isl-c-\d+">[^]*?<\/div><script>\$ISL\(\d+\)<\/script>/g, '');
  for (const [, k, body] of containers) swapped.set(Number(k), body);
  page = page.replace(/<template id="s-isl-(\d+)"><\/template>/g, (_m, k) => swapped.get(Number(k)));
  assert.equal(strip(page), strip(whole), 'the nodes in place, each where its marker was');
});

test('scoped islands: elements nothing relocated are one piece: a single anchor and container out of order, the same page in order', async () => {
  const engine = make({ islands: {} });
  const file = view(DOC('<div><stencil-island name="p"><isl-tag>1</isl-tag> <isl-tag>2</isl-tag> <isl-tag>3</isl-tag></stencil-island></div>'));
  const whole = await renderView(engine, file);
  assert.equal(count(whole, 'data-island="p"'), 3);
  const ooo = (await collect(engine.stream(file, {}, { mode: 'out-of-order' }))).join('');
  assert.equal(count(ooo, '<template id="s-isl-'), 1);
  assert.equal(count(ooo, '<div hidden id="s-isl-c-'), 1);
  assert.match(whole, /<div><isl-tag data-island="p"[^]*>1<[^]*>2<[^]*>3<[^]*<\/div>/);
});

test('scoped islands: a static island keeps the shell\'s relocation marks on its elements and drops its own annotations; the client boot is written', async () => {
  const files = new Map([['components.json', JSON.stringify({ version: 1, tags: { 'isl-counter': 'components/isl-counter.js', 'isl-tag': 'components/isl-tag.js' }, imports: {} })]]);
  const manifest = JSON.parse(files.get('components.json'));
  const engine = make({ islands: { client: { base: '/c/', manifest } } });
  const html = await renderView(engine, view(page((name, h) => `<stencil-island name="${name}" client="${name === 'a' ? 'static' : 'load'}">${h}</stencil-island>`)));
  const root = [...html.matchAll(/<isl-tag data-island="a" data-client="static"[^>]*>/g)].map((m) => m[0]);
  assert.equal(root.length, 3);
  for (const tag of root) {
    assert.match(tag, / c-id="0\.\d+"/, 'the shell\'s relocation id stays: the client reads it when it hydrates isl-counter');
    assert.doesNotMatch(tag, /s-id|s-mode/);
  }
  assert.equal(root.filter((t) => / s-sn=""/.test(t)).length, 2, 'the two elements in the default slot');
  assert.doesNotMatch(root.find((t) => / slot="s"/.test(t)), / s-sn/, 'a slot the element names itself needs no s-sn');
  for (const el of html.matchAll(/<isl-tag data-island="a"[^>]*>([^]*?)<\/isl-tag>/g)) assert.doesNotMatch(el[1], /s-id=|c-id=|<!--[rostc]\./, 'what is inside a static island is stripped');
  assert.match(html, /<!--o\.0\.\d+\.-->/, 'the shell\'s origin comments are not touched');
  assert.match(html, /<script type="application\/json" id="stencil-islands">[^]*"name":"a","client":"static","files":\[\]/);
});

test('scoped islands: an island rendered with the cache is the same page, and a hit skips the render', async () => {
  const seen = [];
  const hydrate = await import(built.hydrate);
  const spy = { renderToString: (html, o) => (seen.push(html), hydrate.renderToString(html, o)) };
  const engine = stencilEngine({ hydrate: spy, renderOptions: { buildId: 'b', serializeShadowRoot: 'scoped' }, islands: {} });
  engines.push(engine);
  const cached = view(page((name, html) => `<stencil-island name="${name}" cache>${html}</stencil-island>`));
  const first = await renderView(engine, cached);
  const second = await renderView(engine, cached);
  assert.equal(second, first);
  assert.equal(seen.filter((h) => h.includes('alpha')).length, 1, 'island a rendered once');
  assert.equal(engine.islandCache.stats().hits, 2);
  const uncached = stencilEngine({ hydrate: spy, renderOptions: { buildId: 'b', serializeShadowRoot: 'scoped' }, islands: { cache: false } });
  engines.push(uncached);
  assert.equal(await renderView(uncached, cached), first, 'the cache changes no byte');
});

test('scoped islands: what cannot be relocated is an error that names the island', async () => {
  const engine = make({ islands: {} });
  // text beside the elements of an island that is a direct child of a component with slots: nowhere to put it
  await assert.rejects(renderView(engine, view(DOC('<isl-counter><stencil-island name="t">words <isl-tag>x</isl-tag></stencil-island></isl-counter>'))), /island "t" sits directly inside a component with slots, so its top level can only hold elements/);
  // the same text in a plain element is fine
  assert.match(await renderView(engine, view(DOC('<isl-counter><div><stencil-island name="t">words <isl-tag>x</isl-tag></stencil-island></div></isl-counter>'))), /words <isl-tag data-island="t"/);
  // an island that renders to nothing, in a slot host, leaves the origin comment and nothing else
  assert.doesNotMatch(await renderView(engine, view(DOC('<isl-counter><stencil-island name="e">  </stencil-island></isl-counter>'))), /stencil-island/);
  // DSD: the placement rule is as it was
  const dsd = make({ islands: {}, renderOptions: { buildId: 'b' } });
  assert.match(await renderView(dsd, view(DOC('<isl-counter><stencil-island name="t"><isl-tag>x</isl-tag></stencil-island></isl-counter>'))), /<isl-tag data-island="t"/, 'a shadow host: nothing to relocate in DSD');
});

test('scoped islands: per-view and per-tag serialization choices reach the split', async () => {
  const engine = make({ islands: {}, renderOptions: { buildId: 'b' } });
  const file = view(SPLIT);
  const dsd = await renderView(engine, file);
  assert.ok(!/ c-id="0\./.test(dsd), 'declarative shadow DOM: no relocation marks');
  const scoped = await renderView(engine, file, { stencil: { serializeShadowRoot: 'scoped' } });
  assert.match(scoped, / c-id="0\.\d+"/);
  // `false`: no shadow serialization at all, and Stencil annotates nothing for relocation; the islands are in place all the same
  const off = await renderView(engine, file, { stencil: { serializeShadowRoot: false } });
  assert.equal(count(off, 'data-island="a"'), 3);
  assert.ok(off.indexOf('>alpha<') < off.indexOf('>two<') && off.indexOf('>two<') < off.indexOf('>three<') && off.indexOf('>three<') < off.indexOf('data-island="b"'));
});

// --- Chromium --------------------------------------------------------------------------------------------------------

const clientJs = readFileSync(`${built.client}/components.js`, 'utf8');

function mark(doc) {
  const nodes = [];
  const visit = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.localName === 'script' || el.localName === 'style') continue;
      nodes.push(el);
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(doc.body);
  doc.defaultView.__server = nodes;
}
function report(doc) {
  const sig = (node) => {
    if (node.nodeType === 3) return node.nodeValue.trim() ? JSON.stringify(node.nodeValue.trim()) : '';
    if (node.nodeType !== 1 || node.localName === 'style' || node.localName === 'script') return '';
    const attrs = [...node.attributes].filter((a) => !['s-id', 'c-id', 's-sn', 'data-island', 'data-client', 'hidden'].includes(a.name)).map((a) => `${a.name}=${a.value.split(/\s+/).sort().join('.')}`).sort().join(' ');
    return `<${node.localName} ${attrs}${node.shadowRoot ? ' #shadow' : ''}>${[...(node.shadowRoot?.childNodes ?? []), ...node.childNodes].map(sig).join('')}</>`;
  };
  const ids = [...doc.querySelectorAll('[id]')].map((e) => e.id);
  return {
    sig: sig(doc.body),
    lost: doc.defaultView.__server.filter((n) => !n.isConnected).length,
    notHydrated: [...doc.querySelectorAll('isl-counter, isl-tag')].filter((h) => !h.classList.contains('hydrated')).length,
    leftover: doc.querySelectorAll('[s-id],[c-id]').length,
    duplicateIds: ids.length - new Set(ids).size,
    buttons: [...doc.querySelectorAll('isl-counter')].map((c) => c.shadowRoot.querySelector('button').textContent.trim()),
    tags: [...doc.querySelectorAll('isl-tag')].map((t) => t.textContent.trim()),
  };
}

const hydrate = async (browser, html) => {
  const ctx = await browser.newContext();
  const tab = await ctx.newPage();
  const errors = [];
  tab.on('pageerror', (e) => errors.push(e.message));
  await tab.route('http://isl.test/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(path === '/' ? { contentType: 'text/html', body: html } : { contentType: 'text/javascript', body: path === '/components.js' ? clientJs : '' });
  });
  await tab.goto('http://isl.test/');
  await tab.evaluate(`(${mark})(document)`);
  await tab.addScriptTag({ type: 'module', content: "import '/components.js';" });
  await tab.waitForFunction(() => customElements.get('isl-counter') && customElements.get('isl-tag'), null, { timeout: 30_000 });
  await tab.waitForFunction(() => [...document.querySelectorAll('isl-counter')].every((c) => c.shadowRoot?.querySelector('button')), null, { timeout: 30_000 });
  await tab.waitForTimeout(300);
  const state = await tab.evaluate(`(${report})(document)`);
  // a click, then wait for the re-render rather than reading at once
  await tab.evaluate(() => document.querySelectorAll('isl-counter').forEach((c) => c.shadowRoot.querySelector('button').click()));
  await tab.waitForFunction(() => [...document.querySelectorAll('isl-counter')].every((c) => /: (2|6)$/.test(c.shadowRoot.querySelector('button').textContent.trim())), null, { timeout: 10_000 }).catch(() => {});
  const clicked = await tab.evaluate(() => [...document.querySelectorAll('isl-counter')].map((c) => c.shadowRoot.querySelector('button').textContent.trim()));
  await ctx.close();
  return { state, clicked, errors };
};

test('scoped islands hydrate in Chromium to the full scoped render\'s DOM, relocated nodes included, and the click reaches the component', { skip }, async () => {
  const engine = make({ workers: 2, islands: {} });
  const early = make({ workers: 2, islands: { earlyHead: true } });
  const plain = make({ workers: 2 });
  const file = view(SPLIT);
  const pages = {
    full: await renderView(plain, view(WHOLE)),
    islands: await renderView(engine, file),
    'stream in order': (await collect(engine.stream(file))).join(''),
    'stream early': (await collect(early.stream(file))).join(''),
    'stream out of order': (await collect(engine.stream(file, {}, { mode: 'out-of-order' }))).join(''),
  };
  const browser = await chromium.launch();
  try {
    const got = {};
    for (const [label, html] of Object.entries(pages)) got[label] = await hydrate(browser, html);
    for (const [label, r] of Object.entries(got)) {
      assert.deepEqual(r.errors, [], label);
      assert.equal(r.state.lost, 0, `${label}: every server node was adopted`);
      assert.equal(r.state.notHydrated, 0, label);
      assert.equal(r.state.leftover, 0, `${label}: annotations consumed`);
      assert.equal(r.state.duplicateIds, 0, label);
      assert.deepEqual(r.state.tags.sort(), ['alpha', 'beta', 'three', 'two'], `${label}: no relocated node lost`);
      assert.deepEqual(r.clicked, ['S: 2', 'B: 6'], `${label}: the click works`);
      assert.equal(r.state.sig, got.full.state.sig, `${label}: the DOM of the full scoped render`);
    }
  } finally {
    await browser.close();
  }
});
