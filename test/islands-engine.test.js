// stencilEngine's `islands` option (#191): the view scan, the shell/islands split, rendering in parallel with distinct idBase, the
// placement and stride checks, the early head, the per-page style dedupe, and a view without islands that renders as before.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { stencilEngine } from '../express.js';
import { highestId, scanIslands, splitIslands, tagRoots } from '../express-islands.js';
import { ISLAND_A, ISLAND_B } from './fixtures/islands/build.mjs';
import { buildFixture } from './fixtures/islands/setup.mjs';

const built = await buildFixture();
const dir = mkdtempSync(join(tmpdir(), 'stencilrs-islands-views-'));
const engines = [];
const make = (options) => engines.push(stencilEngine({ hydrate: built.hydrate, renderOptions: { buildId: 'b' }, ...options })) && engines.at(-1);
after(() => Promise.all(engines.map((e) => e.close())));

let n = 0;
const view = (html) => {
  const file = join(dir, `v${n++}.html`);
  writeFileSync(file, html);
  return file;
};
const renderView = (engine, file, locals = {}) => new Promise((ok, no) => engine(file, locals, (err, html) => (err ? no(err) : ok(html))));
const ids = (html) => [...html.matchAll(/\bs-id="(\d+)"/g)].map((m) => Number(m[1]));
const count = (html, text) => html.split(text).length - 1;

const DOC = (body, { htmlTag = '<html lang="en">', head = '<meta charset="utf-8"><title>t</title>' } = {}) => `<!doctype html>\n${htmlTag}<head>${head}</head>\n<body class="x">${body}</body></html>`;
const PAGE = DOC(`<h1>Islands</h1>
<section id="a"><stencil-island name="a" client="visible">${ISLAND_A}</stencil-island></section>
<section id="b"><stencil-island name="b" cache="60">${ISLAND_B}</stencil-island></section>
<footer>end</footer>`);

test('scanIslands: finds the markers, with their attributes, and skips script, style, comments and text elements', () => {
  const html = `<p>x</p><stencil-island name="a" client="idle" cache>A</stencil-island>
<script>var s = '<stencil-island name="no">';</script><style>/* <stencil-island name="no"> */</style><!-- <stencil-island name="no"> -->
<textarea><stencil-island name="no"></textarea><title><stencil-island name="no"></title>
<div title="a > b <stencil-island name='no'>"><stencil-island name='b' cache=30></stencil-island></div>`;
  const found = scanIslands(html);
  assert.deepEqual(found.map((f) => [f.name, f.client, f.cache, html.slice(f.bodyStart, f.bodyEnd)]), [['a', 'idle', true, 'A'], ['b', 'load', 30, '']]);
  assert.equal(splitIslands('<p>none</p><script>"<stencil-island name=a>"</script>'), null);
});

test('scanIslands: nesting, missing or repeated names, unknown attributes, bad values and unclosed markers are errors naming the island', () => {
  const bad = (html, re) => assert.throws(() => scanIslands(html), (e) => e.code === 'ESTENCIL_ISLAND' && re.test(e.message), html);
  bad('<stencil-island name="a"><div><stencil-island name="b">x</stencil-island></div></stencil-island>', /island "b" at line 1 is inside island "a": islands cannot nest/);
  bad('<stencil-island>x</stencil-island>', /needs a name/);
  bad('<stencil-island name="a">x</stencil-island>\n<stencil-island name="a">y</stencil-island>', /"a" at line 2 is defined twice/);
  bad('<stencil-island name="a" class="c">x</stencil-island>', /"a": unknown attribute `class`/);
  bad('<stencil-island name="a" client="now">x</stencil-island>', /client="now" is not one of load, idle, visible, static, none/);
  bad('<stencil-island name="a" cache="soon">x</stencil-island>', /cache="soon" must be empty or a number/);
  bad('<stencil-island name="a">x', /"a" at line 1 is not closed/);
  bad('<stencil-island name="a"/>', /self-closing/);
  bad('x</stencil-island>', /closes nothing/);
});

test('splitIslands: the shell keeps a marker where each island was', () => {
  const split = splitIslands('<main><stencil-island name="a">  <b>1</b> </stencil-island><i/><stencil-island name="b"><u>2</u></stencil-island></main>');
  assert.equal(split.shell, '<main><stencil-island data-island-slot="0"></stencil-island><i/><stencil-island data-island-slot="1"></stencil-island></main>');
  assert.deepEqual(split.islands.map((i) => [i.name, i.html]), [['a', '  <b>1</b> '], ['b', '<u>2</u>']]);
});

test('tagRoots: every top-level element, not the nested ones, comments or the content of script', () => {
  const r = tagRoots('<!-- <x> --><a b="1>2"><i>x</i></a> text <br><script>"<q>"</script><svg><path d="m"/></svg><c-d/>', ' data-island="n"');
  assert.equal(r.roots, 5);
  assert.equal(r.html, '<!-- <x> --><a data-island="n" b="1>2"><i>x</i></a> text <br data-island="n"><script data-island="n">"<q>"</script><svg data-island="n"><path d="m"/></svg><c-d data-island="n"/>');
  assert.equal(tagRoots('just text', ' x').roots, 0);
});

test('highestId reads host ids and root-level ids', () => {
  assert.equal(highestId('<a s-id="12" c-id="12.99.0.0"><!--o.0.40.c--><b c-id="0.51" s-sn=""><!--t.0.7-->'), 51);
  assert.equal(highestId('<p>none</p>'), 0);
});

for (const [name, options] of [['in-process', {}], ['workers: 2', { workers: 2 }]]) {
  test(`islands (${name}): the page is assembled from the shell and the islands, ids apart, roots tagged, each style once in the head`, async () => {
    const engine = make({ ...options, islands: {} });
    await engine.ready;
    const html = await renderView(engine, view(PAGE));
    assert.ok(!html.includes('stencil-island'), 'the marker leaves no trace');
    assert.deepEqual(ids(html), [1001, 1002, 1003, 2001, 2002]);
    assert.match(html, /<isl-counter data-island="a" data-client="visible" label="A"/);
    assert.match(html, /<isl-counter data-island="b" data-client="load" label="B"/); // `client` defaults to load
    assert.equal(count(html, 'data-island='), 2);
    // the scoped component's style is used by both islands and not by the shell: written once, in the head, where Stencil puts it
    assert.equal(count(html, 'sty-id="sc-isl-tag"'), 1);
    assert.ok(html.indexOf('sty-id="sc-isl-tag"') < html.indexOf('</head>'));
    // the shadow roots carry their own style tag: not touched
    assert.equal(count(html, 'sty-id="sc-isl-counter"'), 2);
    assert.match(html, /<section id="a"><isl-counter[^]*<\/isl-counter><\/section> <section id="b">/);
  });

  test(`islands (${name}): a view without islands renders as it does without the option, byte for byte`, async () => {
    const views = [
      DOC(`<h1>none</h1>${ISLAND_A}`),
      DOC(`<script>var s = '<stencil-island name="a">x</stencil-island>';</script>${ISLAND_B}<!-- <stencil-island name="b"> -->`),
      `${ISLAND_A}<p>fragment</p>`,
    ];
    // one thread each, so both start counting host ids from the same place
    const [plain, withIslands] = [make({ workers: 1 }), make({ workers: 1, islands: { earlyHead: true } })];
    for (const v of views) assert.equal(await renderView(withIslands, view(v)), await renderView(plain, view(v)), v.slice(0, 60));
    // and the options reach renderToString untouched: no idBase, no fullDocument other than inferred
    const seen = [];
    const spy = { renderToString: async (html, o) => (seen.push(o), { html: '<x></x>', diagnostics: [] }) };
    const quiet = stencilEngine({ hydrate: spy, islands: { earlyHead: true }, renderOptions: { buildId: 'q' } });
    await renderView(quiet, view(views[0]));
    await renderView(quiet, view(views[2]));
    await quiet.ready;
    const views2 = seen.filter((o) => o.idBase === undefined); // (the early head's startup probe is the one render with an idBase)
    assert.deepEqual(views2, [{ buildId: 'q', fullDocument: true }, { buildId: 'q', fullDocument: false }]);
  });

  test(`islands (${name}): earlyHead writes the view's head first, the shell's styles at the top of the body, island styles where they are first used`, async () => {
    const engine = make({ ...options, islands: { earlyHead: true } });
    await engine.ready;
    const file = view(DOC(`<isl-tag>shell</isl-tag>\n<stencil-island name="a">${ISLAND_A}</stencil-island><stencil-island name="b">${ISLAND_B}</stencil-island>`, { htmlTag: '<html lang="en" class="app">' }));
    const page = await engine.renderIslands(file);
    assert.equal(page.early, true);
    const chunks = [];
    for await (const c of page.chunks()) chunks.push(c);
    assert.equal(chunks.length, 4, 'head, shell up to the first island, then one per island');
    assert.equal(chunks[0], '<!doctype html><html lang="en" class="app hydrated" data-stencil-build="b"><head><meta charset="utf-8"><title>t</title></head>\n<body class="x">');
    assert.match(chunks[1], /^<style sty-id="sc-isl-tag">[^]*<\/style><isl-tag[^]*shell/);
    assert.ok(!chunks.slice(2).join('').includes('sty-id="sc-isl-tag"'), 'the shell used it: not written again for the islands');
    assert.equal(await page.html(), chunks.join(''));
    // the head the probe gave is the one the same document renders with
    const whole = make({ ...options });
    const full = await renderView(whole, view(DOC('', { htmlTag: '<html lang="en" class="app">' })));
    assert.equal(chunks[0].slice(0, chunks[0].indexOf('<head>')), full.slice(0, full.indexOf('<head>')));
    assert.deepEqual((await page.manifest()).map((m) => [m.name, m.client, m.cache, m.components.map((c) => c.tag).sort()]), [['a', 'load', null, ['isl-counter', 'isl-tag']], ['b', 'load', null, ['isl-counter', 'isl-tag']]]);
  });

  test(`islands (${name}): the probe follows the language and the build id`, async () => {
    const engine = make({ ...options, islands: { earlyHead: true } });
    const head = async (htmlTag, locals) => {
      const page = await engine.renderIslands(view(DOC(`<stencil-island name="a">${ISLAND_B}</stencil-island>`, { htmlTag })), locals);
      return (await page.chunks().next()).value;
    };
    assert.match(await head('<html lang="en">'), /^<!doctype html><html lang="en" data-stencil-build="b" class="hydrated">/);
    assert.match(await head('<html lang="fr">'), /<html lang="fr" /);
    assert.match(await head('<html lang="en">', { stencil: { buildId: 'next' } }), /data-stencil-build="next"/);
    assert.match(await head('<html lang="en">'), /data-stencil-build="b"/, 'the first probe is kept, the new build did not replace it');
  });
}

test('the probe runs once per html tag and options, and at startup for the warm-up documents', async () => {
  const hydrate = await import(built.hydrate);
  const rendered = [];
  const spy = { renderToString: (html, o) => (rendered.push(html), hydrate.renderToString(html, o)) };
  const file = view(DOC(`<stencil-island name="a">${ISLAND_B}</stencil-island>`, { htmlTag: '<html lang="de">' }));
  const engine = stencilEngine({ hydrate: spy, islands: { earlyHead: true }, warmup: [file], renderOptions: { buildId: 'b' } });
  await engine.ready;
  const probes = () => rendered.filter((h) => h.endsWith('<head></head><body></body></html>'));
  assert.deepEqual(probes(), ['<html lang="de"><head></head><body></body></html>'], 'probed during ready, with the warm-up document\'s own tag');
  await renderView(engine, file);
  await renderView(engine, file);
  assert.equal(probes().length, 1);
});

test('a marker directly inside a non-shadow component with slots is an error naming the island', async () => {
  for (const engine of [make({ islands: {} }), make({ islands: {}, workers: 1 })]) {
    const file = view(DOC(`<isl-tag><stencil-island name="inner">${ISLAND_B}</stencil-island></isl-tag>`));
    await assert.rejects(renderView(engine, file), (e) => e.code === 'ESTENCIL_ISLAND' && e.message.includes(file) && /island "inner" sits directly inside a component that is not a shadow host/.test(e.message));
    // in a plain element inside it, or in a shadow host, it is fine
    assert.match(await renderView(engine, view(DOC(`<isl-tag><div><stencil-island name="ok">${ISLAND_B}</stencil-island></div></isl-tag><isl-counter><stencil-island name="s"><isl-tag>x</isl-tag></stencil-island></isl-counter>`))), /data-island="ok"/);
  }
});

test('an island that needs more ids than the stride is an error naming it', async () => {
  const engine = make({ islands: { idStride: 2 } });
  await assert.rejects(renderView(engine, view(PAGE)), (e) => e.code === 'ESTENCIL_ISLAND' && /island "a" used more hydration ids than its idStride of 2 \(3 components\)/.test(e.message));
  const exact = make({ islands: { idStride: 3 } });
  assert.deepEqual(ids(await renderView(exact, view(PAGE))), [4, 5, 6, 7, 8], 'three ids fit a stride of three');
});

test('errors of the view are IslandErrors with the view in the message; a render that fails fails the page and leaves nothing unhandled', async () => {
  const engine = make({ islands: {} });
  const nested = view('<stencil-island name="a"><stencil-island name="b">x</stencil-island></stencil-island>');
  await assert.rejects(renderView(engine, nested), (e) => e.code === 'ESTENCIL_ISLAND' && e.message.startsWith(nested));
  const unhandled = [];
  const onUnhandled = (e) => unhandled.push(e);
  process.on('unhandledRejection', onUnhandled);
  const hydrate = await import(built.hydrate);
  const failing = stencilEngine({
    hydrate: { renderToString: async (html, o) => (html.includes('BOOM') ? Promise.reject(new Error('boom')) : hydrate.renderToString(html, o)) },
    islands: {},
  });
  await assert.rejects(renderView(failing, view(DOC(`<stencil-island name="a">${ISLAND_A}</stencil-island><stencil-island name="b">BOOM</stencil-island><stencil-island name="c">BOOM</stencil-island>`))), /boom/);
  const error = stencilEngine({ hydrate: { renderToString: async (html) => ({ html, diagnostics: html.includes('BAD') ? [{ level: 'error', messageText: 'no good' }] : [] }) }, islands: {} });
  await assert.rejects(renderView(error, view(DOC('<stencil-island name="a"><x-y>BAD</x-y></stencil-island>'))), /Stencil render of .* \(island "a"\) failed: no good/);
  await new Promise((r) => setTimeout(r, 50));
  process.off('unhandledRejection', onUnhandled);
  assert.deepEqual(unhandled, []);
});

test('islands need DSD: scoped rendering is refused, at construction and per view', async () => {
  assert.throws(() => stencilEngine({ hydrate: built.hydrate, islands: {}, renderOptions: { serializeShadowRoot: 'scoped' } }), /islands are not supported with scoped rendering/);
  assert.throws(() => stencilEngine({ hydrate: built.hydrate, islands: {}, renderOptions: { serializeShadowRoot: false } }), /scoped/);
  const engine = make({ islands: {} });
  await assert.rejects(renderView(engine, view(PAGE), { stencil: { serializeShadowRoot: 'scoped' } }), /not scoped mode/);
  // without islands in the view, scoped rendering is as ever
  assert.match(await renderView(engine, view(DOC(ISLAND_B)), { stencil: { serializeShadowRoot: 'scoped' } }), /<isl-counter/);
  assert.equal(await engine.renderIslands(view(DOC(ISLAND_B))), null);
});

test('islands: option validation, and the option off leaves the marker as it was', async () => {
  for (const bad of [{ idStride: 0 }, { idStride: 1.5 }, { earlyHead: 'yes' }, { stride: 5 }, 'on']) assert.throws(() => stencilEngine({ hydrate: built.hydrate, islands: bad }), TypeError, JSON.stringify(bad));
  const off = make({});
  assert.equal(await off.renderIslands?.(view(PAGE)), null);
  assert.match(await renderView(off, view(PAGE)), /<stencil-island name="a" client="visible">/);
});

test('an empty island renders nothing and a text-only island is an error', async () => {
  const engine = make({ islands: {} });
  const html = await renderView(engine, view(DOC(`<main>[<stencil-island name="e">  </stencil-island>]</main>${ISLAND_B}`)));
  assert.match(html, /<main>\[\]<\/main>/);
  await assert.rejects(renderView(engine, view(DOC('<stencil-island name="t">just text</stencil-island>'))), /island "t" has no element at its top level/);
});
