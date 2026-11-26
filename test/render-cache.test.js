import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { stencilEngine } from '../express.js';
import { createRenderCache } from '../ssr.js';

const fixture = fileURLToPath(new URL('./render-cache-hydrate.mjs', import.meta.url));

// A renderer that stamps each real render, and records them.
const counting = () => {
  const calls = [];
  const fn = async (html, options = {}) => {
    calls.push(html);
    if (html.includes('x-throw')) throw new Error('boom');
    const diagnostics = html.includes('x-fail') ? [{ level: 'error', messageText: 'bad' }] : [];
    return { html: `<!--${calls.length}-->${html}`, diagnostics };
  };
  fn.calls = calls;
  return fn;
};

describe('createRenderCache', () => {
  test('a hit returns identical bytes without rendering', async () => {
    const r = counting();
    const cache = createRenderCache(r);
    const a = await cache('<p>a</p>', { fullDocument: false });
    const b = await cache('<p>a</p>', { fullDocument: false });
    assert.equal(a.html, b.html);
    assert.equal(r.calls.length, 1);
    assert.deepEqual({ hits: cache.stats().hits, misses: cache.stats().misses }, { hits: 1, misses: 1 });
  });

  test('the key changes with the template and with any option; key order does not matter', async () => {
    const r = counting();
    const cache = createRenderCache(r);
    await cache('<p>a</p>', { a: 1, b: { c: 1, d: 2 } });
    await cache('<p>a</p>', { b: { d: 2, c: 1 }, a: 1 }); // same
    assert.equal(r.calls.length, 1);
    await cache('<p>b</p>', { a: 1, b: { c: 1, d: 2 } });
    await cache('<p>a</p>', { a: 2, b: { c: 1, d: 2 } });
    await cache('<p>a</p>', { a: 1, b: { c: 1, d: 3 } });
    await cache('<p>a</p>', { a: 1, b: { c: 1, d: 2 }, e: undefined, f: false });
    await cache('<p>a</p>');
    assert.equal(r.calls.length, 6);
  });

  test('evicts the least recently used by entries', async () => {
    const r = counting();
    const cache = createRenderCache(r, { max: 2 });
    await cache('1');
    await cache('2');
    await cache('1'); // 1 is now the most recent
    await cache('3'); // evicts 2
    assert.equal(r.calls.length, 3);
    await cache('1');
    assert.equal(r.calls.length, 3);
    await cache('2');
    assert.equal(r.calls.length, 4);
    assert.equal(cache.stats().entries, 2);
    assert.ok(cache.stats().evictions >= 2);
  });

  test('evicts by total bytes, and does not store a page larger than the budget', async () => {
    const r = counting();
    const cache = createRenderCache(r, { maxBytes: 100 });
    await cache('a'.repeat(40)); // ~47 bytes with the stamp
    await cache('b'.repeat(40));
    await cache('c'.repeat(40)); // over 100: the first goes
    assert.ok(cache.stats().bytes <= 100, String(cache.stats().bytes));
    assert.equal(cache.stats().entries, 2);
    await cache('a'.repeat(40));
    assert.equal(r.calls.length, 4);
    await cache('x'.repeat(500));
    await cache('x'.repeat(500));
    assert.equal(r.calls.length, 6); // too big: never cached
    assert.equal(cache.stats().entries, 2);
  });

  test('ttl expires entries', async () => {
    const r = counting();
    const cache = createRenderCache(r, { ttl: 30 });
    await cache('t');
    await cache('t');
    assert.equal(r.calls.length, 1);
    await new Promise((ok) => setTimeout(ok, 50));
    await cache('t');
    assert.equal(r.calls.length, 2);
  });

  test('errors are never cached: a thrown error, an error diagnostic', async () => {
    const r = counting();
    const cache = createRenderCache(r);
    await assert.rejects(cache('<x-throw>'), /boom/);
    await assert.rejects(cache('<x-throw>'), /boom/);
    assert.equal(r.calls.length, 2);
    await cache('<x-fail>');
    const again = await cache('<x-fail>');
    assert.equal(r.calls.length, 4);
    assert.equal(again.diagnostics[0].level, 'error');
    assert.equal(cache.stats().entries, 0);
  });

  test('concurrent identical misses share one render', async () => {
    const r = counting();
    const cache = createRenderCache(r);
    const all = await Promise.all([cache('s'), cache('s'), cache('s')]);
    assert.equal(r.calls.length, 1);
    assert.equal(new Set(all.map((x) => x.html)).size, 1);
  });

  test('{ cache: false } and options that cannot be keyed skip the cache', async () => {
    const r = counting();
    const cache = createRenderCache(r);
    await cache('o');
    await cache('o', undefined, { cache: false });
    await cache('f', { hook() {} });
    await cache('f', { hook() {} });
    assert.equal(r.calls.length, 4);
  });

  test('a caller mutating a result does not change the next hit; clear() empties', async () => {
    const cache = createRenderCache(async () => ({ html: 'h', diagnostics: [{ level: 'warn', messageText: 'w' }] }));
    (await cache('m')).diagnostics[0].messageText = 'changed';
    assert.equal((await cache('m')).diagnostics[0].messageText, 'w');
    cache.clear();
    assert.equal(cache.stats().entries, 0);
  });

  test('bad config throws', () => {
    assert.throws(() => createRenderCache(counting(), { max: -1 }), /max/);
    assert.throws(() => createRenderCache(null), /function/);
  });
});

describe('stencilEngine renderCache', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-rc-'));
  const view = join(dir, 'v.html');
  writeFileSync(view, '<p>view</p>');
  const warnView = join(dir, 'w.html');
  writeFileSync(warnView, '<x-warn></x-warn>');
  const failView = join(dir, 'f.html');
  writeFileSync(failView, '<x-fail></x-fail>');
  const engines = [];
  const make = (config) => {
    const e = stencilEngine({ hydrate: fixture, ...config });
    engines.push(e);
    return e;
  };
  after(() => Promise.all(engines.map((e) => e.close())));
  const run = (engine, path, locals = {}) => new Promise((ok) => engine(path, locals, (err, html) => ok({ err, html })));

  for (const workers of [0, 2]) {
    test(`workers: ${workers}: identical bytes on a hit; stencil options and the opt-out miss`, async () => {
      const e = make({ workers, renderCache: true });
      const a = await run(e, view);
      const b = await run(e, view);
      assert.ifError(a.err);
      assert.equal(a.html, b.html);
      const c = await run(e, view, { stencil: { prettyHtml: true } });
      assert.notEqual(c.html, a.html);
      const d = await run(e, view, { stencilCache: false });
      assert.notEqual(d.html, a.html); // a fresh render, stamped anew
      const e2 = await run(e, view);
      assert.equal(e2.html, a.html); // the opt-out did not evict or replace it
      const s = e.renderCache.stats();
      assert.equal(s.hits, 2);
      assert.equal(s.misses, 2);
    });

    test(`workers: ${workers}: error diagnostics are never cached; warnings are`, async () => {
      const e = make({ workers, renderCache: true, onDiagnostic: () => {} });
      assert.match((await run(e, failView)).err.message, /bad/);
      assert.match((await run(e, failView)).err.message, /bad/);
      assert.equal(e.renderCache.stats().entries, 0);
      const a = await run(e, warnView);
      assert.equal((await run(e, warnView)).html, a.html);
    });
  }

  test('off by default: every render runs, and there is no cache object', async () => {
    const e = make({});
    assert.equal(e.renderCache, null);
    assert.notEqual((await run(e, view)).html, (await run(e, view)).html);
  });

  test('a hit does not reach a worker', async () => {
    const e = make({ workers: 1, renderCache: true });
    await run(e, view);
    for (let i = 0; i < 50; i++) await run(e, view);
    assert.equal(e.renderCache.stats().hits, 50);
  });

  test('bad renderCache config throws', () => {
    assert.throws(() => stencilEngine({ hydrate: fixture, renderCache: 'yes' }), /renderCache/);
    assert.throws(() => stencilEngine({ hydrate: fixture, renderCache: { max: 'x' } }), /max/);
  });
});
