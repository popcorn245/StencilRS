// Child process of bench-ssr.mjs, the throughput step: the same minimal Express app for every row,
// GET / -> renderToString(page) -> res.send. #131 swaps a real engine in here.
//   node ssr-bench/server.mjs <hydrate.js> <page> <mode> <port> [workers] [cache]
// With `workers` (a number, or 'auto') the page goes through the stencilEngine worker pool instead (issue #140): `res.render`
// of a plain-HTML view, the same hydrate app and options, rendered on n worker_threads. Without it, the in-process path above.
import express from 'express';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAGES, renderOptions } from '../ssr-pages.mjs';

// With `cache` ('cache') the engine has `renderCache: true` (issue #181): every request after the first is a hit, so 100% hit rate,
// the upper bound. `workers` may be '0' to use the engine in-process.
const [file, page, mode, port, workers, cache] = process.argv.slice(2);
const options = renderOptions(mode);
const html = PAGES[page];
if (html === undefined) throw new Error(`unknown page ${page}`);

const app = express();
app.disable('x-powered-by');
app.set('etag', false); // hashing a 1 MB body per request is Express's cost, not the renderer's
if (workers || cache) {
  const { stencilEngine } = await import('../../../express.js');
  const views = mkdtempSync(join(tmpdir(), 'ssr-bench-view-'));
  writeFileSync(join(views, 'page.html'), html);
  const engine = stencilEngine({ hydrate: file, renderOptions: options, workers: workers === 'auto' ? 'auto' : Number(workers || 0), renderCache: cache === 'cache' });
  app.set('views', views);
  app.set('view cache', true); // the file is read once, as in production
  app.engine('html', engine);
  app.get('/', (_req, res, next) => res.render('page.html', {}, (err, out) => (err ? next(err) : res.send(out))));
  await engine.ready; // every worker has loaded the hydrate app before the run starts
} else {
  const { renderToString } = await import(pathToFileURL(file).href);
  app.get('/', async (_req, res) => {
    const result = await renderToString(html, options);
    res.send(result.html);
  });
}
app.listen(Number(port), '127.0.0.1', () => console.log('listening'));
