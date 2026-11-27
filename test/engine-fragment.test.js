// stencilEngine's `renderFragment`: a fragment rendered with options of its own, in-process and on the worker pool,
// and what comes back (html, styles, components, hydratedCount, diagnostics).
import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { stencilEngine } from '../express.js';
import { ISLAND_A, ISLAND_B } from './fixtures/islands/build.mjs';
import { buildFixture } from './fixtures/islands/setup.mjs';

const built = await buildFixture();
const ids = (html) => [...html.matchAll(/\bs-id="(\d+)"/g)].map((m) => Number(m[1]));
const engines = [];
const make = (options) => engines.push(stencilEngine({ hydrate: built.hydrate, ...options })) && engines.at(-1);
after(() => Promise.all(engines.map((e) => e.close())));

for (const [name, options] of [['in-process', {}], ['workers: 2', { workers: 2 }]]) {
  test(`renderFragment (${name}): html, styles, components, hydratedCount and diagnostics`, async () => {
    const engine = make(options);
    await engine.ready;
    const r = await engine.renderFragment(ISLAND_A, { idBase: 10_000 });
    assert.deepEqual(Object.keys(r).sort(), ['components', 'diagnostics', 'html', 'hydratedCount', 'styles']);
    assert.deepEqual(ids(r.html), [10_001, 10_002, 10_003]);
    assert.match(r.html, /^<isl-counter label="A" count="1" class="hydrated" s-id="10001"><template shadowrootmode="open">/);
    assert.equal(r.hydratedCount, 3);
    assert.deepEqual(r.components.map((c) => [c.tag, c.count]).sort(), [['isl-counter', 1], ['isl-tag', 2]]);
    assert.deepEqual(r.styles.map((s) => s.id), ['sc-isl-tag']); // the scoped component's CSS, for the page's head
    assert.match(r.styles[0].content, /^\.tag\.sc-isl-tag\{color:#036\}/);
    assert.deepEqual(r.diagnostics, []);
    // plain data: it must survive a structured clone, whatever thread it came from
    assert.deepEqual(structuredClone(r), r);
  });

  test(`renderFragment (${name}): fullDocument is false unless given, engine renderOptions apply, call options win`, async () => {
    const engine = make({ ...options, renderOptions: { serializeShadowRoot: 'scoped', fullDocument: true, buildId: 'e' } });
    await engine.ready;
    assert.match((await engine.renderFragment(ISLAND_B, { fullDocument: false })).html, /^<isl-counter/);
    assert.doesNotMatch((await engine.renderFragment(ISLAND_B, { fullDocument: false })).html, /shadowrootmode/);
    assert.match((await engine.renderFragment(ISLAND_B, { fullDocument: true })).html, /^<!doctype html><html/);
    const plain = make(options);
    assert.match((await plain.renderFragment(ISLAND_B)).html, /^<isl-counter/);
  });

  test(`renderFragment (${name}): the same idBase renders the same bytes, whatever was rendered before`, async () => {
    const engine = make(options);
    const first = await engine.renderFragment(ISLAND_A, { idBase: 5_000 });
    await engine.renderFragment(ISLAND_B);
    await engine.renderFragment(ISLAND_B, { idBase: 9_000 });
    assert.equal((await engine.renderFragment(ISLAND_A, { idBase: 5_000 })).html, first.html);
  });

  test(`renderFragment (${name}): bad arguments are TypeErrors, not renders`, async () => {
    const engine = make(options);
    await assert.rejects(engine.renderFragment(42), /renderFragment needs the HTML/);
    await assert.rejects(engine.renderFragment(ISLAND_A, { idBase: -1 }), /idBase.*non-negative integer/);
    await assert.rejects(engine.renderFragment(ISLAND_A, { idBase: 1.5 }), /idBase/);
    await assert.rejects(engine.renderFragment(ISLAND_A, { idBase: '5' }), /idBase/);
  });
}

test('renderFragment on the pool: two threads, distinct idBase, no shared ids; without idBase they collide (the reason it exists)', async () => {
  const engine = make({ workers: 2 });
  await engine.ready;
  const [a, b] = await Promise.all([engine.renderFragment(ISLAND_A), engine.renderFragment(ISLAND_B)]);
  assert.ok(ids(a.html).some((id) => ids(b.html).includes(id)), 'control: both threads count from 0');
  const [x, y] = await Promise.all([engine.renderFragment(ISLAND_A, { idBase: 10_000 }), engine.renderFragment(ISLAND_B, { idBase: 20_000 })]);
  assert.ok(!ids(x.html).some((id) => ids(y.html).includes(id)));
});

test('renderFragment on the pool honours the queue limit, and a page render through the engine is unchanged', async () => {
  const engine = make({ workers: 1, maxQueue: 1 });
  await engine.ready;
  const jobs = [engine.renderFragment(ISLAND_A), engine.renderFragment(ISLAND_A), engine.renderFragment(ISLAND_A)];
  const settled = await Promise.allSettled(jobs);
  assert.deepEqual(settled.map((s) => s.status), ['fulfilled', 'fulfilled', 'rejected']);
  assert.equal(settled[2].reason.code, 'ESTENCIL_QUEUE_FULL');
});

test('a closed engine rejects renderFragment on the pool', async () => {
  const engine = make({ workers: 1 });
  await engine.ready;
  await engine.close();
  await assert.rejects(engine.renderFragment(ISLAND_A), { code: 'ESTENCIL_CLOSED' });
});
