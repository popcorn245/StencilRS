// The server of bench-islands.mjs (issue #191): the Ionic pages through the real engine, four ways, all gzip.
//   /full/<page>      stencilEngine without `islands`, the page rendered whole (`res.render`), one response
//   /islands/<page>   stencilEngine({ islands }) with the page's <stencil-island> view, `res.render`: parallel renders, one assembled response
//   /inorder/<page>   the same engine's `renderIslands(...).chunks()` written as each piece is next in line (the seam a streaming responder uses, #192)
//   /early/<page>     as inorder with `islands: { earlyHead: true }`: the head leaves before the shell has rendered
// node bench/islands-server.mjs <port> <workers>
import express from 'express';
import { join } from 'node:path';
import zlib from 'node:zlib';

import { stencilEngine } from '../../../express.js';
import { HYDRATE, MODES, renderOptions } from '../spike/islands/lib.mjs';
import { writeViews } from '../spike/islands/views.mjs';

const [port = '0', workersArg = '2'] = process.argv.slice(2);
const workers = Number(workersArg);
const views = writeViews(['list-50', 'kitchen-sink']);
const warmViews = (suffix) => ['list-50', 'kitchen-sink'].map((n) => join(views, `${n}${suffix}.html`));
const common = { hydrate: HYDRATE, workers, renderOptions: renderOptions(MODES.dsd) };
const full = stencilEngine({ ...common, warmup: { views: warmViews('.full'), times: 6 } });
const isl = stencilEngine({ ...common, islands: {}, warmup: { views: warmViews(''), times: 6 } });
const early = stencilEngine({ ...common, islands: { earlyHead: true }, warmup: { views: warmViews(''), times: 6 } });
await Promise.all([full.ready, isl.ready, early.ready]);
// the fragment path is the one islands use: warm it the way traffic does
for (let n = 0; n < 6; n++) for (const e of [isl, early]) for (const v of warmViews('')) await (await e.renderIslands(v)).html();

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
const stream = (engine) => async (req, res, next) => {
  try {
    const page = await engine.renderIslands(join(views, `${req.params.page}.html`));
    const w = gzipWriter(res);
    for await (const chunk of page.chunks()) await w.write(chunk);
    w.end();
  } catch (e) { next(e); }
};

const app = express();
app.disable('x-powered-by');
app.set('etag', false);
app.get('/full/:page', (req, res, next) => render(full, `${req.params.page}.full.html`, res, next));
app.get('/islands/:page', (req, res, next) => render(isl, `${req.params.page}.html`, res, next));
app.get('/inorder/:page', stream(isl));
app.get('/early/:page', stream(early));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).end(String(err.message)); });
const server = app.listen(Number(port), '127.0.0.1', () => console.log(`listening ${server.address().port}`));
