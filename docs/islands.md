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

## Client directives (`islands.client`)

`client="load | idle | visible | static | none"` on `<stencil-island>` says when, and whether, the island's components run in the browser. The server html of every island is
complete either way; the directive only decides when the client takes it over.

| `client` | The client |
|---|---|
| `load` (default) | defines the island's components at boot and hydrates them, together with the shell's, in one pass |
| `idle` | the same from `requestIdleCallback` |
| `visible` | the same when an element of the island intersects the viewport (`IntersectionObserver`; `margin` sets its `rootMargin`) |
| `static` | never: the html stays what the server wrote. The island is rendered without hydration annotations (`s-id`, `c-id`, `s-sn`, `s-mode`, the `<!--r. o. s. t. c.-->` comments: -8..-21% gzip in the spike), and a component only static islands use is never loaded |
| `none` | as `static`, and not listed in `window.stencilIslands.state` |

```js
const engine = stencilEngine({
  hydrate: './dist/hydrate/index.js',
  islands: { client: { base: '/assets/', manifest: './dist/client/components.json', init: ['init.js'] } },
});
```

`client` takes `base` (URL prefix of the build, default `/`), `manifest` (the `components.json` of the `hydrateClient` build below, a path or the parsed object), `init` (modules that run before any
component is defined: Ionic's global script), `script` (URL of the boot, default `<base>islands.js`, `false` for none), `preload` (default true) and `margin` (default `0px`). With it,
`res.render` writes before `</body>`, for a document view:

```html
<link rel="modulepreload" href="/assets/init.js"> ... <!-- init, the shell's and the load islands' modules, and the chunks they import -->
<script type="application/json" id="stencil-islands">{"base":"/assets/","init":["init.js"],"shell":["components/ion-app.js"],"islands":[{"name":"feed","client":"visible","files":["components/ion-item.js"]},{"name":"promo","client":"static","files":[]}]}</script>
<script type="module" src="/assets/islands.js"></script>
```

The files are, for each island, the modules of the tags its render used (`result.components`, so what the page really rendered, not a build-time guess), looked up in `components.json`; a tag the
build has no module for is listed in `missing`. `engine.renderIslands(path)` gives the same to a streaming responder: `page.clientManifest()` is `{ shell: [tag], islands: [{ name, client, tags }] }`
and `page.bootTag()` the markup above, to write with the last chunk. `engine.stream` and `streamView` already do that: the boot goes before `</body>` in the chunk that closes the page, in both modes, once every island has settled (a failed island is listed as `none`). A fragment view (no `<html>`) gets neither the boot nor the annotation stripping.

The client is built by `stencilrs({ hydrateClient: { islands: true } })` (docs/vite-plugin.md), which also writes the boot as `islands.js`; or import `boot` from `@popcorn245/stencilrs/islands`.

**One component, many instances.** A custom element is global: once `ion-item` is defined, every `ion-item` in the page upgrades and connects, in any island. So the gate is per instance: the client wraps each class's
`connectedCallback` as `customElements.define` is called (a guarded patch: a class without one is left alone and warned about). A host whose closest `[data-island]`, looking through the shadow roots it
sits in, is not active yet is parked and connected by hand, in document order, when its island activates; a host of a `static` or `none` island is never connected (it is upgraded, so its
properties work, and nothing renders or hydrates). A tag used by both a static and a hydrated island therefore behaves per instance. A host in no island, or in one the manifest does not list, connects as usual.

**One synchronous pass.** The modules of one activation (the shell and every `load` island together at boot, later one island at a time, queued) are imported with `customElements.define` held back and then all defined in
one synchronous pass; Stencil's lazy loader registers its tags the same way. A parent that sets props on its children in `componentWillLoad` (`ion-tabs` on `ion-tab`) otherwise loses them on a child that is
not defined yet. The rule has a consequence for islands: keep a parent and the children it configures in the same island, or in the shell and `load` islands; a child in a later `idle` or `visible`
island is defined after its parent has run.

**Events and state.** `stencil-island-ready` (`{ name, client, ms }`, bubbles from the island's first element) when an island's hosts are ready, `stencil-islands-ready` on `document` when the shell and every `load` island are,
`stencil-island-error` (`{ name, error }`) when its modules do not load: the island stays the server's html and the rest of the page goes on. `window.stencilIslands` is `{ ready, state, activate(name), ms() }`; `state[name]` is
`pending`, `loading`, `ready`, `static` or `error`.

**Per-island chunks.** There is no bundle per island to build or keep in step: the unit is the per-tag module of the `hydrateClient` build and the grouping is the page's, resolved per request from what
each island rendered. A visible island's modules are requested when it scrolls in, a static island's are not requested at all unless another island uses the tag, the modules a `load` island needs are
preloaded together with the chunks they import (`components.json`'s `imports`), and the lazy loader is not used: its bundle groups are coarser than islands. Merging an island's modules into one file would
need the island to tag manifest at build time and a second bundling pass over the build output (two copies of the runtime if done wrongly); it is not done.

Limits: the directives are per page load (nothing re-hydrates after a client-side navigation); `visible` needs `IntersectionObserver` (without it the island activates at once).

## Checks and numbers

From `examples/ionic` (`npm run build:hydrate`, and the client build: `IONIC_HYDRATE_CLIENT=1 IONIC_OUT_DIR=$PWD/dist-hydrate-client node node_modules/vite/bin/vite.js build --config vite.config.ts`):

- `node check/islands-client.mjs`: one directive of each kind on kitchen-sink, in Chromium, on the production hydrating client build. `test/islands-client.test.js` checks every directive on a small fixture.
- `node check/islands.mjs`: list-50 and kitchen-sink split into islands, through `res.render` and each `streamView` mode, hydrated in Chromium against the whole-page render (same DOM,
  no duplicate host ids). It hydrates with Stencil's own lazy-loader client (the spike's `stencil build --dev` with an `ssr` target, see spike-islands.md), not the `hydrateClient` build.
- **`npm run bench:islands`** (`bench-islands-all.mjs`) runs both benchmarks below, building what is missing. `--server-only`, `--client-only`, `--workers`, `--rounds`, `--throughput-rounds`, `--paint-rounds`,
  `--client-rounds` and `--cpu` pick what runs.
  - `bench-islands.mjs` (with `bench/islands-server.mjs`): `full`, `islands`, `cached`, `in-order`, `perchunk` (one flush per island), `early head` and `out-of-order`, interleaved over HTTP: first byte, last byte, gzip size, requests per second
    at concurrency 4, then first and largest contentful paint in Chromium, unthrottled and on a Fast 3G profile whose round trip is split around the server (75 ms before the request reaches it, 75 ms of CDP latency back).
  - `bench-islands-client.mjs`: the islands client against the spike's boot, directives against all-`load`, on the minified production build: script time, JS requested and ready.

Measured on one shared 4-vCPU container (load average under 1 at the start; other jobs came and went), two workers, gzip, DSD, Ionic list-50 (1 MB of html) and kitchen-sink. Each cell is the median over interleaved rounds
(every round visits each variant once, the start rotating), with min-max; n = 40 for the first and last byte, 3 rounds of 5 s for requests per second, 11 for paint, 15 for the client.

| (ms) | | full | islands | cached | in-order | one flush per island | early head | out-of-order |
|---|---|---|---|---|---|---|---|---|
| list-50 | first byte | 48.4 (34-115) | 43.7 (24-122) | 30.6 (21-71) | **5.9** (3.8-15) | 5.6 (3.9-22) | **2.9** (1.2-12) | **6.6** (4.3-22) |
| | last byte | 49.4 (35-115) | 44.5 (24-123) | 31.2 (21-71) | 37.8 (26-82) | 39.2 (24-77) | 37.1 (27-68) | 36.5 (23-71) |
| | gzip bytes | 20,522 | 20,582 | 20,582 | 20,274 | 20,176 | 20,289 | 20,485 |
| | requests/s | 47.2 (46-49) | 44.6 (43-47) | **73.0** (70-80) | 45.4 (45-50) | | 44.2 (42-46) | 49.2 (44-50) |
| kitchen-sink | first byte | 32.3 (24-66) | 28.8 (20-42) | 20.8 (17-37) | **8.7** (5.2-27) | 9.6 (5.1-21) | **2.7** (1.1-10) | **9.5** (6.1-24) |
| | last byte | 32.7 (24-66) | 29.8 (21-43) | 21.4 (17-37) | 27.4 (19-43) | 26.4 (20-37) | 29.5 (18-60) | 27.7 (19-52) |
| | gzip bytes | 31,423 | 31,708 | 31,708 | 31,967 | 32,017 | 31,988 | 31,255 |
| | requests/s | 67.4 (59-79) | 61.8 (57-66) | **93.0** (87-97) | 63.6 (56-65) | | 54.8 (52-59) | 59.8 (56-61) |

Clear: the first byte (88% / 73% lower in order, 94% / 92% with the early head, ranges apart from `full`'s) and `cached`'s throughput (+55% / +38%, ranges clear of `full`'s). The last byte is 9-26% lower for every variant but the ranges overlap
`full`'s, so only the direction is claimed. Requests per second of `islands`, in-order, out-of-order and early head against `full` are within noise (the early head's kitchen-sink 55 against 67 is the largest gap and its range just clears `full`'s lower bound).
Bytes: within 2% of `full` everywhere.

Chromium paint (n = 11, cold cache, 414x800, Ionic's stylesheet render-blocking, no client script, so LCP is FCP except where shown):

| ms | | full | islands | cached | in-order | early head | out-of-order |
|---|---|---|---|---|---|---|---|
| unthrottled | list-50 | 136 (96-172) | 124 (104-320) | 104 (84-128) | **84** (56-140) | 108 (76-140) | **76** (64-112) |
| | kitchen-sink | 96 (88-120) | 92 (76-116) | 88 (76-104) | **68** (40-88) | 80 (48-100) | **72** (56-96), LCP 88 |
| Fast 3G | list-50 | 452 (428-488) | 448 (432-472) | 440 (424-452) | 436 (408-448) | 432 (420-476) | 428 (408-448) |
| | kitchen-sink | 492 (480-520) | 492 (476-508) | 484 (472-504) | 468 (456-488) | 464 (448-484) | **444** (436-456), LCP 468 |

Unthrottled, in order and out of order are 25-44% below `full`, but every range overlaps `full`'s on list-50; on Fast 3G the gains are 1-10% and inside the spread except kitchen-sink out of order (FCP; its LCP, 468, is within it).
`islands` (one assembled response) and `cached` change the paint little, as expected: they shorten the wait for the whole response, not for the first piece. `responseStart` falls from 130 / 113 ms (full) to 82 / 87 ms in order on Fast 3G.

Client, production build, Chromium 414x480, CDP script time, ready from the boot's start until the shell and the `load` islands are ready (n = 15; kitchen-sink defers `form` and `rest`, list-50 defers `b`):

| | variant | script ms | ready ms | JS requested (gzip), files | html gzip |
|---|---|---|---|---|---|
| kitchen-sink | spike boot, all `load` | 105 (97-128) | 270 (250-333) | 634 KB (162 KB), 118 | 33,237 |
| | spike boot, deferred static | 60 (53-72) | 181 (153-244) | 335 KB (97 KB), 74 | 33,248 |
| | this client, all `load` | 85 (79-107) | 120 (112-150) | 638 KB (164 KB), 119 | 33,091 |
| | this client, deferred `static` | **53** (47-74) | **80** (71-110) | **339 KB** (99 KB), 75 | 31,255 |
| | this client, deferred `visible` | 81 (74-117) | 81 (71-119) | 585 KB (150 KB), 106 (+11 ms and +13 files on scroll) | 32,678 |
| list-50 | spike boot, all `load` | 90 (71-125) | 177 (154-243) | 228 KB (66 KB), 38 | 21,628 |
| | this client, all `load` | 69 (59-87) | 68 (60-99) | 232 KB (67 KB), 39 | 20,565 |
| | this client, `b` `static` | 50 (44-68) | 52 (46-64) | 232 KB (67 KB), 39 | 18,296 |
| | this client, `b` `visible` | 52 (44-72) | 54 (48-73) | 232 KB (67 KB), 39 (+9 ms on scroll) | 20,582 |

Static against all-`load` with this client: kitchen-sink script -38%, JS -47% (the spike's boot: -43% and -47%), ready -33%; the deferred islands own tags nobody else uses. On list-50 `b` uses the tags `a` loads, so no code is saved and the
JS is the same; script (-28%) and ready (-24%) fall with overlapping ranges: the direction, not the size. `visible` on kitchen-sink loads more than `static` because `form` is in the first viewport and activates at boot.
This client's `all` against the spike boot's `all` (script -19% / -23%) is not a measure of the directives: the two differ in their loader (one define pass, `modulepreload`) and in how ready is taken, so the contributions were not separated; the navigation-based ready that `bench-islands-client.mjs` also prints is the one to compare across clients.

Known upstream noise: the Stencil 5.0.0-beta.25 client runtime logs `reading 'length'` / `reading 'nodeType'` errors to the console while hydrating or re-rendering childless elements; Stencil's own client does the same.
