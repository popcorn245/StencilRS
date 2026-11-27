// The streaming responder of stencilEngine's islands (#192): `engine.stream(path, locals, options)`, an async iterable of the page's
// html in the pieces a socket should get, and `streamView(engine, view, locals, options)`, the Express handler that writes them.
//
//   in-order        the early head (if any), then the shell up to the first island at once, then each island plus the shell text up to
//                   the next one, the moment it is next in line. An island that is ready when the one before it is written goes in the
//                   same chunk (one flush for both).
//   out-of-order    the whole shell at once with an empty anchor (`<template>`) where each island goes, then each island the moment
//                   it has rendered, in `<div hidden>` (declarative shadow DOM does not parse inside `<template>`) followed by a
//                   one-line script that moves its nodes in front of the anchor. One inline swap function for the page.
//
// Each yielded chunk is one flush: the policy is a flush per island, not per write. An island that fails after bytes have gone out is
// replaced by a fallback and logged; a client that goes away cancels the renders that have not started. Nothing here renders: the
// engine hands in `start`, which returns the island page (or, for a view without islands, its html).
import { isAbsolute } from 'node:path';
import { constants, createGzip } from 'node:zlib';

import { createDeduper } from './express-islands.js';
import { insertBeforeBodyEnd } from './islands-manifest.js';

export const STREAM_MODES = ['in-order', 'out-of-order'];

const NONCE = /^[A-Za-z0-9+/_=-]+$/;
const attrEscape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The `nonce="..."` attribute for the page's inline script and style (a CSP nonce), or ''. A nonce is injected into markup: only base64 and base64url characters are accepted. */
export const nonceAttr = (nonce) => {
  if (nonce == null || nonce === '') return '';
  if (typeof nonce !== 'string' || !NONCE.test(nonce)) throw new TypeError('stencilEngine: a CSP `nonce` must be a base64 or base64url string');
  return ` nonce="${nonce}"`;
};

// The swap: anchors are `<template id="s-isl-N">`, an island's container is `<div hidden id="s-isl-c-N">`. Nothing the swap adds stays in the
// document (the scripts and the noscript remove themselves), so the DOM after the last island is the DOM of the whole page. When the last
// island has moved, `stencil-islands` fires on the document (a client that wants every island in place before it hydrates waits for it).
const swapScript = (count, nonce) =>
  `<script${nonce}>function $ISL(i){var a=document.getElementById("s-isl-"+i),h=document.getElementById("s-isl-c-"+i),p=a.parentNode,s=document.currentScript;while(h.firstChild)p.insertBefore(h.firstChild,a);a.remove();h.remove();s&&s.remove();if(!--$ISL.n){a=document.getElementById("s-isl-ns");a&&a.remove();document.dispatchEvent(new Event("stencil-islands"))}}$ISL.n=${count};document.currentScript.remove()</script>`;
// Without JavaScript the containers stay `hidden` and the page would have no islands: show them (after the shell, where they were written).
const noscriptReveal = (nonce) => `<noscript id="s-isl-ns"><style${nonce}>[id^="s-isl-c-"]{display:block!important}</style></noscript>`;

const defaultFallback = (name) => `<div data-island="${attrEscape(name)}" data-client="none" data-island-error hidden></div>`;
const defaultOnError = (err, { view, island }) => console.error(`[stencilrs] ${view}: ${island ? `island ${JSON.stringify(island)}` : 'the page'} failed after the response had started: ${err?.stack ?? err}`);

const aborted = Symbol('aborted');

/**
 * The page as an async iterable of html chunks.
 *
 * @param o.view the view's name, for logs
 * @param o.start `(signal) => Promise<{ page } | { html }>`: the island page of the view (renders started, `signal` cancels the ones still queued), or the whole html of a view without islands
 * @param [o.mode] `'in-order'` (default) or `'out-of-order'`
 * @param [o.nonce] a CSP nonce for the inline script and style of the out-of-order mode
 * @param [o.signal] an `AbortSignal`: when it aborts, the iteration ends and renders that have not started are cancelled. Breaking out of the loop does the same
 * @param [o.fallback] `(name, err) => html` for an island that failed (default: an empty hidden `<div data-island data-island-error>`)
 * @param [o.onError] `(err, { view, island }) => void` called for each failure after the response has started (default: `console.error`)
 * @param [o.coalesce] in-order: put islands that are ready at once in one chunk (default `true`)
 */
export const streamPage = ({ view, start, mode = 'in-order', nonce, signal: outer, fallback, onError, coalesce = true }) => {
  if (!STREAM_MODES.includes(mode)) throw new TypeError(`stencilEngine: stream mode must be one of ${STREAM_MODES.join(', ')}, not ${JSON.stringify(mode)}`);
  const nonceText = nonceAttr(typeof nonce === 'function' ? nonce() : nonce);
  return run({ view, start, mode, nonceText, outer, fallback: fallback ?? defaultFallback, onError: onError ?? defaultOnError, coalesce });
};

async function* run({ view, start, mode, nonceText, outer, fallback, onError, coalesce }) {
  const ctl = new AbortController();
  const relay = () => ctl.abort(outer.reason);
  if (outer?.aborted) ctl.abort(outer.reason);
  else outer?.addEventListener('abort', relay, { once: true });
  const gone = new Promise((ok) => (ctl.signal.aborted ? ok(aborted) : ctl.signal.addEventListener('abort', () => ok(aborted), { once: true })));
  const wait = (p) => Promise.race([p, gone]);
  // An island's replacement html and the log line. A throwing `fallback` must not take the page down with it.
  const replace = (name, err) => {
    try {
      onError(err, { view, island: name });
    } catch {}
    try {
      const html = fallback(name, err);
      return typeof html === 'string' ? html : defaultFallback(name);
    } catch {
      return defaultFallback(name);
    }
  };
  // The client boot of `islands.client` (''): written before `</body>` in the chunk that closes the page, once every island has settled.
  const boot = async (page) => {
    try {
      return (await page.bootTag?.()) ?? '';
    } catch (err) {
      try {
        onError(err, { view, island: null });
      } catch {}
      return '';
    }
  };
  try {
    const started = await wait(start(ctl.signal));
    if (started === aborted) return;
    if (started.page == null) {
      yield started.html;
      return;
    }
    const { pieces } = started.page;
    if (pieces.head) {
      const head = await wait(pieces.head);
      if (head === aborted) return;
      yield head;
    }
    const cut = await wait(pieces.cut());
    if (cut === aborted) return;
    const { result, order, segments } = cut;
    const early = Boolean(pieces.head);
    const fresh = createDeduper(early ? [] : result.styles);
    const styled = (isl) => (pieces.document ? fresh(isl.styles) : '');

    // The settled islands, so that one that is ready when its turn comes can share a chunk (in order), or be told apart from a failed one.
    const done = new Map();
    for (const slot of order) {
      pieces.part(slot).then(
        (isl) => done.set(slot, { isl }),
        (err) => done.set(slot, { err })
      );
    }
    const outcome = async (slot) => {
      if (!done.has(slot)) {
        const r = await wait(pieces.part(slot).then(
          (isl) => ({ isl }),
          (err) => ({ err })
        ));
        if (r === aborted) return aborted;
        return r;
      }
      return done.get(slot);
    };
    const island = (slot, r) => {
      if (r.err) return replace(started.page.islands[slot].name, r.err);
      return r.isl;
    };

    if (mode === 'in-order') {
      let first = (early && pieces.document ? fresh(result.styles) : '') + segments[0];
      if (!order.length) {
        const tag = await wait(boot(started.page));
        if (tag === aborted) return;
        if (tag) first = insertBeforeBodyEnd(first, tag);
      }
      yield first;
      for (let k = 0; k < order.length; k++) {
        let chunk = '';
        let r = await outcome(order[k]);
        if (r === aborted) return;
        for (;;) {
          const got = island(order[k], r);
          chunk += (typeof got === 'string' ? got : styled(got) + got.html) + segments[k + 1];
          if (!coalesce || k + 1 >= order.length || !done.has(order[k + 1])) break;
          k++;
          r = done.get(order[k]);
        }
        if (k === order.length - 1) {
          const tag = await wait(boot(started.page));
          if (tag === aborted) return;
          if (tag) chunk = insertBeforeBodyEnd(chunk, tag);
        }
        yield chunk;
      }
      return;
    }

    // Out of order: the shell with anchors, then the islands as they finish.
    const last = segments[segments.length - 1];
    const tailAt = last.lastIndexOf('</body>');
    const tail = tailAt < 0 ? '' : last.slice(tailAt);
    segments[segments.length - 1] = tailAt < 0 ? last : last.slice(0, tailAt);
    let shell = early && pieces.document ? fresh(result.styles) : '';
    for (let k = 0; k < segments.length; k++) shell += segments[k] + (k < order.length ? `<template id="s-isl-${k}"></template>` : '');
    yield shell + (order.length ? noscriptReveal(nonceText) + swapScript(order.length, nonceText) : '');
    const pending = new Map(order.map((slot, k) => [k, outcome(slot).then((r) => [k, r])]));
    while (pending.size) {
      const [k, r] = await Promise.race([...pending.values(), gone.then(() => [-1, aborted])]);
      if (r === aborted) return;
      pending.delete(k);
      const got = island(order[k], r);
      yield `<div hidden id="s-isl-c-${k}">${typeof got === 'string' ? got : styled(got) + got.html}</div><script${nonceText}>$ISL(${k})</script>`;
    }
    const tag = await wait(boot(started.page));
    if (tag === aborted) return;
    yield tag ? insertBeforeBodyEnd(tail, tag) : tail;
  } catch (err) {
    if (ctl.signal.aborted) return; // the client left (or the loop broke off): whatever failed was a cancelled render
    throw err;
  } finally {
    outer?.removeEventListener('abort', relay);
    ctl.abort(); // renders still queued (the loop broke off, or an error ended it) are not wanted any more
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The Express handler.

/** The path of `view` the way `res.render` finds it: the app's `views` directory and `view engine`. */
const resolveView = (app, view) => {
  if (isAbsolute(view)) return view;
  const View = app.get('view');
  const found = new View(view, { defaultEngine: app.get('view engine'), root: app.get('views'), engines: app.engines });
  if (!found.path) {
    const dirs = Array.isArray(found.root) && found.root.length > 1 ? `directories "${found.root.slice(0, -1).join('", "')}" or "${found.root[found.root.length - 1]}"` : `directory "${found.root}"`;
    throw Object.assign(new Error(`Failed to lookup view "${view}" in views ${dirs}`), { view: found });
  }
  return found.path;
};

/**
 * An Express handler that streams a view:
 *
 *   app.get('/', streamView(engine, 'home', (req, res) => ({ user: req.user }), { mode: 'out-of-order', nonce: (req, res) => res.locals.cspNonce }));
 *
 * `locals` is an object or a function of `(req, res)` (merged over `app.locals` and `res.locals`, as `res.render` does). Options: `mode`,
 * `nonce` (a string, or a function of `(req, res)`), `fallback`, `onError`, `coalesce` as for `engine.stream`, and
 *   `compress`  `true` or `{ level }` to gzip here when the client accepts it, with a sync flush after every chunk (that is, per island).
 *               Off by default: behind `compression` or a proxy that compresses, leave it off (`res.flush()` is called after each chunk when it exists).
 *
 * A failure before the first byte goes to `next(err)`. After it the response is closed (a failed island has been replaced by its fallback;
 * a failed shell after an early head ends the page) and the error logged through `onError`. The client closing the connection aborts the render.
 */
export const streamView = (engine, view, locals = {}, options = {}) => {
  if (typeof engine?.stream !== 'function') throw new TypeError('streamView: `engine` must be a stencilEngine');
  const { compress = false, ...streamOptions } = options;
  if (!(compress === false || compress === true || (compress && typeof compress === 'object'))) throw new TypeError('streamView: `compress` must be true, false or { level }');
  return async (req, res, next) => {
    const ctl = new AbortController();
    const onClose = () => {
      if (!res.writableFinished) ctl.abort();
    };
    res.once('close', onClose);
    let it;
    let out = res;
    try {
      const app = req.app;
      const path = resolveView(app, view);
      const given = typeof locals === 'function' ? await locals(req, res) : locals;
      const merged = { ...app.locals, ...res.locals, ...given };
      merged.cache ??= app.enabled('view cache');
      const resolve = (v) => (typeof v === 'function' ? v(req, res) : v);
      it = engine.stream(path, merged, { ...streamOptions, nonce: resolve(streamOptions.nonce), signal: ctl.signal })[Symbol.asyncIterator]();
      let step = await it.next();
      if (step.done || ctl.signal.aborted) { if (!res.headersSent && !ctl.signal.aborted) res.statusCode = 204;
        return void res.end();
      }
      // The first chunk is in hand: the status line and headers go with it.
      if (!res.getHeader('content-type')) res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('x-accel-buffering', 'no'); // nginx: do not hold the response back
      let gz = null;
      if (compress && !res.getHeader('content-encoding') && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
        gz = createGzip({ level: compress.level, flush: constants.Z_SYNC_FLUSH });
        gz.pipe(res);
        out = gz;
        res.setHeader('content-encoding', 'gzip');
        res.removeHeader('content-length');
        if (res.vary) res.vary('Accept-Encoding');
        else if (!/accept-encoding/i.test(String(res.getHeader('vary') ?? ''))) res.setHeader('vary', [res.getHeader('vary'), 'Accept-Encoding'].filter(Boolean).join(', '));
      }
      const drain = (stream) => new Promise((ok) => (res.destroyed ? ok() : stream.once('drain', ok)));
      const write = async (chunk) => {
        if (!out.write(chunk)) await Promise.race([drain(out), new Promise((ok) => ctl.signal.addEventListener('abort', ok, { once: true }))]);
        if (gz) await Promise.race([new Promise((ok) => gz.flush(constants.Z_SYNC_FLUSH, ok)), new Promise((ok) => ctl.signal.addEventListener('abort', ok, { once: true }))]);
        else res.flush?.();
      };
      try {
        while (!step.done && !ctl.signal.aborted) {
          await write(step.value);
          step = await it.next();
        }
      } catch (err) {
        // After the first byte: log, and end the page instead of leaving the connection hanging.
        (streamOptions.onError ?? defaultOnError)(err, { view, island: null });
      }
      out.end();
    } catch (err) {
      if (!res.headersSent && !ctl.signal.aborted) next(err);
      else {
        (streamOptions.onError ?? defaultOnError)(err, { view, island: null });
        out.end();
      }
    } finally {
      res.off('close', onClose);
      ctl.abort();
      await it?.return?.().catch(() => {});
    }
  };
};
