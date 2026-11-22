// Loading a hydrate app, shared by express.js (in-process renders) and express-worker.js (pool threads).
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The `file:` URL of a hydrate app given as a path or URL; undefined for anything else (a module object, a promise). */
export const hydrateHref = (app) =>
  app instanceof URL ? app.href : typeof app === 'string' ? pathToFileURL(isAbsolute(app) ? app : resolve(app)).href : undefined;

/** The `renderToString` of a hydrate app module, or a TypeError. */
export const pickRenderToString = (app) => {
  // A CommonJS hydrate app arrives as `{ default: { renderToString } }`.
  const renderToString = app?.renderToString ?? app?.default?.renderToString;
  if (typeof renderToString !== 'function') throw new TypeError('stencilEngine: `hydrate` has no renderToString (expected a hydrate app module, or a path to one)');
  return renderToString;
};
