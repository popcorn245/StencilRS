// An opt-in render cache for `renderToString`: the same HTML and options give the same page, so the second request
// costs a hash and a map lookup instead of a render.
//
//   import { createRenderCache } from '@popcorn245/stencilrs/ssr';
//   const render = createRenderCache(renderToString, { max: 200, maxBytes: 64 * 2 ** 20, ttl: 60_000 });
//   const { html } = await render('<my-page></my-page>', { fullDocument: true });
//
// Correct only when the page is a pure function of the HTML and options it is given (no clock, no random, no
// per-request state read inside a component). Nothing here knows about that: the caller opts in.
//
// The key is a SHA-256 of the HTML plus the options (their keys sorted, so order does not matter). Options that cannot
// be serialized to JSON (a function, a cycle) make that one render uncacheable: it runs and is not stored. A render that
// throws, or whose diagnostics hold an `error`, is never stored. Concurrent identical misses share one render.
// Bounded by entries (`max`) and total size (`maxBytes`, the UTF-8 size of the pages); least recently used goes first.
import { createHash } from 'node:crypto';

export const RENDER_CACHE_DEFAULTS = { max: 500, maxBytes: 64 * 1024 * 1024, ttl: 0 };

const sortKeys = (_k, v) => {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = v[k];
    return out;
  }
  if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') throw new TypeError('uncacheable');
  return v;
};

/** The cache key of one render, or null when the options cannot be serialized. */
export const renderCacheKey = (html, options) => {
  let opts;
  try {
    opts = JSON.stringify(options ?? {}, sortKeys);
  } catch {
    return null;
  }
  return createHash('sha256').update(opts).update('\0').update(html).digest('base64');
};

const hasError = (result) => (result?.diagnostics ?? []).some((d) => d.level === 'error');

/**
 * @param {(html: string, options?: object) => Promise<{ html: string, diagnostics?: object[] }>} renderToString
 * @param {true | { max?: number, maxBytes?: number, ttl?: number }} [config] `true` is the defaults. `ttl` is in ms, 0 for none
 * @returns `render(html, options, { cache: false, ttl }?)` (`ttl` in ms replaces the configured one for this lookup: an entry older than it is a miss and is rendered again) with the same result as `renderToString`, plus `clear()` and `stats()`
 */
export const createRenderCache = (renderToString, config = true) => {
  if (typeof renderToString !== 'function') throw new TypeError('createRenderCache: `renderToString` must be a function');
  const o = { ...RENDER_CACHE_DEFAULTS, ...(config === true ? {} : config) };
  for (const k of ['max', 'maxBytes', 'ttl']) if (!Number.isFinite(o[k]) || o[k] < 0) throw new TypeError(`renderCache: \`${k}\` must be a non-negative number`);
  const entries = new Map(); // key -> { result, bytes, at }; insertion order is recency
  const inflight = new Map();
  let bytes = 0;
  const stats = { hits: 0, misses: 0, evictions: 0, bypassed: 0 };

  const drop = (key) => {
    const e = entries.get(key);
    if (e) bytes -= e.bytes;
    entries.delete(key);
  };
  const store = (key, result) => {
    const size = Buffer.byteLength(result.html);
    if (o.max === 0 || size > o.maxBytes) return; // a page bigger than the whole budget would only flush the rest
    drop(key);
    entries.set(key, { result, bytes: size, at: Date.now() });
    bytes += size;
    while (entries.size > o.max || bytes > o.maxBytes) {
      drop(entries.keys().next().value);
      stats.evictions++;
    }
  };
  // What a caller gets is a copy: mutating `diagnostics` of one response does not change the next.
  const give = (r) => ({ ...r, diagnostics: r.diagnostics?.map((d) => ({ ...d })) });

  const render = (html, options, { cache = true, ttl = o.ttl } = {}) => {
    if (!cache) {
      stats.bypassed++;
      return renderToString(html, options);
    }
    const key = renderCacheKey(html, options);
    if (key === null) {
      stats.bypassed++;
      return renderToString(html, options);
    }
    const hit = entries.get(key);
    if (hit) {
      if (ttl > 0 && Date.now() - hit.at >= ttl) drop(key);
      else {
        entries.delete(key); // re-insert: most recent last
        entries.set(key, hit);
        stats.hits++;
        return Promise.resolve(give(hit.result));
      }
    }
    let pending = inflight.get(key);
    if (!pending) {
      stats.misses++;
      pending = Promise.resolve(renderToString(html, options)).then(
        (result) => {
          inflight.delete(key);
          if (result && typeof result.html === 'string' && !hasError(result)) store(key, give(result));
          return result;
        },
        (err) => {
          inflight.delete(key);
          throw err;
        }
      );
      inflight.set(key, pending);
    }
    return pending.then(give);
  };
  render.clear = () => {
    entries.clear();
    bytes = 0;
  };
  render.stats = () => ({ ...stats, entries: entries.size, bytes });
  return render;
};
