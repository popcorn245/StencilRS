// An Express app whose views are Stencil components, rendered on the server: the hydrate app is the
// ui-kit's (`npm run build` builds it from stencilrs' output; Stencil's own `ssr` build works the same).
//
//   .ejs   EJS fills in the locals, then the hydrate app renders the components in the result
//   .html  no inner engine: the file is the HTML the hydrate app renders
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stencilEngine } from '@popcorn245/stencilrs/express';
import ejs from 'ejs';
import express from 'express';

const here = dirname(fileURLToPath(import.meta.url));
const uiKit = join(here, '../ui-kit');

export const createApp = ({ hydrate = join(uiKit, 'dist/hydrate/index.js'), renderOptions, onDiagnostic, cache, views = join(here, 'views') } = {}) => {
  const app = express();
  app.disable('x-powered-by');
  app.set('views', views);
  if (cache !== undefined) app.set('view cache', cache); // Express turns it on in production by itself
  app.engine('ejs', stencilEngine({ hydrate, engine: ejs.renderFile, renderOptions, onDiagnostic }));
  app.engine('html', stencilEngine({ hydrate, renderOptions, onDiagnostic }));
  app.set('view engine', 'ejs');
  // The client bundle that hydrates what the server rendered.
  app.use('/client', express.static(join(uiKit, 'dist/hydrate-client')));

  app.get('/', (_req, res) => res.render('home', { user: 'Ada <ada@example.com>', open: 42, tasks: ['Write', 'Ship'] }));
  app.get('/about', (_req, res) => res.render('about.html'));
  // One view opting out of the declarative shadow DOM: `stencil` is the per-render override.
  app.get('/scoped', (_req, res) => res.render('home', { user: 'Grace', open: 7, tasks: [], stencil: { serializeShadowRoot: 'scoped' } }));
  app.get('/fragment', (_req, res) => res.render('fragment'));
  app.get('/broken', (_req, res) => res.render('broken'));
  app.use((err, _req, res, _next) => res.status(500).type('text').send(`render failed: ${err.message}`));
  return app;
};
