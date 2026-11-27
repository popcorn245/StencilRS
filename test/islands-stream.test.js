// The streaming responder of the islands engine (#192): engine.stream in order and out of order, the CSP nonce, a failing island, a client
// that goes away, and the Express handler (streamView) over a real socket, with and without gzip.
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import zlib from 'node:zlib';

import { stencilEngine, streamView } from '../express.js';
import { ISLAND_A, ISLAND_B } from './fixtures/islands/build.mjs';
import { buildFixture } from './fixtures/islands/setup.mjs';

const dir = mkdtempSync(join(tmpdir(), 'stencilrs-islands-stream-'));
const log = join(dir, 'renders.log');

// A hydrate app that renders by echo: `data-delay="ms"` makes a render slow, `data-fail` makes it throw, and every render is logged.
const fake = join(dir, 'fake-hydrate.mjs');
writeFileSync(
  fake,
  `import { appendFileSync } from 'node:fs';
export const renderToString = async (html, options) => {
  const delay = /data-delay="(\\d+)"/.exec(html)?.[1];
  appendFileSync(options.logFile, 'start ' + html.slice(0, 40).replace(/\\s+/g, ' ') + '\\n');
  if (delay) await new Promise((r) => setTimeout(r, Number(delay)));
  if (html.includes('data-fail')) throw new Error('boom: ' + html.slice(0, 20));
  const style = /data-style="([^"]+)"/.exec(html)?.[1];
  return { html, styles: style ? [{ id: style, content: '.x{}' }] : [], components: [], hydratedCount: 1, diagnostics: [] };
};
`
);

const engines = [];
const make = (options) => engines.push(stencilEngine({ hydrate: fake, renderOptions: { logFile: log }, ...options })) && engines.at(-1);
after(() => Promise.all(engines.map((e) => e.close())));

let n = 0;
const view = (html) => {
  const file = join(dir, `v${n++}.html`);
  writeFileSync(file, html);
  return file;
};
const collect = async (iterable, times) => {
  const out = [];
  const t0 = performance.now();
  for await (const c of iterable) {
    out.push(c);
    times?.push(performance.now() - t0);
  }
  return out;
};
const count = (s, text) => s.split(text).length - 1;
const renders = () => readFileSync(log, 'utf8').split('\n').filter(Boolean);

const DOC = (body) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>t</title></head>\n<body>${body}</body></html>`;
const PAGE = DOC(`<h1>shell</h1>
<stencil-island name="a"><p id="pa" data-style="sa">A</p></stencil-island>
<hr>
<stencil-island name="b"><p id="pb" data-delay="150" data-style="sb">B</p></stencil-island>
<stencil-island name="c"><p id="pc">C</p></stencil-island>
<footer>end</footer>`);

for (const workers of [0, 2]) {
  const label = workers ? 'workers: 2' : 'in-process';

  test(`stream (${label}): in order, the shell goes out before the slow island, the islands in the order of the view, styles once`, async () => {
    const engine = make({ workers, islands: {} });
    await engine.ready;
    const times = [];
    const chunks = await collect(engine.stream(view(PAGE), {}), times);
    const whole = chunks.join('');
    assert.ok(times[0] < 100, `the first chunk (${times[0]} ms) does not wait for the slow island`);
    assert.match(chunks[0], /<h1>shell<\/h1>/);
    assert.ok(!chunks[0].includes('id="pa"'), 'the first chunk is the shell up to the first island');
    assert.ok(whole.indexOf('id="pa"') < whole.indexOf('id="pb"') && whole.indexOf('id="pb"') < whole.indexOf('id="pc"'));
    assert.match(whole, /<p data-island="a" data-client="load" id="pa"/);
    assert.equal(count(whole, 'sty-id="sa"'), 1);
    assert.equal(count(whole, 'sty-id="sb"'), 1);
    assert.ok(whole.endsWith('<footer>end</footer></body></html>'));
    // what chunks() of the page writes, with the same pieces
    const page = await engine.renderIslands(view(PAGE));
    assert.equal(whole, (await collect(page.chunks())).join(''));
    // an island that is ready when its turn comes shares the chunk of the one before it: c was ready long before b, so it is in b's chunk
    assert.equal(chunks.length, 3, 'shell, a, then b and c together');
    assert.ok(chunks[2].includes('id="pb"') && chunks[2].includes('id="pc"'));
    const plain = await collect(engine.stream(view(PAGE), {}, { coalesce: false }));
    assert.equal(plain.length, 4);
    assert.equal(plain.join(''), whole);
  });

  test(`stream (${label}): out of order, the shell with anchors first, then the islands as they finish, one swap function, noscript reveal`, async () => {
    const engine = make({ workers, islands: {} });
    await engine.ready;
    const times = [];
    const chunks = await collect(engine.stream(view(PAGE), {}, { mode: 'out-of-order' }), times);
    assert.equal(chunks.length, 5, 'shell, three islands, the tail');
    const [shell, ...islands] = chunks;
    assert.match(shell, /<template id="s-isl-0"><\/template>\s*<hr>\s*<template id="s-isl-1"><\/template>\s*<template id="s-isl-2"><\/template>/);
    assert.equal(count(chunks.join(''), 'function $ISL'), 1);
    assert.match(shell, /<noscript id="s-isl-ns"><style>\[id\^="s-isl-c-"\]\{display:block!important\}<\/style><\/noscript><script>function \$ISL/);
    assert.ok(!shell.includes('id="pa"'), 'no island in the first chunk');
    assert.ok(shell.includes('<footer>end</footer>') && !shell.includes('</body>'), 'the whole shell, minus its end');
    // c and a are quick, b is slow: the slow one comes last
    assert.deepEqual(islands.slice(0, 3).map((c) => /s-isl-c-(\d)/.exec(c)[1]).sort(), ['0', '1', '2']);
    assert.match(islands[2], /^<div hidden id="s-isl-c-1">.*id="pb"[^]*<\/div><script>\$ISL\(1\)<\/script>$/);
    assert.equal(islands[3], '</body></html>');
    assert.ok(times[0] < 100);
    assert.ok(islands[0].includes('sty-id="sa"') || islands[1].includes('sty-id="sa"'));
  });
}

test('stream: the CSP nonce is on every inline script and style of the out-of-order mode, and only a base64 string is accepted', async () => {
  const engine = make({ islands: {} });
  const html = (await collect(engine.stream(view(PAGE), {}, { mode: 'out-of-order', nonce: 'abc123+/=_-' }))).join('');
  assert.equal(count(html, '<script'), 4, 'the swap and one call per island');
  assert.equal(count(html, '<script nonce="abc123+/=_-">'), 4);
  assert.match(html, /<noscript id="s-isl-ns"><style nonce="abc123\+\/=_-">/);
  const viaFunction = (await collect(engine.stream(view(PAGE), {}, { mode: 'out-of-order', nonce: () => 'n0nce' }))).join('');
  assert.equal(count(viaFunction, 'nonce="n0nce"'), 5);
  assert.throws(() => engine.stream(view(PAGE), {}, { mode: 'out-of-order', nonce: '"><script>alert(1)</script>' }), /nonce/);
  assert.throws(() => engine.stream(view(PAGE), {}, { mode: 'sideways' }), /stream mode/);
  assert.throws(() => make({ islands: { stream: 'x' } }), /islands\.stream/);
  assert.throws(() => make({ islands: { onError: 1 } }), /islands\.onError/);
});

test('stream: the mode of the engine is the default, a call overrides it', async () => {
  const engine = make({ islands: { stream: 'out-of-order' } });
  assert.ok((await collect(engine.stream(view(PAGE), {}))).join('').includes('$ISL('));
  assert.ok(!(await collect(engine.stream(view(PAGE), {}, { mode: 'in-order' }))).join('').includes('$ISL('));
});

test('stream: an island that fails after the response started is replaced by its fallback and logged, in both modes; the page goes on', async () => {
  const page = DOC('<h1>shell</h1><stencil-island name="ok"><p id="ok">fine</p></stencil-island><stencil-island name="bad"><p data-fail>x</p></stencil-island><stencil-island name="last"><p id="last">z</p></stencil-island>');
  for (const mode of ['in-order', 'out-of-order']) {
    const engine = make({ workers: 1, islands: {} });
    const errors = [];
    const html = (await collect(engine.stream(view(page), {}, { mode, onError: (err, info) => errors.push([err.message, info]) }))).join('');
    assert.equal(errors.length, 1);
    assert.match(errors[0][0], /boom/);
    assert.deepEqual(errors[0][1], { view: errors[0][1].view, island: 'bad' });
    assert.match(html, /<div data-island="bad" data-client="none" data-island-error hidden><\/div>/, mode);
    assert.ok(html.includes('id="ok"') && html.includes('id="last"'), mode);
    assert.ok(html.endsWith('</body></html>'));
    const custom = (await collect(engine.stream(view(page), {}, { mode, onError() {}, fallback: (name, err) => `<p class="oops">${name}: ${err.message.slice(0, 4)}</p>` }))).join('');
    assert.ok(custom.includes('<p class="oops">bad: boom</p>'), mode);
  }
  // the default log goes to console.error and names the view and the island
  const engine = make({ islands: { fallback: () => '<i>x</i>' } });
  const seen = [];
  const real = console.error;
  console.error = (...a) => seen.push(a.join(' '));
  try {
    await collect(engine.stream(view(page), {}));
  } finally {
    console.error = real;
  }
  assert.match(seen.join('\n'), /island "bad" failed after the response had started: Error: boom/);
});

test('stream: a shell that fails before any byte is out throws from the iteration; a view without islands is one chunk, as res.render renders it', async () => {
  const engine = make({ islands: {} });
  await assert.rejects(collect(engine.stream(view(DOC('<p data-fail>shell</p><stencil-island name="a"><i>a</i></stencil-island>')), {})), /boom/);
  const early = make({ islands: { earlyHead: true } });
  const chunks = [];
  await assert.rejects(async () => {
    for await (const c of early.stream(view(DOC('<p data-fail>shell</p><stencil-island name="a"><i>a</i></stencil-island>')), {})) chunks.push(c);
  }, /boom/);
  assert.equal(chunks.length, 1, 'with an early head the head was already out');
  const plain = view(DOC('<p>no islands</p>'));
  const whole = await new Promise((ok, no) => engine(plain, {}, (e, h) => (e ? no(e) : ok(h))));
  assert.deepEqual(await collect(engine.stream(plain, {})), [whole]);
  assert.deepEqual(await collect(make({}).stream(plain, {})), [whole], 'also on an engine without the islands option');
});

test('stream: out of order with an early head keeps the head first and the shell styles at the top of the body', async () => {
  const engine = make({ islands: { earlyHead: true } });
  const chunks = await collect(engine.stream(view(DOC('<p data-style="sh">s</p><stencil-island name="a"><p data-style="sa">a</p></stencil-island>')), {}, { mode: 'out-of-order' }));
  assert.match(chunks[0], /^<html lang="en"[^>]*><head>[^]*<body>$/);
  assert.match(chunks[1], /^<style sty-id="sh">/);
  assert.ok(chunks[2].includes('sty-id="sa"') && chunks[2].includes('$ISL(0)'));
  assert.equal(chunks.at(-1), '</body></html>');
});

test('stream: aborting stops the iteration and cancels the renders that have not started; breaking out of the loop does the same', async () => {
  const many = DOC(`<p>shell</p>${Array.from({ length: 6 }, (_, i) => `<stencil-island name="i${i}"><p data-delay="120">${i}</p></stencil-island>`).join('')}`);
  for (const how of ['signal', 'break']) {
    writeFileSync(log, '');
    const engine = make({ workers: 1, islands: {} });
    await engine.ready;
    const ctl = new AbortController();
    const got = [];
    for await (const c of engine.stream(view(many), {}, { signal: ctl.signal })) {
      got.push(c);
      if (how === 'signal') ctl.abort();
      else break;
      break;
    }
    assert.equal(got.length, 1);
    await new Promise((ok) => setTimeout(ok, 700));
    // the shell and the island the one thread had already taken; the other five never started
    assert.ok(renders().length <= 3, `${how}: ${renders().length} renders ran`);
    // and the engine is fine
    assert.equal((await collect(engine.stream(view(DOC('<stencil-island name="a"><p>ok</p></stencil-island>')), {}))).join('').includes('<p data-island="a"'), true);
  }
  const engine = make({ islands: {} });
  const ctl = new AbortController();
  ctl.abort();
  assert.deepEqual(await collect(engine.stream(view(many), {}, { signal: ctl.signal })), []);
  writeFileSync(log, '');
});

// The Express handler, over a real socket (no Express here: the app is the few members the handler reads).
const app = { locals: { title: 'T' }, enabled: () => false, get: () => undefined };
const serve = (engine, handler) =>
  new Promise((ok) => {
    const server = http.createServer((req, res) => {
      req.app = app;
      res.locals = {};
      handler(req, res, (err) => res.writeHead(500).end(`next: ${err.message}`));
    });
    server.listen(0, '127.0.0.1', () => ok(server));
  });
const fetchRaw = (server, headers = {}) =>
  new Promise((ok, no) => {
    const times = [];
    const t0 = performance.now();
    http
      .get({ host: '127.0.0.1', port: server.address().port, headers }, (res) => {
        const bufs = [];
        res.on('data', (d) => (bufs.push(d), times.push(performance.now() - t0)));
        res.on('end', () => ok({ res, body: Buffer.concat(bufs), times }));
      })
      .on('error', no);
  });

test('streamView: writes the page as chunks, headers with the first, locals from a function, a missing view and a failing shell go to next()', async () => {
  const engine = make({ islands: {} });
  const file = view(PAGE);
  const server = await serve(engine, streamView(engine, file, (req) => ({ who: req.method })));
  const { res, body, times } = await fetchRaw(server);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/html; charset=utf-8/);
  assert.equal(res.headers['x-accel-buffering'], 'no');
  assert.equal(res.headers['transfer-encoding'], 'chunked');
  assert.ok(body.toString().includes('id="pc"') && body.toString().endsWith('</html>'));
  assert.ok(times.length >= 2, 'more than one chunk reached the client');
  server.close();

  const bad = await serve(engine, streamView(engine, view(DOC('<p data-fail>x</p><stencil-island name="a"><i>a</i></stencil-island>')), {}));
  const failed = await fetchRaw(bad);
  assert.equal(failed.res.statusCode, 500);
  assert.match(failed.body.toString(), /^next: boom/);
  bad.close();
  assert.throws(() => streamView({}, 'x'), /stencilEngine/);
  assert.throws(() => streamView(engine, 'x', {}, { compress: 'gzip' }), /compress/);
});

test('streamView: compress gzips with a sync flush per chunk (the client can read each island before the next is ready), mode and nonce options reach the page', async () => {
  const engine = make({ islands: {} });
  const server = await serve(engine, streamView(engine, view(PAGE), {}, { compress: { level: 6 }, mode: 'out-of-order', nonce: () => 'N1' }));
  const { res, body, times } = await fetchRaw(server, { 'accept-encoding': 'gzip' });
  assert.equal(res.headers['content-encoding'], 'gzip');
  assert.match(res.headers.vary ?? '', /Accept-Encoding/i);
  const html = zlib.gunzipSync(body).toString();
  assert.equal(count(html, 'nonce="N1"'), 5);
  assert.ok(times.length >= 3, `flushed in pieces (${times.length})`);
  assert.ok(times[0] < 100, `first bytes at ${times[0]} ms, before the slow island`);
  // a client without gzip gets it plain
  const plain = await fetchRaw(server, {});
  assert.equal(plain.res.headers['content-encoding'], undefined);
  server.close();
});

test('streamView: a client that hangs up cancels the renders that have not started', async () => {
  const many = DOC(`<p>shell</p>${Array.from({ length: 6 }, (_, i) => `<stencil-island name="i${i}"><p data-delay="120">${i}</p></stencil-island>`).join('')}`);
  writeFileSync(log, '');
  const engine = make({ workers: 1, islands: {} });
  await engine.ready;
  const server = await serve(engine, streamView(engine, view(many), {}));
  await new Promise((ok) => {
    const req = http.get({ host: '127.0.0.1', port: server.address().port }, (res) => res.once('data', () => (req.destroy(), ok())));
    req.on('error', () => {});
  });
  await new Promise((ok) => setTimeout(ok, 800));
  assert.ok(renders().length <= 3, `${renders().length} renders ran`);
  server.close();
});

// The real components: the streamed page is the page res.render sends, in the pieces a client can use.
const built = await buildFixture();
const real = (options) => engines.push(stencilEngine({ hydrate: built.hydrate, renderOptions: { buildId: 'b' }, ...options })) && engines.at(-1);

test('stream with real components: in order the chunks are the page, out of order the same nodes (the swap moves them), ids apart', async () => {
  const file = view(DOC(`<h1>real</h1><section id="a"><stencil-island name="a">${ISLAND_A}</stencil-island></section><section id="b"><stencil-island name="b">${ISLAND_B}</stencil-island></section>`));
  const engine = real({ workers: 2, islands: {} });
  await engine.ready;
  const whole = await new Promise((ok, no) => engine(file, {}, (e, h) => (e ? no(e) : ok(h))));
  const inOrder = (await collect(engine.stream(file, {}))).join('');
  // res.render puts the islands' styles in the head, a stream puts them in the body: the same markup otherwise
  const strip = (h) => h.replace(/<style sty-id="sc-isl-tag">[^]*?<\/style>/, '');
  assert.equal(strip(inOrder), strip(whole));
  const ooo = (await collect(engine.stream(file, {}, { mode: 'out-of-order' }))).join('');
  assert.equal(count(ooo, 'data-island="a"'), count(whole, 'data-island="a"'));
  assert.equal(count(ooo, 'data-island="b"'), count(whole, 'data-island="b"'));
  assert.ok(ooo.indexOf('<template id="s-isl-0">') < ooo.indexOf('data-island="a"'));
  assert.deepEqual([...ooo.matchAll(/\bs-id="(\d+)"/g)].map((m) => Number(m[1])).sort((x, y) => x - y), [...whole.matchAll(/\bs-id="(\d+)"/g)].map((m) => Number(m[1])).sort((x, y) => x - y));
});
