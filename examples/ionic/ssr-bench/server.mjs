// Child process of bench-ssr.mjs, the throughput step: the same minimal Express app for every row,
// GET / -> renderToString(page) -> res.send. #131 swaps a real engine in here.
//   node ssr-bench/server.mjs <hydrate.js> <page> <mode> <port>
import express from 'express';
import { pathToFileURL } from 'node:url';
import { PAGES, renderOptions } from '../ssr-pages.mjs';

const [file, page, mode, port] = process.argv.slice(2);
const { renderToString } = await import(pathToFileURL(file).href);
const options = renderOptions(mode);
const html = PAGES[page];
if (html === undefined) throw new Error(`unknown page ${page}`);

const app = express();
app.disable('x-powered-by');
app.set('etag', false); // hashing a 1 MB body per request is Express's cost, not the renderer's
app.get('/', async (_req, res) => {
  const result = await renderToString(html, options);
  res.send(result.html);
});
app.listen(Number(port), '127.0.0.1', () => console.log('listening'));
