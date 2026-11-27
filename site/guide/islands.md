---
title: "Islands and directives"
description: "Render parts of a page separately and in parallel, stream them as they finish, cache them, and hydrate each one when it is needed, or never."
---

# Islands and directives

An island is a part of a view that the server renders on its own. The engine renders the page's shell and every island at the same time
(on the worker pool, if there is one), writes the pieces back in order or as they finish, can keep an island's html in a cache, and
tells the browser when, and whether, to take each island over. It is an option of the [Express view engine](/guide/ssr#express) and works with
declarative shadow DOM.

A view marks its islands. The marker has no output of its own:

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><link rel="stylesheet" href="/app.css"></head>
<body>
  <app-header></app-header>
  <stencil-island name="counter" client="load"><my-counter></my-counter></stencil-island>
  <stencil-island name="feed" client="visible"><slow-feed></slow-feed></stencil-island>
  <stencil-island name="footer" client="static" cache><my-footer></my-footer></stencil-island>
</body></html>
```

```js
import { stencilEngine, streamView } from '@popcorn245/stencilrs/express';

const engine = stencilEngine({
  hydrate: './dist/hydrate/index.js',
  workers: 'auto',
  islands: { client: { base: '/client/', manifest: './dist/client/components.json' } },
});
app.engine('html', engine);
app.get('/', streamView(engine, 'home', {}, { mode: 'out-of-order' }));  // the page as it renders
app.get('/whole', (req, res) => res.render('home'));                      // one assembled response
```

A view without markers renders exactly as it does without the option.

## What you get

- **Parallel renders.** The shell and each island render at once, each with its own range of hydration ids (`idBase`), so the pieces cannot
  collide when they are put together. A render that needs more ids than `idStride` (default 1000) fails the page and names the island.
- **Streaming.** `streamView` (or `engine.stream(path, locals)`, an async iterable) sends the head and the shell at once. In `in-order` mode
  each island follows when it is next in line; in `out-of-order` mode the shell goes out with a placeholder per island and each island is swapped in by one
  small inline script when it is done (`nonce` for a CSP, a `<noscript>` reveal for no JavaScript). A slow island holds back nothing before it
  in order, and nothing at all out of order. `earlyHead: true` sends the view's own `<head>` before any render has finished. An island that
  fails after bytes are out is replaced by a fallback and reported to `onError`; a client that hangs up cancels the renders that have not started.
- **A cache per island.** `cache` (or `cache="60"` for seconds) on a marker stores that island's render, keyed on its html and its id range,
  and serves it from memory after that. The shell is never cached. A page with islands bypasses the whole-page `renderCache`.
- **Directives.** `client` says when the browser takes an island over. The island's server html is complete either way.

| `client` | The browser |
|---|---|
| `load` (default) | defines the island's components at boot and hydrates them |
| `idle` | the same from `requestIdleCallback` |
| `visible` | the same when the island scrolls into view |
| `static` | never. The island is written without hydration annotations, and a component only static islands use is never requested |
| `none` | as `static`, and not listed in `window.stencilIslands` |

## In an Ionic app

The shell keeps Ionic's frame (`ion-app`, `ion-split-pane`, `ion-tabs`, `.ion-page`, `ion-content`) and the islands are the parts inside it. Each island is rendered inside
its ancestors, so a component that looks up the tree gets the answer it gets in the whole page: `ion-infinite-scroll` finds its `ion-content`, `ion-item` its `ion-list`,
`ion-menu` its `ion-split-pane`. The island's html is the whole page's, but for the hydration ids.

```html
<ion-app>
  <ion-tabs>
    <ion-tab tab="home"><stencil-island name="home"><div class="ion-page">...</div></stencil-island></ion-tab>
    <ion-tab tab="settings"><stencil-island name="settings" client="visible"><div class="ion-page">...</div></stencil-island></ion-tab>
    <ion-tab-bar slot="bottom" selected-tab="home">...</ion-tab-bar>
  </ion-tabs>
</ion-app>
```

- A tab that is not selected: `visible`. It activates when the tab is shown.
- A list further down `ion-content`: `visible`.
- `ion-menu`: `idle`, not `visible`. An off-canvas menu never scrolls into view, and the menu button needs it hydrated.
- A footer with nothing to tap: `static`.

On the tabs starter, with the two tabs that are not selected `visible`, the browser requests 38% less JavaScript at load (447 to 276 KB) and spends 21-25% less time in script.
On the split-pane starter (menu `idle`, feed `visible`, footer `static`) the page is ready 32-50% sooner. Measured as the tables above; details in
[docs/islands.md](https://github.com/popcorn245/StencilRS/blob/next/docs/islands.md#ionic-app-layouts).

`islands: { context: false }` renders each island on its own instead (it saves 0-4.5 ms a page; an island that needs its `ion-content` then fails).

## The client

`islands.client` makes the engine write the page's boot: a JSON manifest of what each island rendered (read from the render itself, so it is what
the page used, not a build-time guess), `modulepreload` links for what loads at boot, and a ~1.5 KB module that honors the directives. The modules come from a
[`hydrateClient` build](/guide/vite-plugin) with `islands: true`: one module per tag, a `components.json` that lists them, and the boot as `islands.js`.

```ts
// vite.config.ts of the client build
stencilrs({ hydrateClient: { islands: true } });
```

A custom element is global, so the boot gates `connectedCallback` per instance: a host in an island that is not active yet waits, a host in a
`static` island is upgraded but never connected, and a tag used by both behaves per host. The modules of one activation are defined in one synchronous
pass, so a parent that configures its children (tabs and tab) still finds them defined; keep such a parent and its children in the same island.
`stencil-island-ready` fires per island, `stencil-islands-ready` on `document` when the shell and the `load` islands are ready, and `window.stencilIslands`
has each island's state.

"Per-island chunking" means the per-tag modules, grouped for the page that is being served: a `visible` island's modules are requested when it
scrolls in, a `static` island's not at all, and the chunks a `load` island imports are preloaded with it. There is no merged bundle per island.

## Try it

[`examples/islands`](https://github.com/popcorn245/StencilRS/tree/next/examples/islands) is a small Express app with a counter (`load`), a feed that takes
1.5 s to render (`visible`) and a cached footer (`static`), served out of order, in order and whole: `npm install && npm run build && npm start`.

## What it costs and what it saves

Measured on Ionic's `list-50` and `kitchen-sink` pages (about 1 MB and 0.4 MB of html) on a shared 4-vCPU container with two workers; the full tables, ranges
and the noise are in [docs/islands.md](https://github.com/popcorn245/StencilRS/blob/next/docs/islands.md#checks-and-numbers) and
[docs/spike-islands.md](https://github.com/popcorn245/StencilRS/blob/next/docs/spike-islands.md).

Server, over HTTP (gzip, two workers, 40 interleaved rounds; medians in ms, min-max in brackets; `full` is the engine without `islands`):

| | | full | islands | cached | in-order | early head | out-of-order |
|---|---|---|---|---|---|---|---|
| list-50 | first byte | 48.4 (34-115) | 43.7 (24-122) | 30.6 (21-71) | **5.9** (3.8-15) | **2.9** (1.2-12) | **6.6** (4.3-22) |
| | last byte | 49.4 (35-115) | 44.5 (24-123) | 31.2 (21-71) | 37.8 (26-82) | 37.1 (27-68) | 36.5 (23-71) |
| kitchen-sink | first byte | 32.3 (24-66) | 28.8 (20-42) | 20.8 (17-37) | **8.7** (5.2-27) | **2.7** (1.1-10) | **9.5** (6.1-24) |
| | last byte | 32.7 (24-66) | 29.8 (21-43) | 21.4 (17-37) | 27.4 (19-43) | 29.5 (18-60) | 27.7 (19-52) |

The first byte falls 88% / 73% in order and 94% / 92% with the early head. The last byte is 9-26% lower in every variant, but the ranges overlap `full`'s,
so treat it as the direction, not the size. Streaming does not cost bytes (gzip within 2% of `full`). Requests per second at concurrency 4 are within noise of `full`
for every variant that renders (list-50 44-49 against 47; kitchen-sink 55-64 against 67, the early head's 55 the lowest): splitting a page does not lower throughput measurably here. `cached` (the
static islands marked `cache`) is the one that moves it: **73 against 47 req/s (+55%) and 93 against 67 (+38%)**, with ranges that do not overlap `full`'s.

In Chromium (n = 11, cold cache, 414x800; FCP, and LCP where it differs; the page has no client script, so LCP equals FCP except where noted):

| ms | | full | islands | cached | in-order | early head | out-of-order |
|---|---|---|---|---|---|---|---|
| unthrottled | list-50 | 136 (96-172) | 124 | 104 | **84** | 108 | **76** |
| | kitchen-sink | 96 (88-120) | 92 | 88 | **68** | 80 | **72** (LCP 88) |
| Fast 3G, RTT split | list-50 | 452 (428-488) | 448 | 440 | 436 | 432 | 428 |
| | kitchen-sink | 492 (480-520) | 492 | 484 | 468 | 464 | **444** (LCP 468) |

Unthrottled, in order and out of order are 25-44% below `full`, with ranges that overlap it on list-50 (the machine was shared). On Fast 3G the differences are 1-10% and inside the spread, except out-of-order FCP on kitchen-sink
(its range, 436-456, is clear of `full`'s 480-520, but its LCP is 468, because the swap makes the first island the largest paint): the network, not the render, is most of what a slow connection waits for.

Client, on the minified production build, directives against all-`load` (n = 15, medians): on kitchen-sink with `form` and `rest` `static`, script time falls 38% (85 to 53 ms), JS requested 47% (638 to 339 KB, 119 to 75 files) and ready 33%
(120 to 80 ms). On list-50, where the deferred island shares all its tags with another, no code is saved; script falls 28% (69 to 50 ms) and ready 24%, with overlapping ranges. `visible` costs a few ms
when the island scrolls in (+11 ms script and 13 files on kitchen-sink, +9 ms on list-50).

## Limits

- **Scoped mode works** (`serializeShadowRoot: 'scoped'`): parallel renders, style dedupe, the early head, both streaming modes, the island cache and the directives. Hydrate a scoped page with a *production* client build (`hydrateClient`): Stencil's `--dev` build leaves a scoped page blank,
  whole or in islands. In scoped mode an island directly inside a shadow component (`ion-content`) may only have elements at its top level; the engine moves Stencil's relocation marks onto them. See [Scoped mode](https://github.com/popcorn245/StencilRS/blob/next/docs/islands.md#scoped-mode).
- In declarative shadow DOM an island must not be a direct child of a component that is not a shadow host and has slots (Ionic's `ion-header`): put it in a plain element or a shadow
  host, or make the whole component the island. The engine checks and names the island.
- An island does not see its ancestors at render time, so an `ion-item` outside its `ion-list` renders without `in-list` and `role`; the client adds them. Put the list inside the island if the server html matters.
- Islands cannot nest, and a name is used once per view. A fragment view (no `<html>`) gets neither the boot nor the annotation stripping.
- The directives are per page load: nothing re-hydrates after a client-side navigation.
- The Stencil 5.0.0-beta.25 client runtime logs `reading 'length'` / `reading 'nodeType'` errors to the console while it hydrates and re-renders childless
  elements. Stencil's own client does the same; it is upstream, and hydration carries on.
- A proxy or CDN that buffers the response turns streaming back into one late response (`X-Accel-Buffering: no` is set for nginx).

The reference, with every option and failure mode, is [docs/islands.md](https://github.com/popcorn245/StencilRS/blob/next/docs/islands.md).
