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

import { enableCompileCache, fragmentResult, hydrateHref, pickRenderToString } from './express-hydrate.js';
import { createIslandPage, earlyHeadParts, IslandError, probedHtmlTag, splitIslands } from './express-islands.js';
import { STREAM_MODES, streamPage, streamView } from './express-stream.js';
import { createRenderCache } from './render-cache.js';

/** A view that opens with a doctype or `<html>` is a document; anything else is rendered as a fragment. */
const isDocument = (html) => /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\b|html[\s>])/i.test(html);

const loadHydrate = async (hydrate) => {
  const app = await hydrate;
  const href = hydrateHref(app);
  const mod = href ? await import(href) : app;
  return pickRenderToString(mod);
};

const SCOPED_ISLANDS = "stencilEngine: `islands` need serializeShadowRoot 'declarative-shadow-dom' (the default): islands are not supported with scoped rendering (`serializeShadowRoot: 'scoped'` or `false`), see docs/islands.md";
const isScoped = (options) => options.serializeShadowRoot === 'scoped' || options.serializeShadowRoot === false;

/** `islands: false | true | { idStride, earlyHead, cache, stream, fallback, onError }` with the defaults filled in, or null. `cache`: `false` or the island render cache's config (`true` = its defaults). */
const normalizeIslands = (islands) => {
  if (islands === false || islands == null) return null;
  const o = islands === true ? {} : islands;
  const KEYS = ['idStride', 'earlyHead', 'cache', 'stream', 'fallback', 'onError'];
  if (typeof o !== 'object') throw new TypeError(`stencilEngine: \`islands\` must be true, false or { ${KEYS.join(', ')} }`);
  for (const key of Object.keys(o)) if (!KEYS.includes(key)) throw new TypeError(`stencilEngine: unknown \`islands\` option \`${key}\` (expected ${KEYS.join(', ')})`);
  const { idStride = 1000, earlyHead = false, cache = true, stream = 'in-order', fallback, onError } = o;
  if (!(Number.isSafeInteger(idStride) && idStride >= 1)) throw new TypeError('stencilEngine: `islands.idStride` must be a positive integer');
  if (typeof earlyHead !== 'boolean') throw new TypeError('stencilEngine: `islands.earlyHead` must be a boolean');
  if (!(cache === false || cache === true || (cache && typeof cache === 'object'))) throw new TypeError('stencilEngine: `islands.cache` must be true, false or { max, maxBytes, ttl }');
  if (!STREAM_MODES.includes(stream)) throw new TypeError(`stencilEngine: \`islands.stream\` must be one of ${STREAM_MODES.join(', ')}`);
  for (const [key, fn] of [['fallback', fallback], ['onError', onError]]) if (fn !== undefined && typeof fn !== 'function') throw new TypeError(`stencilEngine: \`islands.${key}\` must be a function`);
  return { idStride, earlyHead, cache, stream, fallback, onError };
};

const abortError = (signal) => Object.assign(new Error('stencilEngine: render cancelled'), { name: 'AbortError', code: 'ABORT_ERR', cause: signal.reason });

const workerFile = new URL('./express-worker.js', import.meta.url);

/**
 * A fixed pool of render threads. Each loads the hydrate app once; a render is one message in, one message out.
 * A crashed or timed-out thread fails only the render it held and is replaced. `ready` resolves when every thread has
 * loaded the app and run the warm-up (rejects if one cannot load it: the pool is then broken and every render fails with that
 * error, no restart loop; a failed warm-up rejects `ready` too but leaves the thread in service).
 * `warm` is a promise of the warm-up renders (`[{ html, options }]`) and how many times to run them, or null for none.
 */
const createPool = ({ href, size, maxQueue, timeout, compileCache, warm, times }) => {
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
        slot.worker.postMessage({ id: job.id, html: job.html, options: job.options, fragment: job.fragment });
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
              worker.postMessage({ warm: items, times });
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
        else job.resolve(job.fragment ? { html: m.html, styles: m.styles, components: m.components, hydratedCount: m.hydratedCount, diagnostics: m.diagnostics } : { html: m.html, diagnostics: m.diagnostics });
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
    render: (html, options, fragment = false, signal) =>
      new Promise((resolve, reject) => {
        if (closed) return reject(closed);
        if (broken) return reject(broken);
        if (signal?.aborted) return reject(abortError(signal));
        if (queue.length >= maxQueue) return reject(Object.assign(new Error(`stencilEngine: render queue is full (${maxQueue} waiting)`), { code: 'ESTENCIL_QUEUE_FULL' }));
        const job = { id: nextId++, html, options, fragment, resolve, reject, timer: null };
        // A client that went away: a render still waiting for a thread is dropped. One a thread already has runs to its end (its result is not wanted).
        signal?.addEventListener(
          'abort',
          () => {
            const at = queue.indexOf(job);
            if (at >= 0) {
              queue.splice(at, 1);
              reject(abortError(signal));
            }
          },
          { once: true }
        );
        queue.push(job);
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
 * @param [config.warmup] render at startup so the first request is not JIT-cold: a list of views (paths, run through the inner engine with no locals) and HTML strings (starting with `<`), or `{ views, times }` to run the list `times` times (default 1; the JIT needs repeats). Shape them like real traffic. In-process and on every worker; `ready` resolves after it
 * @param [config.renderCache] opt-in cache of rendered pages, in the main thread before a worker is asked: `true` (defaults) or `{ max, maxBytes, ttl }`. Only for pages that are a pure function of the HTML and options; a view opts out with the `stencilCache: false` local
 * @param [config.islands] `true` or `{ idStride, earlyHead, cache }`: views may mark parts of themselves `<stencil-island name>`; each is rendered on its own (in parallel on the pool) and the page is assembled. A view with none renders as without this option. DSD only. `idStride` (default 1000) is how many hydration ids an island may use; `earlyHead` (default false) writes the view's head before the shell has rendered (a streaming responder's start, see `engine.renderIslands`); `cache` (default true) is the config of the per-island render cache, `{ max, maxBytes, ttl }` like `renderCache`, used by islands marked `cache` (`false` ignores the marks)
 * @param [config.renderTimeout] ms a pooled render may take (default 30000, 0 = no limit); past it the worker is replaced and the render fails with `ESTENCIL_TIMEOUT`
 * @returns an Express engine: `app.engine('ext', stencilEngine({ ... }))`, with `ready` (a promise: the app is loaded and warmed up; resolves at once without `warmup` or a pool; rejects when the app cannot load or a warm-up render fails, the engine stays usable after a failed warm-up) and `close()` (stops the workers)
 */
export const stencilEngine = ({ hydrate, engine, renderOptions = {}, onDiagnostic, workers = 0, maxQueue = 100, renderTimeout = 30_000, compileCache = true, warmup = false, renderCache = false, islands = false } = {}) => {
  if (hydrate == null) throw new TypeError('stencilEngine: `hydrate` is required');
  const size = workers === 'auto' ? Math.max(1, availableParallelism() - 1) : workers;
  if (!Number.isInteger(size) || size < 0) throw new TypeError("stencilEngine: `workers` must be a non-negative integer or 'auto'");
  if (warmup === true) throw new TypeError('stencilEngine: `warmup: true` is not supported: rendering every tag bare is not what a page looks like, and a component that fails without props can take the server down. Pass views or HTML shaped like your traffic: `warmup: [\'<my-page>...\', \'/path/to/view\']`');
  const warmViews = Array.isArray(warmup) ? warmup : warmup && typeof warmup === 'object' ? warmup.views : warmup === false ? [] : null;
  const warmTimes = warmup && typeof warmup === 'object' && !Array.isArray(warmup) ? warmup.times ?? 1 : 1;
  if (warmup !== false && !(Array.isArray(warmViews) && warmViews.every((w) => typeof w === 'string') && Number.isInteger(warmTimes) && warmTimes >= 1)) throw new TypeError('stencilEngine: `warmup` must be an array of view paths and HTML strings, or { views, times } with a whole `times` of at least 1');
  if (!(typeof compileCache === 'boolean' || typeof compileCache === 'string')) throw new TypeError('stencilEngine: `compileCache` must be a boolean or a directory');
  if (!(renderCache === false || renderCache === true || (renderCache && typeof renderCache === 'object'))) throw new TypeError('stencilEngine: `renderCache` must be true, false or { max, maxBytes, ttl }');
  const islandsConfig = normalizeIslands(islands);
  if (islandsConfig && isScoped(renderOptions)) throw new TypeError(SCOPED_ISLANDS);
  // Before the hydrate app is imported (here or by a worker): the cache serves modules loaded after the call.
  enableCompileCache(compileCache);
  let pool = null;
  const warming = warmup !== false;
  let warmItems = null; // a promise of the warm-up renders: `{ html, options }`
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
      warmViews.map(async (w) => {
        const options = { ...renderOptions };
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
    pool = createPool({ href, size, maxQueue, timeout: renderTimeout, compileCache, warm: warming ? (warmItems = resolveWarmup()) : null, times: warmTimes });
    warmItems?.catch(() => {}); // the threads report it through `ready`, once they ask for it
  }

  // In-process: load the app, then render them.
  const warmInProcess = async () => {
    const renderToString = await load();
    const items = await (warmItems ??= resolveWarmup());
    // Diagnostics are not looked at: a view that needs locals it does not get may log errors, which is not a failed warm-up. A throw is.
    for (let n = 0; n < warmTimes; n++) for (const w of items) await renderToString(w.html, w.options);
  };

  // One render of final HTML: on the pool, or here. The cache (if any) sits in front, so a hit costs no worker round-trip.
  const run = (html, options) => (pool ? pool.render(html, options) : load().then((renderToString) => renderToString(html, options)));
  const cached = renderCache ? createRenderCache(run, renderCache) : null;

  // One render of markup on its own, with the options as given: in-process or pooled, the whole result back.
  // `signal` (an AbortSignal): a render that has not started when it aborts is cancelled.
  const fragmentRender = async (html, options, signal) => {
    if (pool) return pool.render(html, options, true, signal);
    const renderToString = await load();
    if (signal?.aborted) throw abortError(signal);
    return fragmentResult(await renderToString(html, options));
  };

  // The per-island render cache, in front of the fragment render: an island marked `cache` is looked up by (its html, the render options with its `idBase`).
  // The shell is never cached, and nothing else goes through here. Separate from `renderCache` (whole pages), which island views bypass.
  const islandCache = islandsConfig && islandsConfig.cache !== false ? createRenderCache(fragmentRender, islandsConfig.cache) : null;

  // A fragment: markup rendered on its own, with options of its own (`idBase`, ...), and the whole of the result back, in-process or pooled.
  const renderFragment = async (html, options = {}) => {
    if (typeof html !== 'string') throw new TypeError('stencilEngine: renderFragment needs the HTML to render as a string');
    if (options == null || typeof options !== 'object') throw new TypeError('stencilEngine: renderFragment options must be an object');
    if (options.idBase !== undefined && !(Number.isSafeInteger(options.idBase) && options.idBase >= 0)) throw new TypeError('stencilEngine: `idBase` must be a non-negative integer');
    const merged = { ...renderOptions, ...options };
    merged.fullDocument ??= false; // a fragment is not a page: not inferred from the markup
    return fragmentRender(html, merged);
  };

  // The diagnostics of one render: warnings once each, errors fail it. `what` names the part of an island page that failed.
  const inspect = (path, diagnostics, what) => {
    const errors = [];
    for (const d of diagnostics ?? []) {
      if (d.level === 'error') errors.push(d);
      else if (!warned.has(`${d.level}:${d.messageText}`)) {
        warned.add(`${d.level}:${d.messageText}`);
        warn(d);
      }
    }
    if (errors.length) {
      const err = new Error(`Stencil render of ${path}${what ? ` (${what})` : ''} failed: ${errors.map((d) => d.messageText).join('; ')}`);
      err.diagnostics = errors;
      throw err;
    }
  };

  // The `<html>` tag Stencil writes for a document opening with `tag` and these options, from a render of an empty page: it does not depend on
  // the page, so a response can start with it before anything has rendered. One probe per tag and options (the build id, the mode, the
  // language are in them), kept; a probe that failed is not.
  const probes = new Map();
  const probe = (tag, options) => {
    let key;
    try {
      key = JSON.stringify([tag, { ...options, fullDocument: undefined, idBase: undefined }]);
    } catch {
      key = null; // options that are not plain data: no memo, a render each time
    }
    let tagged = key === null ? undefined : probes.get(key);
    if (!tagged) {
      tagged = fragmentRender(`${tag}<head></head><body></body></html>`, { ...options, fullDocument: true, idBase: 0 }).then((r) => probedHtmlTag(r.html));
      if (key !== null) {
        if (probes.size >= 32) probes.delete(probes.keys().next().value);
        probes.set(key, tagged);
        tagged.catch(() => probes.delete(key));
      }
    }
    return tagged;
  };

  // A view with islands, split and with every render started: the shell and the islands at once (on the pool they spread over the threads).
  const islandPage = (path, html, split, options, signal, useCache = true) => {
    if (isScoped(options)) throw new IslandError(`${path}: islands need serializeShadowRoot to be 'declarative-shadow-dom' (the default), not scoped mode (docs/islands.md)`);
    const { idStride: stride } = islandsConfig;
    if (!Number.isSafeInteger((split.islands.length + 1) * stride)) throw new IslandError(`${path}: ${split.islands.length} islands with an idStride of ${stride} overflow the hydration id range`);
    const document = options.fullDocument !== false && (options.fullDocument || isDocument(html));
    const base = { ...options, fullDocument: document };
    const early = islandsConfig.earlyHead && document ? earlyHeadParts(split.shell) : null;
    return createIslandPage({
      split,
      view: path,
      document,
      stride,
      shell: fragmentRender(split.shell, { ...base, idBase: 0 }, signal),
      parts: split.islands.map((isl, i) => {
        if (!isl.html.trim()) return null;
        const opts = { ...base, fullDocument: false, idBase: (i + 1) * stride }; // the idBase of the slot is in the cache key: a hit keeps the ids of the slot
        // `cache` marks an island as cacheable (`cache="0"` is not); `cache="60"` is its ttl in seconds, a bare `cache` uses the cache's own
        if (islandCache && useCache && (isl.cache === true || isl.cache > 0)) return islandCache(isl.html, opts, isl.cache === true ? {} : { ttl: isl.cache * 1000 });
        return fragmentRender(isl.html, opts, signal);
      }),
      earlyHead: early && probe(early.htmlTag, base).then((tag) => tag + early.rest),
      inspect: (label, result) => inspect(path, result.diagnostics, label),
    });
  };

  // The view as markup and the options of its render.
  const prepare = async (path, locals) => {
    const html = engine ? await fill(path, locals) : await read(path, locals.cache);
    const options = { ...renderOptions, ...locals.stencil };
    options.fullDocument ??= isDocument(html);
    return { html, options };
  };

  // The island page of a view, or null if the view has no islands (or the engine no `islands` option).
  const renderIslands = async (path, locals = {}, { signal } = {}) => {
    if (!islandsConfig) return null;
    const { html, options } = await prepare(path, locals);
    return islandsOf(path, html, options, signal, locals.stencilCache !== false);
  };
  const islandsOf = (path, html, options, signal, useCache = true) => {
    if (!/<stencil-island/i.test(html)) return null; // the common case: nothing to scan
    let split;
    try {
      split = splitIslands(html);
    } catch (e) {
      if (e instanceof IslandError) e.message = `${path}: ${e.message}`;
      throw e;
    }
    return split ? islandPage(path, html, split, options, signal, useCache) : null;
  };

  const render = async (path, locals) => {
    const { html, options } = await prepare(path, locals);
    if (islandsConfig) {
      const page = islandsOf(path, html, options, undefined, locals.stencilCache !== false);
      if (page) return page.html();
    }
    const result = await (cached ? cached(html, options, { cache: locals.stencilCache !== false }) : run(html, options));
    inspect(path, result.diagnostics);
    return result.html;
  };

  // The page as chunks to write (express-stream.js): a view with islands as they come, any other view whole, as one chunk.
  const stream = (path, locals = {}, options = {}) =>
    streamPage({
      ...options,
      view: path,
      mode: options.mode ?? islandsConfig?.stream,
      fallback: options.fallback ?? islandsConfig?.fallback,
      onError: options.onError ?? islandsConfig?.onError,
      start: async (signal) => {
        const { html, options: renderOptionsOfView } = await prepare(path, locals);
        const page = islandsConfig ? islandsOf(path, html, renderOptionsOfView, signal, locals.stencilCache !== false) : null;
        if (page) return { page };
        const result = await (cached ? cached(html, renderOptionsOfView, { cache: locals.stencilCache !== false }) : run(html, renderOptionsOfView));
        inspect(path, result.diagnostics);
        return { html: result.html };
      },
    });

  const express = (path, options, callback) => {
    // A promise chain, not an async function: Express's callback must be called once, and a throw inside it must not re-enter the catch.
    render(path, options ?? {}).then((html) => callback(null, html), (err) => callback(err));
  };
  // Early head: probe the `<html>` tag of the warm-up documents (or `<html lang="en">`) now, so the first request already has it. A failed probe is not
  // the engine's failure: the request that needs it probes again.
  const probeAtStartup = async () => {
    if (!islandsConfig?.earlyHead) return;
    const tags = new Set();
    for (const w of warmItems ? await warmItems.catch(() => []) : []) {
      const split = w.options.fullDocument ? splitIslands(w.html) : null;
      const parts = split && earlyHeadParts(split.shell);
      if (parts) tags.add(parts.htmlTag);
    }
    if (!tags.size) tags.add('<html lang="en">');
    await Promise.all([...tags].map((t) => probe(t, { ...renderOptions, fullDocument: true }).catch(() => {})));
  };
  const started = pool ? pool.ready : warming ? warmInProcess() : Promise.resolve();
  express.ready = islandsConfig?.earlyHead ? started.then(probeAtStartup) : started;
  express.ready.catch(() => {}); // `ready` reports it; an unobserved rejection must not crash the server
  express.renderFragment = renderFragment;
  express.renderIslands = renderIslands;
  express.stream = stream;
  express.renderCache = cached; // `.clear()` and `.stats()`, or null
  express.islandCache = islandCache; // the per-island cache: `.clear()` and `.stats()`, or null
  express.close = async () => void (await pool?.close());
  return express;
};

export { streamView };
