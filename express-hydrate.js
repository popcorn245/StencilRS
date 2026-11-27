// Loading a hydrate app, shared by express.js (in-process renders) and express-worker.js (pool threads).
import { enableCompileCache as enable } from 'node:module';
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

/**
 * Node's on-disk compile cache (`module.enableCompileCache`, Node 22.1+) for every module loaded after this call: the hydrate
 * app is ~2 MB of JavaScript and the cache replaces most of its parse and compile. A no-op on a Node without it, with
 * `false`, or when `NODE_DISABLE_COMPILE_CACHE` is set (Node's own switch). `dir` is the cache directory (default:
 * Node's, under the OS temp dir). Never throws: a read-only disk just means no cache.
 */
export const enableCompileCache = (option = true) => {
  if (option === false || typeof enable !== 'function') return;
  try {
    if (typeof option === 'string') enable(option);
    else enable();
  } catch {
    // no cache: slower start, nothing else
  }
};

/**
 * The part of a `renderToString` result a fragment render hands back, as plain data (it crosses to a worker thread by structured clone,
 * so in-process and pooled renders return the same shape): the html, the `<style>` blocks of the render's head (`styles`), the components
 * it hydrated (`components`: `{ tag, mode, count, depth }`), their number (`hydratedCount`) and the diagnostics.
 */
export const fragmentResult = (result) => ({
  html: result.html,
  styles: (result.styles ?? []).map((s) => ({ ...s })),
  components: (result.components ?? []).map((c) => ({ ...c })),
  hydratedCount: result.hydratedCount ?? 0,
  diagnostics: result.diagnostics ?? [],
});
