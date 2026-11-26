// Scratch Express server of the islands spike (not library code).
//   node spike/islands/server.mjs <port> <workers> [mode=dsd]
//
//   /full/<page>       the current engine: stencilEngine({ workers }) renders the whole page, res.send
//   /inorder/<page>    shell + islands on a pool of the same size, written in order as they complete
//   /ooo/<page>        shell with anchors at once, islands written the moment each finishes, moved into place by a one-line script
//   /early/<page>      as /inorder, with the <head> written before anything renders (html attributes from a probe render)
//   /noisl/<page>      the islands' pool rendering but sent as one response after all are done (isolates streaming from parallelism)
// All responses gzip (Z_SYNC_FLUSH after each chunk, so streaming survives the compression). `?delay=name:ms,...` makes an island slow
// (a database call behind it) by waiting before its html is released, to show out-of-order.
import express from 'express';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

import { stencilEngine } from '../../../../express.js';
import { CLIENT_DIR, CSS_DIR, HYDRATE, MODES, PAGES, renderOptions } from './lib.mjs';
import { createPool } from './pool.mjs';
import { cutShell, earlyHead, probeHtmlTag, renderPage, streamEarly, streamInOrder, streamOutOfOrder, styleDeduper } from './stream.mjs';

const [port = '0', workersArg = '2', modeName = 'dsd'] = process.argv.slice(2);
const workers = Number(workersArg);
const mode = MODES[modeName];
const idbase = pathToFileURL(HYDRATE.replace(/index\.js$/, 'index.idbase.js')).href;

const views = mkdtempSync(join(tmpdir(), 'islands-views-'));
for (const [name, page] of Object.entries(PAGES)) writeFileSync(join(views, `${name}.html`), page.full());
const engine = stencilEngine({ hydrate: HYDRATE, workers, renderOptions: renderOptions(mode), warmup: { views: Object.keys(PAGES).map((n) => join(views, `${n}.html`)), times: 6 } });
const pool = await createPool(idbase, workers);
await engine.ready;
// the same warm-up for the island pool: three rounds of every page's pieces
for (let n = 0; n < 6; n++) for (const page of Object.values(PAGES)) { const r = renderPage(pool, page, { mode }); await Promise.all([r.shell, ...r.islands.map((i) => i.done)]); }

const htmlTag = await probeHtmlTag(pool, mode);
const app = express();
// UP_DELAY_MS: the request's trip to the server (CDP's latency emulation delays the response and so hides the server's own time, because both run in parallel).
const up = Number(process.env.UP_DELAY_MS ?? 0);
if (up) app.use((_req, _res, next) => setTimeout(next, up));
app.disable('x-powered-by');
app.set('etag', false);
app.engine('html', engine);
app.set('views', views);
app.set('view cache', true);
app.use('/client', express.static(CLIENT_DIR, { maxAge: '1h' }));
app.use('/css', express.static(CSS_DIR, { maxAge: '1h' }));

/** A gzip writer over `res`; `write` flushes so a chunk leaves the server now. */
const gzipWriter = (res, type = 'text/html; charset=utf-8') => {
  res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  const gz = zlib.createGzip({ flush: zlib.constants.Z_SYNC_FLUSH });
  gz.pipe(res);
  return {
    write: (chunk) => new Promise((ok) => { gz.write(chunk, () => { gz.flush(ok); }); }),
    end: () => gz.end(),
  };
};

app.get('/full/:page', (req, res, next) => {
  res.render(`${req.params.page}.html`, {}, (err, html) => {
    if (err) return next(err);
    const w = gzipWriter(res);
    w.write(html).then(() => w.end());
  });
});

const delays = (req) => Object.fromEntries(String(req.query.delay ?? '').split(',').filter(Boolean).map((p) => p.split(':')).map(([n, ms]) => [n, Number(ms)]));
const withDelays = (rendered, d) => {
  rendered.islands.forEach((isl) => { if (d[isl.name]) { const p = isl.done; isl.done = p.then((r) => new Promise((ok) => setTimeout(() => ok(r), d[isl.name]))); } });
  return rendered;
};

app.get('/inorder/:page', async (req, res, next) => {
  try {
    const rendered = withDelays(renderPage(pool, PAGES[req.params.page], { mode }), delays(req));
    const w = gzipWriter(res);
    await streamInOrder(w.write, rendered);
    w.end();
  } catch (e) { next(e); }
});
app.get('/ooo/:page', async (req, res, next) => {
  try {
    const rendered = withDelays(renderPage(pool, PAGES[req.params.page], { mode }), delays(req));
    const w = gzipWriter(res);
    await streamOutOfOrder(w.write, rendered);
    w.end();
  } catch (e) { next(e); }
});
app.get('/early/:page', async (req, res, next) => {
  try {
    const page = PAGES[req.params.page];
    const rendered = withDelays(renderPage(pool, page, { mode }), delays(req));
    const w = gzipWriter(res);
    await streamEarly(w.write, rendered, earlyHead(page, htmlTag));
    w.end();
  } catch (e) { next(e); }
});
app.get('/noisl/:page', async (req, res, next) => {
  try {
    const rendered = renderPage(pool, PAGES[req.params.page], { mode });
    const shell = await rendered.shell;
    const segs = cutShell(shell.html, rendered.names);
    const dedupe = styleDeduper(shell);
    let html = segs[0];
    for (let i = 0; i < rendered.islands.length; i++) { const r = await rendered.islands[i].done; html += dedupe(r.styles) + r.html + segs[i + 1]; }
    const w = gzipWriter(res);
    await w.write(html);
    w.end();
  } catch (e) { next(e); }
});
app.use((err, _req, res, _next) => { console.error(err); res.status(500).end(String(err.message)); });

const server = app.listen(Number(port), '127.0.0.1', () => console.log(`listening ${server.address().port}`));
