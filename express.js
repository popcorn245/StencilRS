// An Express view engine that server-renders Stencil components.
//
//   import { stencilEngine } from '@popcorn245/stencilrs/express';
//   import * as hydrate from './dist/hydrate/index.js';
//   import ejs from 'ejs';
//
//   app.engine('ejs', stencilEngine({ hydrate, engine: ejs.renderFile }));
//   app.set('view engine', 'ejs');
//   app.get('/', (req, res) => res.render('home', { user }));
//
// Two steps per render: the inner engine (EJS, Handlebars, Pug, ...) fills the template's locals
// in, as it would without stencilrs; then the hydrate app's `renderToString` renders the
// components in that HTML. Without an inner engine the view file is the HTML. There is no template
// syntax of our own, and this module never imports Express or a template engine: the caller hands
// them in, so neither becomes a dependency of the package.
//
// `hydrate` is anything with `renderToString(html, options)`: a hydrate app built by stencilrs
// (`componentExport: 'ssr'`) or by Stencil's own `ssr` output target.
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** A view that opens with a doctype or `<html>` is a document; anything else is rendered as a fragment. */
const isDocument = (html) => /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\b|html[\s>])/i.test(html);

const loadHydrate = async (hydrate) => {
  let app = await hydrate;
  if (typeof app === 'string' || app instanceof URL) {
    const href = app instanceof URL ? app.href : isAbsolute(app) ? pathToFileURL(app).href : pathToFileURL(resolve(app)).href;
    app = await import(href);
  }
  // A CommonJS hydrate app arrives as `{ default: { renderToString } }`.
  const renderToString = app?.renderToString ?? app?.default?.renderToString;
  if (typeof renderToString !== 'function') throw new TypeError('stencilEngine: `hydrate` has no renderToString (expected a hydrate app module, or a path to one)');
  return renderToString;
};

/**
 * @param {object} config
 * @param config.hydrate a hydrate app module, a path or URL to one, or a promise of either
 * @param [config.engine] a `(path, locals, callback)` engine (`ejs.renderFile`, a consolidate engine, ...); omitted, views are plain HTML
 * @param [config.renderOptions] `renderToString` options for every render; a view overrides them through the `stencil` local
 * @param [config.onDiagnostic] called once per unique warning (default: `console.warn`)
 * @returns an Express engine: `app.engine('ext', stencilEngine({ ... }))`
 */
export const stencilEngine = ({ hydrate, engine, renderOptions = {}, onDiagnostic } = {}) => {
  if (hydrate == null) throw new TypeError('stencilEngine: `hydrate` is required');
  if (engine != null && typeof engine !== 'function') throw new TypeError('stencilEngine: `engine` must be a (path, locals, callback) function');
  let renderer; // loaded on the first render, so a path to a build that does not exist yet still lets the app start
  const files = new Map(); // plain-HTML views, kept while `view cache` is on
  const warned = new Set();
  const warn = onDiagnostic ?? ((d) => console.warn(`[stencilrs] ${d.messageText}`));

  const read = async (path, cache) => {
    if (cache && files.has(path)) return files.get(path);
    const html = await readFile(path, 'utf8');
    if (cache) files.set(path, html);
    return html;
  };
  const fill = (path, locals) =>
    new Promise((ok, fail) => engine(path, locals, (err, html) => (err ? fail(err) : ok(String(html)))));

  const render = async (path, locals) => {
    const renderToString = await (renderer ??= loadHydrate(hydrate).catch((e) => ((renderer = undefined), Promise.reject(e))));
    const html = engine ? await fill(path, locals) : await read(path, locals.cache);
    const options = { ...renderOptions, ...locals.stencil };
    options.fullDocument ??= isDocument(html);
    const result = await renderToString(html, options);
    const errors = [];
    for (const d of result.diagnostics ?? []) {
      if (d.level === 'error') errors.push(d);
      else if (!warned.has(`${d.level}:${d.messageText}`)) {
        warned.add(`${d.level}:${d.messageText}`);
        warn(d);
      }
    }
    if (errors.length) {
      const err = new Error(`Stencil render of ${path} failed: ${errors.map((d) => d.messageText).join('; ')}`);
      err.diagnostics = errors;
      throw err;
    }
    return result.html;
  };

  return (path, options, callback) => {
    // A promise chain, not an async function: Express's callback must be called once, and a throw inside it must not re-enter the catch.
    render(path, options ?? {}).then((html) => callback(null, html), (err) => callback(err));
  };
};
