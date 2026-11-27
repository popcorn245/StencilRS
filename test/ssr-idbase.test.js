// The `idBase` render option (ssr-patches.js): unset, the hydrate app renders what Stencil's own runner renders; set, a render
// numbers its hydration ids from there on counters of its own.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { ISLAND_A, ISLAND_B, SHELL } from './fixtures/islands/build.mjs';
import { buildFixture } from './fixtures/islands/setup.mjs';

const built = await buildFixture();
// Separate module instances: each has the process-wide id counter of its own.
const load = async (file) => import(`${pathToFileURL(file).href}?${Math.random()}`);
const ids = (html) => [...html.matchAll(/\bs-id="(\d+)"/g)].map((m) => Number(m[1]));
const PAGE = `<!doctype html><html><head><title>t</title></head><body>${SHELL(ISLAND_A, ISLAND_B)}</body></html>`;

test('idBase unset: byte-identical to the runner without the patch, render after render', async () => {
  const [patched, plain] = [await load(built.hydrate), await load(built.plain)];
  for (const [html, options] of [
    [PAGE, { fullDocument: true, buildId: 'b' }],
    [ISLAND_A, { fullDocument: false }],
    [ISLAND_B, { fullDocument: false, serializeShadowRoot: 'scoped' }],
    [PAGE, { fullDocument: true, buildId: 'b' }],
  ]) {
    const [a, b] = [await patched.renderToString(html, options), await plain.renderToString(html, options)];
    assert.equal(a.html, b.html);
    assert.deepEqual(a.styles, b.styles);
    assert.deepEqual(a.components, b.components);
    assert.equal(a.hydratedCount, b.hydratedCount);
  }
});

test('idBase unset still shares the process-wide counter, which only grows', async () => {
  const app = await load(built.hydrate);
  const first = ids((await app.renderToString(ISLAND_A, { fullDocument: false })).html);
  const second = ids((await app.renderToString(ISLAND_A, { fullDocument: false })).html);
  assert.deepEqual(first, [1, 2, 3]);
  assert.deepEqual(second, [4, 5, 6]);
});

test('idBase numbers a render from the base, on counters of its own', async () => {
  const app = await load(built.hydrate);
  const a = await app.renderToString(ISLAND_A, { fullDocument: false, idBase: 10_000 });
  assert.deepEqual(ids(a.html), [10_001, 10_002, 10_003]);
  assert.match(a.html, /c-id="10001\.0\.0\.0"/);
  assert.match(a.html, /<!--r\.10001-->/);
  assert.match(a.html, /<!--o\.0\.10001\.c-->|<!--o\.0\.10001\./); // root-level (relocated slotted nodes) count from the base too
  // the same render again: same ids, the base is not consumed
  assert.equal((await app.renderToString(ISLAND_A, { fullDocument: false, idBase: 10_000 })).html, a.html);
  // another base, same markup: only the ids differ
  const b = await app.renderToString(ISLAND_A, { fullDocument: false, idBase: 20_000 });
  assert.deepEqual(ids(b.html), [20_001, 20_002, 20_003]);
  assert.equal(b.html.replace(/20(00\d)/g, '10$1'), a.html);
  // and the process-wide counter did not move: a render without idBase starts where a fresh app would
  assert.deepEqual(ids((await app.renderToString(ISLAND_A, { fullDocument: false })).html), [1, 2, 3]);
});

test('idBase: 0 makes a full page reproducible, request after request, and equal to the first render of a fresh process', async () => {
  const fresh = await load(built.hydrate);
  const first = (await fresh.renderToString(PAGE, { fullDocument: true, buildId: 'b' })).html;
  const app = await load(built.hydrate);
  await app.renderToString(PAGE, { fullDocument: true, buildId: 'b' }); // the counter is not at 0 any more
  await app.renderToString(PAGE, { fullDocument: true, buildId: 'b' });
  assert.notEqual((await app.renderToString(PAGE, { fullDocument: true, buildId: 'b' })).html, first, 'without idBase the ids keep growing');
  for (let i = 0; i < 3; i++) assert.equal((await app.renderToString(PAGE, { fullDocument: true, buildId: 'b', idBase: 0 })).html, first);
});

test('islands numbered from different bases never share a host id', async () => {
  const [one, two] = [await load(built.hydrate), await load(built.hydrate)]; // two threads' worth of counters
  const a = ids((await one.renderToString(ISLAND_A, { fullDocument: false })).html);
  const b = ids((await two.renderToString(ISLAND_B, { fullDocument: false })).html);
  assert.ok(a.some((id) => b.includes(id)), 'control: without idBase two apps collide');
  const x = ids((await one.renderToString(ISLAND_A, { fullDocument: false, idBase: 10_000 })).html);
  const y = ids((await two.renderToString(ISLAND_B, { fullDocument: false, idBase: 20_000 })).html);
  assert.ok(!x.some((id) => y.includes(id)));
});
