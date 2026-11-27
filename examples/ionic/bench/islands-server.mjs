// The server of bench-islands.mjs (issue #191): the Ionic pages through the real engine, seven ways, all gzip.
//   /full/<page>      stencilEngine without `islands`, the page rendered whole (`res.render`), one response
//   /islands/<page>   stencilEngine({ islands }) with the page's <stencil-island> view, `res.render`: parallel renders, one assembled response
//   /inorder/<page>   the same engine through `streamView` (#192): shell first, each island as it is next in line, gzip with a flush per chunk
//   /cached/<page>    the islands engine with the page's static islands marked `cache` (`<page>.cached.html`; kitchen-sink: header and the list at the end, list-50: its first island): the per-island render cache (#193)
//   /early/<page>     as inorder with `islands: { earlyHead: true }`: the head leaves before the shell has rendered
//   /ooo/<page>       out of order: the shell with anchors, then each island as it finishes and a swap script
//   /perchunk/<page>  as inorder, one flush per island even where two are ready together (`coalesce: false`)
// The Ionic stylesheet is served at /css/ (render-blocking in the pages, as in a real app), so a browser can measure paint against these routes.
// node bench/islands-server.mjs <port> <workers> [dsd|scoped]   (the serialization of shadow components, default dsd: #206)
import express from 'express';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';

import { stencilEngine, streamView } from '../../../express.js';
import { CSS_DIR, HYDRATE, MODES, renderOptions } from '../spike/islands/lib.mjs';
import { writeViews } from '../spike/islands/views.mjs';

const [port = '0', workersArg = '2', modeArg = 'dsd'] = process.argv.slice(2);
const workers = Number(workersArg);
const views = writeViews(['list-50', 'kitchen-sink']);
const warmViews = (suffix) => ['list-50', 'kitchen-sink'].map((n) => join(views, `${n}${suffix}.html`));
const NOCACHE = process.env.ISLAND_CACHE === 'off'; // ISLAND_CACHE=off: the cached routes render everything (the marks are ignored): the cost of the layer itself
const common = { hydrate: HYDRATE, workers, renderOptions: renderOptions(MODES[modeArg]) };
const full = stencilEngine({ ...common, warmup: { views: warmViews('.full'), times: 6 } });
const isl = stencilEngine({ ...common, islands: { cache: !NOCACHE }, warmup: { views: warmViews(''), times: 6 } });
const early = stencilEngine({ ...common, islands: { earlyHead: true }, warmup: { views: warmViews(''), times: 6 } });
await Promise.all([full.ready, isl.ready, early.ready]);
// the fragment path is the one islands use: warm it the way traffic does
for (let n = 0; n < 6; n++) for (const e of [isl, early]) for (const v of warmViews('')) for await (const _ of e.stream(v, {}));
for (let n = 0; n < 6; n++) for (const v of warmViews('.cached')) await (await isl.renderIslands(v)).html();

const gzipWriter = (res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-encoding': 'gzip', 'cache-control': 'no-store' });
  const gz = zlib.createGzip({ flush: zlib.constants.Z_SYNC_FLUSH });
  gz.pipe(res);
  return { write: (c) => new Promise((ok) => gz.write(c, () => gz.flush(ok))), end: () => gz.end() };
};
const render = (engine, file, res, next) => engine(join(views, file), {}, (err, html) => {
  if (err) return next(err);
  const w = gzipWriter(res);
  w.write(html).then(() => w.end());
});
const stream = (engine, options) => (req, res, next) => streamView(engine, join(views, `${req.params.page}.html`), {}, { compress: true, ...options })(req, res, next);

const app = express();
// `?up=ms` delays the request by that long before the server sees it: half of a round trip, for a browser profile that models latency honestly (see docs/spike-islands.md, section 5)
app.use((req, _res, next) => (Number(req.query.up) > 0 ? setTimeout(next, Number(req.query.up)) : next()));
app.disable('x-powered-by');
app.set('etag', false);
app.get('/full/:page', (req, res, next) => render(full, `${req.params.page}.full.html`, res, next));
app.get('/islands/:page', (req, res, next) => render(isl, `${req.params.page}.html`, res, next));
app.get('/cached/:page', (req, res, next) => render(isl, `${req.params.page}.cached.html`, res, next));
app.get('/inorder/:page', stream(isl));
app.get('/early/:page', stream(early));
app.get('/ooo/:page', stream(isl, { mode: 'out-of-order' }));
app.get('/perchunk/:page', stream(isl, { coalesce: false }));
app.get('/css/:file', (req, res) => createReadStream(join(CSS_DIR, req.params.file)).on('error', () => res.status(404).end()).pipe(res.type('css')));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).end(String(err.message)); });
const server = app.listen(Number(port), '127.0.0.1', () => console.log(`listening ${server.address().port}`));
