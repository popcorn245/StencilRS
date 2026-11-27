// node build.mjs && node server.mjs      then open http://localhost:3000
//   /            out-of-order streaming: the page and the counter now, the slow feed when it is ready
//   /in-order    in-order streaming: islands appear in document order, so the slow feed holds back the footer
//   /whole       the same view as one response (res.render): nothing is sent until the slow feed is done
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stencilEngine, streamView } from '@popcorn245/stencilrs/express';
import express from 'express';

const here = dirname(fileURLToPath(import.meta.url));

export const createApp = ({ hydrate = join(here, 'dist/hydrate/index.js'), client = join(here, 'dist/client') } = {}) => {
  const app = express();
  app.disable('x-powered-by');
  app.set('views', join(here, 'views'));
  app.set('view engine', 'html');
  const engine = stencilEngine({
    hydrate,
    workers: 2, // the islands render at the same time: the slow one does not hold up the others
    islands: { client: { base: '/client/', manifest: join(client, 'components.json') }, cache: true },
  });
  app.engine('html', engine);
  app.use('/client', express.static(client));

  app.get('/', streamView(engine, 'home', {}, { mode: 'out-of-order' }));
  app.get('/in-order', streamView(engine, 'home'));
  app.get('/whole', (_req, res) => res.render('home'));
  app.use((err, _req, res, _next) => res.status(500).type('text').send(`render failed: ${err.message}`));
  app.locals.engine = engine; // `await app.locals.engine.close()` stops the workers
  return app;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`http://localhost:${port}   (/in-order, /whole)`));
}
