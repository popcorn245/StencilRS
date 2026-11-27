# Islands in the Express engine

`stencilEngine({ islands: {} })` (issue #191; background and measurements in [spike-islands.md](spike-islands.md)). A view marks parts of itself, the
engine renders the parts separately and in parallel, and puts the page back together. A view without markers is rendered exactly as it is
without the option (a test compares the bytes).

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><link rel="stylesheet" href="/ionic.css"></head>
<body>
<ion-app>
  <stencil-island name="header" client="load"><ion-header>...</ion-header></stencil-island>
  <ion-content>
    <stencil-island name="feed" client="visible" cache="60">...</stencil-island>
  </ion-content>
</ion-app>
</body></html>
```

```js
const engine = stencilEngine({ hydrate: './dist/hydrate/index.js', workers: 'auto', islands: { idStride: 1000, earlyHead: false } });
app.get('/', (req, res) => res.render('home', locals));              // one assembled response
app.get('/s', streamView(engine, 'home', locals));                     // the page as it renders (#192, below)
const page = await engine.renderIslands(viewPath, locals);            // the pieces: page.chunks(), page.html(), page.manifest()
```

## What happens to a view

1. **Scan** (tokenizer-aware: not inside `<script>`, `<style>`, `<textarea>`, `<title>` or comments). Nested islands, a missing or repeated `name`, an
   unknown attribute, a `client` that is not `load | idle | visible | static | none` and a marker that is not closed are errors (`err.code === 'ESTENCIL_ISLAND'`)
   with the view and the line. The marker has no output; `cache` is parsed (empty or seconds) and read by the island render cache (below).
2. **Split.** The shell is the view with each island's markup cut out; the islands are fragments (`fullDocument: false`). Shell and islands render at once, on the
   pool when there is one: the shell with `idBase: 0`, island `i` with `idBase: (i + 1) * idStride`, so their hydration ids cannot collide.
   A render that used more ids than the stride (or whose `hydratedCount` did) fails the page, naming the island: raise `idStride`.
3. **Placement check.** An island must not be a *direct* child of a component that is not a shadow host and has slots (Stencil annotates such a child for relocation, and an
   island's html carries no such mark; after hydration the content is lost). The engine sees the annotation on the rendered marker and fails with the island's name. Put the
   island inside a plain element or a shadow host, or make the whole component the island.
4. **Assembly.** Each island's top-level elements get `data-island="name" data-client="..."` (no wrapper element: it would break slots and `::slotted`). Component styles
   (`result.styles`) are written once per page: the shell's stay where Stencil put them, and the islands' new ones go into `<head>` after those. Shadow-DOM components
   carry their own `<style>` in their shadow roots, as in any DSD render. In a view that is not a document there is no head: no styles are written, as for any fragment render.

An island whose body is only whitespace renders nothing; one with no element at its top level (text only) is an error, as it cannot carry `data-island`.

## Caching islands

An island marked `cache` is rendered once and served from memory after (a hit costs a hash and a map lookup, no worker round trip):

```html
<stencil-island name="header" cache>...</stencil-island>        <!-- until evicted, or islands.cache.ttl -->
<stencil-island name="rates" cache="60">...</stencil-island>    <!-- 60 seconds -->
<stencil-island name="feed">...</stencil-island>                <!-- never cached; so is cache="0" -->
```

```js
stencilEngine({ ..., islands: { cache: { max: 200, maxBytes: 32 * 2 ** 20, ttl: 300_000 } } });  // the shape of `renderCache`; default true = its defaults; false ignores the marks
engine.islandCache.stats();   // { hits, misses, evictions, bypassed, entries, bytes }, and .clear(); null when islands.cache is false
```

- **The key** is a SHA-256 of the island's html (after the inner engine filled in its locals, so a different local is a different island) and the render options **including its `idBase`**
  (`(slot + 1) * idStride`). A hit therefore has exactly the ids a render in that slot would have: the cached entry is the fragment render's whole result (html, styles, components, hydrated
  count), and `data-island` / `data-client` are written on it after the lookup, so `client` is not part of the key. The same markup in another slot, or after a change of `idStride`,
  is a different entry (and is rendered). Options that cannot be serialized (a function) make that render uncacheable; it runs, not stored.
- **Time.** `cache="N"` is N seconds, checked at lookup (an entry older than that is rendered again); a bare `cache` uses `islands.cache.ttl` (ms, default none). The entries are bounded by count and
  bytes, least recently used out first. Concurrent identical misses share one render. A render that throws or reports an error diagnostic is never stored.
- **Only for islands that are a pure function of their html and options** (no clock, no per-request state read inside a component), the same rule as `renderCache`. Put what changes per request in the
  shell or in an uncached island. A view can switch the marks off for one request with the `stencilCache: false` local (as it does for `renderCache`).
- **The shell is never cached**, and a marked island next to it does not change what the shell renders. The shell renders on every request: it is where the dynamic parts of a page belong.
- **`renderCache` and `islands.cache` are separate caches** with separate stats: `renderCache` stores whole pages from the main thread, and is bypassed for a view with islands (it would store
  the assembled page, and the shell is the part that changes); `islands.cache` stores island fragments and is used by `res.render`, `renderIslands().html()`, `chunks()` and `manifest()` alike (the
  cache sits in front of the island render itself, so a streaming responder gets it for free).
- **Memory.** Entries hold the island's html, styles and component list; `maxBytes` counts the html only, so budget it with the styles in mind.

## `earlyHead`

With `earlyHead: true` and a view that has its own `<html>` and `<body>`, `page.chunks()` starts with the view's head before the shell has rendered: the `<html>` tag is the one
Stencil writes for it (class `hydrated`, `data-stencil-build`, ... from a probe render of an empty document with the same tag and options, made once and kept: the tag,
the build id, the mode and the language are the key, and the warm-up documents' tags are probed during `ready`), the rest up to `<body>` is the view's text. The shell's
component styles then go at the top of `<body>`, and each island's new ones in front of the island. Two consequences: Stencil's own additions to `<head>` (its `<meta charset>`)
are not there, so write yours; and the Stencil client does not look for `style[sty-id]` in the body, so it adds a copy of each to `<head>` on hydration (a few KB, parsed once).
Through `res.render` an early head changes nothing for the browser (the page is sent when it is complete); it exists for a responder that writes the chunks as they arrive.

## Streaming (#192)

`engine.stream(path, locals, options)` is an async iterable of html chunks; each chunk is one flush. `streamView(engine, view, locals, options)` is the Express handler that writes it.

```js
import { stencilEngine, streamView } from '@popcorn245/stencilrs/express';
app.get('/', streamView(engine, 'home', (req) => ({ user: req.user }), {
  mode: 'out-of-order', nonce: (req, res) => res.locals.cspNonce, compress: true,
}));
for await (const chunk of engine.stream(file, locals, { signal })) socket.write(chunk);   // the same, by hand
```

**`mode: 'in-order'`** (default; also `islands: { stream }`). The early head if there is one, then the shell up to the first island at once, then each island together with the shell's
text up to the next one, the moment it is next in line. An island that is already rendered when the one before it is written shares that chunk (`coalesce: false` to flush each).
Nothing waits for an island that is not the next one, and a slow island holds back the ones after it, not the ones before.

**`mode: 'out-of-order'`.** The whole shell goes out at once with `<template id="s-isl-N">` where each island goes, then each island as it finishes, in
`<div hidden id="s-isl-c-N">...</div><script>$ISL(N)</script>`, a function (defined once, in the first chunk) that moves the container's nodes in front of the anchor. The island sits in a
`div`, not a `<template>`, because declarative shadow DOM is not parsed inside template content. Everything the swap adds removes itself: after the last island the document is the one the whole page
renders (checked in Chromium), and `stencil-islands` is fired on `document`. A client that hydrates before that sees a page with holes: boot it on that event (or after `load` when no island is slow).
- **No JavaScript:** a `<noscript><style>` shows the containers (`display:block !important`), so the islands are there, after the shell, rather than in place.
- **CSP:** the swap, each call and the noscript style carry `nonce="..."` when `nonce` is given (a string or a function; base64/base64url characters only, anything else is a TypeError).
  The component `<style sty-id>` tags Stencil produces carry none, as in any Stencil SSR page: allow them with `style-src` (a hash or `'unsafe-inline'`).
- The tail of the document (`</body></html>`) is written last, after every island.

**Failures.** A failure before the first chunk (the view cannot be read, the shell fails and there is no early head) throws out of the iteration, and `streamView` passes it to `next(err)`: a normal
error response. After bytes are out, an island that fails (a render error, a stride overflow, a root-less island) is replaced by `fallback(name, err)` (default: an empty
`<div data-island="name" data-client="none" data-island-error hidden>`) and reported to `onError(err, { view, island })` (default `console.error`); the page goes on. A shell that fails after an early
head cannot be replaced: `streamView` logs it and ends the response.

**A client that leaves.** `streamView` aborts when the socket closes before the response finished; `engine.stream` takes `options.signal` and aborts the same way when the loop is left (`break`, `return`, a throw).
The renders still waiting for a worker are dropped (they never run); one a worker has already taken runs to its end and the result is discarded: threads are not killed for a closed tab. In-process
(`workers: 0`) a render that has not started is skipped, but they all start at once, so there is little to save: a pool is what makes this useful.

**Compression.** `compress: true` (or `{ level }`) gzips in the handler for a client that sends `Accept-Encoding: gzip`, with `Z_SYNC_FLUSH` after each chunk: a flush per island, not per write.
It is off by default: with the `compression` middleware, `res.flush()` is called after each chunk and that is the same policy; a proxy that compresses must not buffer (`X-Accel-Buffering: no` is set).
A flush per chunk costs bytes; on the Ionic pages (1 MB of html) the difference to one write was within 1.5% either way (table below), so the policy is the simple one.

The helper resolves `view` like `res.render` (the `views` directory and `view engine`; an absolute path is used as it is), merges `app.locals` and `res.locals`, and sets `Content-Type`, `X-Accel-Buffering: no`
(and `Content-Encoding` and `Vary` with `compress`) with the first chunk. A view without islands, or an engine without the option, is one chunk.

## Limits

- **DSD only.** `serializeShadowRoot: 'scoped'` (or `false`) is refused at construction and per view. Scoped pages hydrate to a different DOM than the full render even without islands
  (spike follow-up 11).
- **Ancestor context.** An island does not see its ancestors at render time: `ion-item` in an `ion-list` island-less is rendered without `in-list`/`role`; the client adds them.
  Put the `ion-list` inside the island if the server html matters before hydration.
- **No page cache for island views**: `renderCache` (whole pages) is bypassed for a view with islands; cache its islands instead (below). **`maxQueue`** counts every render: a page with `n` islands queues `n + 1`.
- **`maxHydrateCount`** (Stencil's 300 components per render) applies per island.

## Checks and numbers

From `examples/ionic` (after `npm run build:hydrate` and the client build described in spike-islands.md): `node check/islands.mjs` renders list-50 and kitchen-sink split into islands
and hydrates them in Chromium against the whole-page render (same DOM, no duplicate host ids, same `style[sty-id]` count for `res.render`; a stream writes island styles in the body, so the client adds
copies to the head); each is also streamed through `streamView` (gzip) in order, with an early head, out of order and out of order with a nonce, and must hydrate to the same DOM.
`node bench-islands.mjs [workers] [rounds] [throughputRounds] [paintRounds]` runs whole-page, islands (`res.render`), and the streamed routes (in order, one flush per island, early head, out of order) interleaved over HTTP:
time to first byte, last byte, gzip size, requests per second, and first contentful paint in Chromium.

Measured with `bench-islands.mjs` (Ionic list-50 and kitchen-sink, 2 workers, gzip, DSD, one shared 4-vCPU container with a load average of 5-7 from other jobs, so everything is noisy; every cell is the
median over interleaved rounds, with min-max and n). `full` is the engine without `islands`; `islands` is `res.render` of the island view (parallel renders, one response); the others are `streamView`.

| (ms; gzip bytes) | | full | islands | in-order | one flush per island | early head | out-of-order |
|---|---|---|---|---|---|---|---|
| list-50 | TTFB | 45.8 (33-106) | 41.3 (25-75) | **7.6** (3.8-22) | 6.5 (3.7-20) | **3.9** (1.2-20) | 8.2 (3.6-22) |
| | last byte | 46.2 (33-107) | 41.5 (25-79) | 36.9 (24-88) | 45.9 (20-88) | 45.8 (25-82) | 42.3 (24-69) |
| | gzip | 20,522 | 20,582 | 20,274 | 20,176 | 20,289 | 20,485 |
| kitchen-sink | TTFB | 33.1 (23-86) | 31.5 (20-58) | **11.0** (4.9-30) | 9.7 (5.4-25) | **4.1** (1.1-12) | 10.4 (5.1-24) |
| | last byte | 35.0 (24-86) | 32.1 (21-59) | 29.1 (18-53) | 29.6 (18-50) | 29.9 (18-64) | 31.0 (18-59) |
| | gzip | 31,423 | 31,708 | 32,017 | 32,017 | 32,028 | 31,612 |

(n = 40 each.) The TTFB win is the spike's (-83% and -67% in order, -91% and -88% with the early head; the spike: 40 -> 5 ms). The last byte in order is 20% / 17% below `full` and 11% / 9% below `islands`
in order, with the ranges overlapping: on a machine this loaded the spike's -28..-30% did not reproduce, and the out-of-order and one-flush-per-island last bytes are inside the noise of the others.
Streaming does not cost bytes here: gzip size is within 2% of the single response either way (the spike's +12..22% was with many more, smaller writes on a 20 KB-gzip page of the same size).
The pages are about 1 MB of html each, which is why a flush per island is cheap; one flush per island and per chunk differ only where two islands are ready together (kitchen-sink: 7 network chunks in both, as its islands finish one by one).

Requests per second at concurrency 4 (3 rounds of 5 s, medians; the same noisy machine, ranges are wide and overlap, so no difference is claimed): list-50 full 33.4 (16-43), islands 38.4 (22-51), in-order 40.6 (28-51), out-of-order 41.8 (25-49);
kitchen-sink full 40.6 (31-51), islands 33.8 (30-38), in-order 35.2 (28-39), out-of-order 37.4 (30-41). Streaming adds no measurable cost over `res.render` of the same island view.

First contentful paint in Chromium (n = 9, cold cache, 414x800, Ionic's 38 KB stylesheet render-blocking, the page's html only: no client bundle):

| | | full | in-order | early head | out-of-order |
|---|---|---|---|---|---|
| unthrottled | list-50 | 124 (116-188) | 116 (80-176) | 152 (116-212) | **92** (72-128) |
| | kitchen-sink | 136 (96-192) | **88** (72-144) | 100 (56-148) | **84** (76-160) |
| Fast 3G (75 ms each way, 1.6 Mbit/s) | list-50 | 468 (440-484) | **444** (420-456) | 456 (432-500) | **440** (408-460) |
| | kitchen-sink | 548 (516-660) | **516** (484-568) | **516** (464-536) | **480** (444-584) |

Unthrottled FCP is -6% / -35% in order and -26% / -38% out of order (the spike: -35..-44%), with overlapping ranges on list-50 and the early head's list-50 cell worse than `full` (its range is as wide as the difference: noise);
on Fast 3G -5% / -6% in order and -6% / -12% out of order (the spike: -5..-8%). `responseStart` falls from 136 / 165 ms to 86 / 97 ms in order.
