// The per-island render cache (#193): an island marked `cache` is rendered once per (its html, render options, idBase of its slot)
// and served from memory after; the shell and unmarked islands always render.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { stencilEngine } from '../express.js';
import { ISLAND_A, ISLAND_B } from './fixtures/islands/build.mjs';
import { buildFixture } from './fixtures/islands/setup.mjs';

const built = await buildFixture();
const hydrate = await import(built.hydrate);
const dir = mkdtempSync(join(tmpdir(), 'stencilrs-islands-cache-'));
const engines = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const view = (html) => {
  const file = join(dir, `v${n++}.html`);
  writeFileSync(file, html);
  return file;
};
const renderView = (engine, file, locals = {}) => new Promise((ok, no) => engine(file, locals, (err, html) => (err ? no(err) : ok(html))));
const ids = (html) => [...html.matchAll(/\bs-id="(\d+)"/g)].map((m) => Number(m[1]));
const DOC = (body) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>t</title></head>\n<body>${body}</body></html>`;
// the shell has a part that changes per request (a local), the islands do not
const page = (a, b) => DOC(`<header>{{who}}</header><stencil-island name="a" ${a}>${ISLAND_A}</stencil-island><main>${'x'}</main><stencil-island name="b" ${b}>${ISLAND_B}</stencil-island>`);
const fill = (path, locals, cb) => import('node:fs').then(({ readFileSync }) => cb(null, readFileSync(path, 'utf8').replace('{{who}}', locals.who ?? '')));

// An engine whose hydrate app counts the renders of each markup (in-process: the counter is visible).
const counting = (options) => {
  const seen = [];
  const spy = { renderToString: (html, o) => (seen.push({ html, idBase: o.idBase }), hydrate.renderToString(html, o)) };
  const engine = stencilEngine({ hydrate: spy, engine: fill, renderOptions: { buildId: 'b' }, ...options });
  engines.push(engine);
  return { engine, seen, of: (text) => seen.filter((s) => s.html.includes(text)).length };
};
after(() => Promise.all(engines.map((e) => e.close())));

test('a cached island renders once: the second page is the same bytes and the same ids, the shell still renders', async () => {
  const { engine, of } = counting({ islands: {} });
  const file = view(page('cache', ''));
  const first = await renderView(engine, file, { who: 'ann' });
  const second = await renderView(engine, file, { who: 'bob' });
  assert.equal(of('label="A"'), 1, 'island a: one render');
  assert.equal(of('label="B"'), 2, 'island b is not marked: renders each time');
  assert.equal(of('<header>'), 2, 'the shell renders each time');
  assert.deepEqual(ids(first), ids(second));
  assert.equal(first.replace('ann', 'bob'), second);
  assert.deepEqual(engine.islandCache.stats().hits, 1);
  // and the bytes equal those of an engine with no cache at all
  const plain = counting({ islands: { cache: false } });
  assert.equal(await renderView(plain.engine, file, { who: 'bob' }), second);
  assert.equal(plain.engine.islandCache, null);
});

test('a hit keeps the idBase of its slot: the same markup in another slot is its own entry with its own ids', async () => {
  const { engine, of } = counting({ islands: {} });
  const both = view(DOC(`<stencil-island name="a" cache>${ISLAND_A}</stencil-island><stencil-island name="b" cache>${ISLAND_A}</stencil-island>`));
  const html = await renderView(engine, both);
  assert.deepEqual(ids(html), [1001, 1002, 1003, 2001, 2002, 2003]);
  assert.equal(of('label="A"'), 2, 'slots 0 and 1 have different idBase: two entries');
  const again = await renderView(engine, both);
  assert.equal(again, html);
  assert.equal(of('label="A"'), 2);
  // a different idStride is a different range, so a different key
  assert.equal(engine.islandCache.stats().entries, 2);
});

test('ttl: a bare `cache` uses islands.cache.ttl, `cache="1"` is a second; an entry past it renders again', async () => {
  const { engine, of } = counting({ islands: { cache: { ttl: 60 } } });
  const file = view(page('cache', 'cache="1"'));
  await renderView(engine, file);
  await renderView(engine, file);
  assert.deepEqual([of('label="A"'), of('label="B"')], [1, 1]);
  await sleep(100);
  await renderView(engine, file);
  assert.deepEqual([of('label="A"'), of('label="B"')], [2, 1], 'a (60 ms) expired, b (1 s) did not');
  await sleep(1000);
  await renderView(engine, file);
  assert.equal(of('label="B"'), 2);
});

test('uncached islands always render: no attribute, cache="0", islands.cache: false, and the stencilCache: false local', async () => {
  const { engine, of } = counting({ islands: {} });
  const file = view(page('', 'cache="0"'));
  for (let i = 0; i < 3; i++) await renderView(engine, file);
  assert.deepEqual([of('label="A"'), of('label="B"')], [3, 3]);
  assert.deepEqual(engine.islandCache.stats(), { hits: 0, misses: 0, evictions: 0, bypassed: 0, entries: 0, bytes: 0 });
  const marked = view(page('cache', 'cache'));
  const off = counting({ islands: { cache: false } });
  for (let i = 0; i < 2; i++) await renderView(off.engine, marked);
  assert.equal(off.of('label="A"'), 2);
  const local = counting({ islands: {} });
  await renderView(local.engine, marked, { stencilCache: false });
  await renderView(local.engine, marked, { stencilCache: false });
  assert.equal(local.of('label="A"'), 2);
  await renderView(local.engine, marked);
  await renderView(local.engine, marked);
  assert.equal(local.of('label="A"'), 3);
});

test('different options are different entries; a failed render is not cached', async () => {
  const { engine, of } = counting({ islands: {} });
  const file = view(page('cache', ''));
  await renderView(engine, file, { stencil: { lang: 'en' } });
  await renderView(engine, file, { stencil: { lang: 'fr' } });
  assert.equal(of('label="A"'), 2);
  let calls = 0;
  const flaky = stencilEngine({ hydrate: { renderToString: async (html) => (html.includes('<p>x</p>') && ++calls === 1 ? { html, diagnostics: [{ level: 'error', messageText: 'no' }] } : { html, diagnostics: [] }) }, islands: {} });
  const bad = view(DOC('<stencil-island name="a" cache><p>x</p></stencil-island>'));
  await assert.rejects(renderView(flaky, bad), /failed: no/);
  assert.match(await renderView(flaky, bad), /<p data-island="a" data-client="load">x<\/p>/);
  assert.equal(calls, 2, 'the failed render was not stored');
});

test('page.manifest() and chunks() get the cache too', async () => {
  const { engine, of } = counting({ islands: {} });
  const file = view(page('cache', 'cache'));
  const one = await engine.renderIslands(file);
  const chunks = [];
  for await (const c of one.chunks()) chunks.push(c);
  const two = await engine.renderIslands(file);
  const three = await engine.renderIslands(file);
  assert.equal(await two.html(), await three.html());
  assert.equal(chunks.join('').replace(/<style[^]*?<\/style>/g, ''), (await two.html()).replace(/<style[^]*?<\/style>/g, ''));
  assert.deepEqual((await two.manifest()).map((m) => [m.name, m.cache, m.components.length > 0]), [['a', true, true], ['b', true, true]]);
  assert.deepEqual([of('label="A"'), of('label="B"')], [1, 1]);
});

test('workers: 2: hits skip the pool, ids and bytes are the same, and match a render with the cache off', async () => {
  const cachedEngine = stencilEngine({ hydrate: built.hydrate, renderOptions: { buildId: 'b' }, workers: 2, islands: {} });
  const off = stencilEngine({ hydrate: built.hydrate, renderOptions: { buildId: 'b' }, workers: 2, islands: { cache: false } });
  engines.push(cachedEngine, off);
  await Promise.all([cachedEngine.ready, off.ready]);
  const file = view(page('cache', 'cache="60"'));
  const first = await renderView(cachedEngine, file);
  const reference = await renderView(off, file);
  const results = await Promise.all(Array.from({ length: 6 }, () => renderView(cachedEngine, file)));
  for (const r of [first, ...results]) {
    assert.equal(r, reference);
    assert.deepEqual(ids(r), [1001, 1002, 1003, 2001, 2002]);
  }
  const s = cachedEngine.islandCache.stats();
  assert.equal(s.misses, 2, 'one render per island, concurrent identical requests share it');
});

test('islands.cache is validated', () => {
  assert.throws(() => stencilEngine({ hydrate: built.hydrate, islands: { cache: 5 } }), /islands.cache/);
  assert.throws(() => stencilEngine({ hydrate: built.hydrate, islands: { cache: { max: -1 } } }), /renderCache: `max`/);
  assert.throws(() => stencilEngine({ hydrate: built.hydrate, islands: { nope: 1 } }), /idStride, earlyHead, cache/);
});
