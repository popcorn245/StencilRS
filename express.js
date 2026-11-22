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
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

import { enableCompileCache, hydrateHref, pickRenderToString, warmupHtml } from './express-hydrate.js';

/** A view that opens with a doctype or `<html>` is a document; anything else is rendered as a fragment. */
const isDocument = (html) => /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\b|html[\s>])/i.test(html);

const loadHydrate = async (hydrate) => {
  const app = await hydrate;
  const href = hydrateHref(app);
  const mod = href ? await import(href) : app;
  return { renderToString: pickRenderToString(mod), html: () => warmupHtml(mod) };
};

const workerFile = new URL('./express-worker.js', import.meta.url);

/**
 * A fixed pool of render threads. Each loads the hydrate app once; a render is one message in, one message out.
 * A crashed or timed-out thread fails only the render it held and is replaced. `ready` resolves when every thread has
 * loaded the app and run the warm-up (rejects if one cannot load it: the pool is then broken and every render fails with that
 * error, no restart loop; a failed warm-up rejects `ready` too but leaves the thread in service).
 * `warm` is a promise of the warm-up renders (`[{ html, options } | { tags: true, options }]`), or null for none.
 */
const createPool = ({ href, size, maxQueue, timeout, compileCache, warm }) => {
  const queue = [];
  const slots = new Set();
  let nextId = 0;
  let closed = null; // an Error once close() ran
  let broken = null; // the init error of a thread that could not load the app

  const fail = (job, err) => {
    clearTimeout(job.timer);
    job.reject(err);
  };
  const retire = (slot, err) => {
    slots.delete(slot);
    slot.worker.removeAllListeners();
    slot.worker.terminate();
    if (slot.job) fail(slot.job, err);
    slot.job = null;
  };
  const dispatch = () => {
    if (broken) for (const job of queue.splice(0)) fail(job, broken);
    for (const slot of slots) {
      if (!slot.ready || slot.job || !queue.length) continue;
      const job = queue.shift();
      slot.job = job;
      try {
        slot.worker.postMessage({ id: job.id, html: job.html, options: job.options });
      } catch (e) {
        // renderOptions that cannot be structured-cloned (a function, ...): this render fails, the thread is fine.
        slot.job = null;
        fail(job, new TypeError(`stencilEngine: render options must be cloneable to reach a worker (${e.message})`));
        continue;
      }
      if (timeout > 0)
        job.timer = setTimeout(() => {
          retire(slot, Object.assign(new Error(`stencilEngine: render timed out after ${timeout} ms`), { code: 'ESTENCIL_TIMEOUT' }));
          spawn();
        }, timeout);
    }
  };

  const spawn = () => {
    if (closed || broken) return;
    const worker = new Worker(workerFile, { workerData: { hydrate: href, compileCache } });
    worker.unref(); // idle threads must not keep the process alive
    const slot = { worker, ready: false, job: null };
    slots.add(slot);
    const settled = new Promise((ok, fail) => {
      slot.ok = ok;
      slot.fail = fail;
    });
    settled.catch(() => {}); // `ready` reports it; an unobserved rejection must not crash the server
    slot.settled = settled;
    const markReady = (warmError) => {
      slot.ready = true;
      if (warmError) slot.fail(Object.assign(new Error(`stencilEngine: warm-up failed: ${warmError.message}`), { stack: warmError.stack }));
      else slot.ok();
      dispatch();
    };
    worker.on('message', (m) => {
      if (m.loaded) {
        // The warm-up inputs may still be resolving (view files, the inner engine): the thread waits for them.
        if (!warm) return markReady();
        warm.then(
          (items) => {
            try {
              worker.postMessage({ warm: items });
            } catch (e) {
              markReady(e); // options that cannot be cloned
            }
          },
          (e) => markReady(e)
        );
      } else if (m.ready) {
        markReady(m.warmError);
      } else if (m.initError) {
        const err = Object.assign(new Error(m.initError.message), { stack: m.initError.stack });
        broken = err;
        slot.fail(err);
        retire(slot, err);
        dispatch();
      } else {
        const job = slot.job;
        if (!job || job.id !== m.id) return;
        slot.job = null;
        clearTimeout(job.timer);
        if (m.error) job.reject(Object.assign(new Error(m.error.message), { stack: m.error.stack }));
        else job.resolve({ html: m.html, diagnostics: m.diagnostics });
        dispatch();
      }
    });
    const died = (err) => {
      if (closed || !slots.has(slot)) return;
      const crash = Object.assign(new Error(`stencilEngine: render worker crashed (${err?.message ?? 'exit'})`), { code: 'ESTENCIL_WORKER_CRASH' });
      if (!slot.ready) {
        broken = crash; // died while loading: replacing it would loop
        slot.fail(crash);
      }
      retire(slot, crash);
      spawn();
      dispatch();
    };
    worker.on('error', died);
    worker.on('exit', () => died());
  };
  for (let i = 0; i < size; i++) spawn();
  const settledAll = () => Promise.all([...slots].map((s) => s.settled));

  return {
    ready: settledAll().then(() => {}),
    render: (html, options) =>
      new Promise((resolve, reject) => {
        if (closed) return reject(closed);
        if (broken) return reject(broken);
        if (queue.length >= maxQueue) return reject(Object.assign(new Error(`stencilEngine: render queue is full (${maxQueue} waiting)`), { code: 'ESTENCIL_QUEUE_FULL' }));
        queue.push({ id: nextId++, html, options, resolve, reject, timer: null });
        dispatch();
      }),
    close: async () => {
      closed = Object.assign(new Error('stencilEngine: closed'), { code: 'ESTENCIL_CLOSED' });
      for (const job of queue.splice(0)) fail(job, closed);
      const all = [...slots];
      for (const slot of all) if (slot.job) fail(slot.job, closed);
      slots.clear();
      await Promise.all(all.map((s) => (s.worker.removeAllListeners(), s.worker.terminate())));
    },
  };
};

/**
 * @param {object} config
 * @param config.hydrate a hydrate app module, a path or URL to one, or a promise of either
 * @param [config.engine] a `(path, locals, callback)` engine (`ejs.renderFile`, a consolidate engine, ...); omitted, views are plain HTML
 * @param [config.renderOptions] `renderToString` options for every render; a view overrides them through the `stencil` local
 * @param [config.onDiagnostic] called once per unique warning (default: `console.warn`)
 * @param [config.workers] render on a pool of this many `worker_threads` (`'auto'`: available parallelism minus one); 0 or omitted renders in-process. `hydrate` must then be a path or URL
 * @param [config.maxQueue] renders that may wait for a free worker (default 100); one more fails with code `ESTENCIL_QUEUE_FULL`
 * @param [config.compileCache] Node's compile cache (`module.enableCompileCache`) for the hydrate app, here and in each worker: `true` (default; a no-op on a Node without it), `false` to opt out, or a directory for the cache
 * @param [config.warmup] render at startup so the first request is not JIT-cold: `true` renders one document holding every tag the hydrate app registers (its `tags` export, which stencilrs' `buildHydrate` writes; without it an empty page), or a list of views (paths, run through the inner engine with no locals) and HTML strings (starting with `<`). In-process and on every worker; `ready` resolves after it
 * @param [config.renderTimeout] ms a pooled render may take (default 30000, 0 = no limit); past it the worker is replaced and the render fails with `ESTENCIL_TIMEOUT`
 * @returns an Express engine: `app.engine('ext', stencilEngine({ ... }))`, with `ready` (a promise: the app is loaded and warmed up; resolves at once without `warmup` or a pool; rejects when the app cannot load or a warm-up render fails, the engine stays usable after a failed warm-up) and `close()` (stops the workers)
 */
export const stencilEngine = ({ hydrate, engine, renderOptions = {}, onDiagnostic, workers = 0, maxQueue = 100, renderTimeout = 30_000, compileCache = true, warmup = false } = {}) => {
  if (hydrate == null) throw new TypeError('stencilEngine: `hydrate` is required');
  const size = workers === 'auto' ? Math.max(1, availableParallelism() - 1) : workers;
  if (!Number.isInteger(size) || size < 0) throw new TypeError("stencilEngine: `workers` must be a non-negative integer or 'auto'");
  if (!(warmup === false || warmup === true || (Array.isArray(warmup) && warmup.every((w) => typeof w === 'string')))) throw new TypeError('stencilEngine: `warmup` must be true or an array of view paths and HTML strings');
  if (!(typeof compileCache === 'boolean' || typeof compileCache === 'string')) throw new TypeError('stencilEngine: `compileCache` must be a boolean or a directory');
  // Before the hydrate app is imported (here or by a worker): the cache serves modules loaded after the call.
  enableCompileCache(compileCache);
  let pool = null;
  const warming = warmup !== false;
  let warmItems = null; // a promise of the warm-up renders: `{ html, options }`, or `{ tags: true, options }`
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

  const load = () => (renderer ??= loadHydrate(hydrate).catch((e) => ((renderer = undefined), Promise.reject(e))));

  // The warm-up renders, resolved on this thread (the views and the inner engine are here): a worker gets them as messages.
  function resolveWarmup() {
    return Promise.all(
      (warmup === true ? [true] : warmup).map(async (w) => {
        const options = { ...renderOptions };
        if (w === true) return { tags: true, options: { ...options, fullDocument: true } };
        const html = /^\s*</.test(w) ? w : engine ? await fill(w, {}) : await readFile(w, 'utf8');
        options.fullDocument ??= isDocument(html);
        return { html, options };
      })
    );
  }

  // Last of the setup: it starts the threads, which need the warm-up inputs above.
  if (size > 0) {
    // A module object, a function or a promise cannot be sent to another thread: the worker imports the app itself.
    const href = hydrateHref(hydrate);
    if (!href) throw new TypeError('stencilEngine: with `workers`, `hydrate` must be a path or URL to the hydrate app (a module object cannot cross to a worker thread)');
    pool = createPool({ href, size, maxQueue, timeout: renderTimeout, compileCache, warm: warming ? (warmItems = resolveWarmup()) : null });
    warmItems?.catch(() => {}); // the threads report it through `ready`, once they ask for it
  }

  // In-process: load the app, then render them.
  const warmInProcess = async () => {
    const { renderToString, html: tagsHtml } = await load();
    for (const w of await (warmItems ??= resolveWarmup())) {
      // Diagnostics are not looked at: a bare tag with no parent or props makes some components log errors (`<ion-refresher> must be used inside ion-content`), which is not a failed warm-up. A throw is.
      await renderToString(w.tags ? tagsHtml() : w.html, w.options);
    }
  };

  const render = async (path, locals) => {
    const renderToString = pool ? null : (await load()).renderToString;
    const html = engine ? await fill(path, locals) : await read(path, locals.cache);
    const options = { ...renderOptions, ...locals.stencil };
    options.fullDocument ??= isDocument(html);
    const result = await (pool ? pool.render(html, options) : renderToString(html, options));
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

  const express = (path, options, callback) => {
    // A promise chain, not an async function: Express's callback must be called once, and a throw inside it must not re-enter the catch.
    render(path, options ?? {}).then((html) => callback(null, html), (err) => callback(err));
  };
  express.ready = pool ? pool.ready : warming ? warmInProcess() : Promise.resolve();
  express.ready.catch(() => {}); // `ready` reports it; an unobserved rejection must not crash the server
  express.close = async () => void (await pool?.close());
  return express;
};
