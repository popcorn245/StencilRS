# Spike: islands and HTML streaming for the SSR / Express engine (issue #183)

> **Status: built.** Everything proposed here shipped as `stencilEngine({ islands })` (#190-#196, and scoped mode in #206) except context-carrying islands; [What shipped](#what-shipped-against-what-was-proposed) compares the two, with the final numbers. The reference is [islands.md](islands.md); the text below is the spike as it was written.

A one-day prototype with measurements. Nothing here is library code: the prototype lives in `examples/ionic/spike/islands/`, the only
patch to Stencil's runner is a text edit of the built hydrate app done by `make-idbase-hydrate.mjs`, and no file under the package root
changed. Everything is Ionic 9.0.12 (migrated to Stencil 5.0.0-beta.25), the pages `list-50` and `kitchen-sink` of `ssr-pages.mjs`
(re-cut into islands in `lib.mjs`), Node 22.23, headless Chromium 1243 through Playwright, on the shared 4-vCPU build container.
Timings are medians with min-max and n, interleaved between variants; where a difference is inside the spread it says so.

The idea: the page template is a shell (doctype, head, layout) with marked islands. The shell and each island are rendered separately by
`renderToString` (the islands in fragment mode, `fullDocument: false`), in parallel on the worker pool, and written to the socket as they
finish. The client can then hydrate islands individually (`load`, `idle`, `visible`) or not at all (`static`).

## Summary

| question | answer |
|---|---|
| 1. Do hydration ids collide across islands? | **Yes, whenever the islands are rendered by different threads or processes** (`workers: n`, a cluster, a cache hit from another process): Stencil's host-id counter is a module-level variable that is never reset, so it is unique within one thread only. Colliding ids wedge hydration in scoped mode in every page tried and in DSD on the kitchen-sink page (components never become ready, the toggles and the checkbox are dead). A render option `idBase` (a four-line guarded patch) fixes all of it: every combination hydrates to the same DOM as without it. |
| 2. Styles per island | DSD: every instance carries its own `<style>` inside its shadow root, fragment or document, so islands change nothing there; only scoped-encapsulation components (`ion-input`) and the slot-fallback css come back in `result.styles`. Scoped mode: fragment html has **no** styles, but `result.styles` has them (`[{ id, content }]`); the engine writes each once per page, in front of the first island that uses it. Pixel- and computed-style-identical to the full render. |
| 3. `<html>` / head | `<html>` gets `lang` (from the input), `data-stencil-build`, `class="plt-tablet plt-desktop md hydrated"` and `mode="md"`: independent of the page (same on a page with no components), so a probe render once gives the exact tag and the shell can send the head before anything is rendered. Head styles: DSD 0-5 per page, scoped all of them; they can be written at the top of `<body>` instead. |
| 4. Streaming | In-order and out-of-order both work and hydrate to the same DOM as the full render (5 routes x 2 pages checked in Chromium). TTFB 40 -> 5 ms on list-50 and 32 -> 7 ms on kitchen-sink (2.5 / 3.5 ms with the head sent before rendering), last byte -28..-30% on two workers. |
| 5. Numbers | Server: TTFB -78..-86% (-89..-94% with the early head), last byte -28%/-30%, but **throughput at concurrency 4 is 5-9% (list-50) and 20-26% (kitchen-sink) lower** (more renders per page). Browser, no throttling: FCP/LCP -35% (116 -> 76 ms) and -37..-44%; on a 150 ms-RTT 1.6 Mbit/s profile only -5..-8% (and nothing at all if the profile's latency is applied the way CDP does it), because the stylesheet and the RTT dominate. Client: not hydrating two islands of the kitchen-sink page cuts script time 52%, JS bytes 57% and ready time 39%; deferring them until visible costs the same at boot and the work comes back when they scroll in (+11 ms). |
| Risks | Slot-relocation annotations are lost when an island sits directly in a non-shadow slot host (`ion-header`); ancestor context (`ion-list` -> `in-list`, `role`) is missing from island html; per-island hydration needs a gate Stencil does not have (the prototype patches `connectedCallback`); the gzip cost of per-chunk flushes is +12..22%. Details below. |

Reproduce (from `examples/ionic`): `npm run build:hydrate`, copy `spike/islands/stencil.client.config.ts` to `migrated/` and build the
client (command in its header), `node spike/islands/make-idbase-hydrate.mjs`, then the scripts named in each section.

## What shipped against what was proposed

| proposed | shipped |
|---|---|
| `idBase` as a guarded runner patch | #190, as proposed (`idBase` render option, differential test, guard). Stride 1000 and the overflow check, which names the island |
| `renderFragment` returning `{ html, styles, components, hydratedCount }` | #190, in-process and on the pool |
| `<stencil-island>` scan, split, placement check, root tagging | #191, as proposed. Added: errors carry `ESTENCIL_ISLAND`, the view and the line; a text-only island is an error |
| `islands: { stream: 'in-order' \| 'out-of-order' \| false, earlyHead, idStride }` | the engine takes `earlyHead`, `idStride`, `cache` and `client`; the stream mode is an option of `streamView` / `engine.stream` (`mode`), not of the engine |
| streaming responder, flush policy, failures, abort | #192: `engine.stream` and `streamView`; gzip with a sync flush per chunk (`compress`), adjacent ready islands share a chunk (`coalesce`); an island that fails after bytes are out becomes a fallback and goes to `onError`; a closed socket cancels the renders that have not started |
| out-of-order with a `<noscript>` reveal and a nonce | #192, as proposed; the swap is a `<div hidden>` container, never a `<template>` (DSD does not parse inside one), and fires `stencil-islands` |
| early head with a probed `<html>` tag | #192, as proposed; the shell's styles go at the top of `<body>` |
| island cache (a beyond-the-plan gain) | #193 `islands.cache`: key on the island's html, options and `idBase`, per-marker `cache="N"`, shares concurrent misses; the shell is never cached and `renderCache` is bypassed for a view with islands |
| per-island client chunks | #194 `hydrateClient`: one module per tag and `components.json`, with the chunks each imports. Not an island bundle: the grouping is per page and per request, from `result.components` (merging would need the island-to-tags manifest at build time and a second bundling pass) |
| `@popcorn245/stencilrs/islands`, the five directives, `connectedCallback` gate, manifest, ready events | #195, 1.5 KB; the engine writes the manifest and `modulepreload` links (`islands.client`), `engine.stream` writes the boot. Added: the one-synchronous-define-pass rule, which the spike's loader lacked and which `ion-tabs` needs |
| example app, docs | #196: `examples/islands`, `npm run bench:islands`, the guide page and the README section |

Not as proposed: an island does not carry its ancestors' context. Scoped mode, refused when the islands shipped, works since #206 (follow-up 11 below).

### The numbers, spike against shipped

The same pages, the same method (interleaved, medians, min-max), a different day on the same kind of shared container, so the ranges are what to read. Spike's first, shipped second; the full tables and `n` are in [islands.md](islands.md#checks-and-numbers).

| | spike | shipped (`npm run bench:islands`) |
|---|---|---|
| first byte, in order, list-50 / kitchen-sink | 39.6 -> 5.4 / 31.6 -> 7.0 ms | 48.4 -> 5.9 / 32.3 -> 8.7 ms (-88% / -73%) |
| first byte, early head | 2.5 / 3.5 ms | 2.9 / 2.7 ms (-94% / -92%) |
| last byte, in order | -28% / -30% | -23% / -16%, ranges overlap `full`'s: the direction, not the size |
| parallel renders alone (`noisl`, now `islands`) | -21% / -15% | -10% / -9%, within noise |
| gzip size of streamed pages | +12..22% | -1% .. +2% (a flush per island, not per write; 1 MB html pages) |
| requests/s at concurrency 4 | -5..-9% / -20..-26% | within noise of `full` (-5% / -8%, ranges overlap), early head kitchen-sink -19% |
| requests/s, static islands cached | not measured | **+55% / +38%**, ranges clear of `full`'s |
| FCP unthrottled, in order / out of order | -35% / -24% list-50, -37% / -33% kitchen-sink | -38% / -44% list-50, -29% / -25% kitchen-sink (ranges overlap on list-50) |
| FCP on the RTT-split Fast 3G, best case | -5..-8% | -4..-6%, kitchen-sink out of order -10%; the rest inside the spread |
| client script, kitchen-sink, deferred static, vs all | -52% (dev build) | **-38%** (production build; the spike's boot on it: -43%) |
| client JS requested | -57% | **-47%** (the spike's boot: -47%) |
| ready | about -40% | -33% |
| list-50 (no code saved) | script -41..-51%, ready -11..-23% | script -28%, ready -24%, ranges overlap |

Read: the latency results reproduce, and the first byte is the robust one. The last byte and throughput results did not: the shipped renders cost what the spike's did (the fixed cost per render is the same), but the parallel win is smaller on this run and the throughput loss is
inside the noise, so the spike's "wins latency, loses capacity" is now "wins latency, capacity unchanged within what could be measured, and recovered (and more) when the static islands are cached". The bytes cost vanished with a flush per island. The client gains are the same
kind of gain on a production build (smaller in percent, since minified code has less to skip).

### Follow-ups, status

Done: 1 (#190), 2 (#190), 3 (#191), 4 (#192), 5 (#192), 6 (#192), 8 (#195), 9 (#195, as per-tag modules, see above), 10 (#193), 13 (#196). 7 is half done: the styles are written once per page, and the client still adds its own
copy of each `style[sty-id]` that an island wrote in the body to `<head>`. Open:

- **11. Scoped mode**, done (#206): the DOM Stencil's dev client builds from a scoped page is wrong whole or split (a `<style>` in the shadow root keeps it from moving the server's nodes into it), the production client builds the client-only DOM from both, and islands in scoped mode work (relocation marks per element, see [islands.md](islands.md#scoped-mode)).
- **12. Context-carrying islands** (M): render an island inside its ancestors and cut the wrapper out, so `in-list` / `role` are in the server html (the client adds them on hydration).
- **7b. The duplicate `style[sty-id]` in the body** (S-M): a Stencil client lookup change (upstream), or hoisting the islands' styles into `<head>` when the head is not yet sent.
- **14. Per-render fixed cost** (tracked in #182 / #189): an island is a render, and a page with `n` islands pays it `n + 1` times; any cut there pays out first on islands.
- **Re-hydration after client-side navigation**: the directives are per page load.
- **Real network and CDN, a cluster**: not measured; a page cache that is another process's gets islands from a cache with the same slot ids, which the key allows but nothing tests.
- **The hydrating `ssr` build of Stencil against ionicons** (spike risk): still absent in this harness, so `check/islands.mjs` compares with Stencil's lazy-loader dev client, which needs the spike's `stencil build --dev` and was not rebuilt for this run (`check/islands-client.mjs` and the tests were).
- **Upstream**: Stencil 5.0.0-beta.25's client logs `reading 'length'` / `reading 'nodeType'` on hydrate and re-render, as its own client does.
- **Merged per-island bundles** (decided against, see islands.md): a build-time island-to-tags manifest and a second bundling pass.

## 1. Hydration ids

### What Stencil does

`insertVdomAnnotations` numbers every component host `s-id="N"` (and `<!--r.N-->`, `c-id="N.node.depth.index"` on its children) from
`docData.hostIds`, and the light-DOM nodes a component relocates (scoped slots) with a second counter, `docData.rootLevelIds`
(`c-id="0.N"`, `<!--o.0.N-->`, `<!--t.0.N-->`). Both live in `docData`, a **module-level object of the hydrate app** that
`initializeWindow` puts on every document (`doc[STENCIL_DOC_DATA] = docData`): "to ensure that host ids remain unique across multiple
hydration runs". Measured on `renderToString` called repeatedly in one process: `s-id` 1, 5, 9, 13, ... the counter never goes back
(there is a `resetSsrDocData()` export, meant for tests). So:

- islands rendered one after the other **in the same thread** never collide (this is the `seq` row below), and
- islands rendered in **different threads** (the `workers: n` pool: every worker starts at 0), different processes, or the same page
  served from a render cache filled by another process, collide: island A and island B both have `s-id="1"`, `o.0.1`, `c-id="0.1"`.

The same counter also means the full-page output of the current engine is not reproducible from one request to the next (ids keep growing;
the benchmarks reset it or compare modulo ids). That is existing behaviour, but it matters for any cache that stores an island.

### Experiment (`hydrate-check.mjs`)

Four strategies for the same page, loaded in Chromium with a client bundle that really hydrates (see below) and the server's elements
remembered before the bundle loads, then compared after hydration (`componentOnReady` of every host with an 8 s deadline, the server
nodes still connected, the DOM signature, clicks on `ion-toggle`/`ion-checkbox`/`ion-button`):

- `full`: the whole page in one `renderToString` (today's engine),
- `seq`: shell + islands in one thread (the counter keeps counting),
- `collide`: the counter reset before the shell and before each island (what separate workers do),
- `collide+fix`: as `collide` with `idBase`: the shell from 0, island *i* from `(i + 1) * 10000`.

Client bundle: `npm run build:stencil` produces a client **without** hydration code (Stencil sets `BUILD.hydrateClientSide` only when an `ssr`
output target exists; the stencilrs Vite build sets it to false on purpose), so the "hydration" of an earlier attempt was a plain
re-render. `stencil.client.config.ts` adds an `ssr` target flagged `skipInDev` and builds with `--dev`: the flag is on, the (broken against
the ionicons collection) Stencil ssr app is skipped. The client is therefore an unminified dev build (this matters for section 5).

| page / mode | strategy | duplicate host ids | hydration finished | server nodes adopted | DOM after hydration = `full` | clicks work |
|---|---|---:|---|---|---|---|
| list-50 dsd | full | 0 | yes | 1007/1007 | - | yes |
| | seq | 0 | yes | 1007/1007 | yes | yes |
| | collide | 100 | yes | 1007/1007 | **no** (slots lose `class=""`: client vnodes attach differently) | yes |
| | collide+fix | 0 | yes | 1007/1007 | yes | yes |
| list-50 scoped | full | 0 | yes | 755/755 | - | yes |
| | seq | 0 | yes | 755/755 | no (see below) | yes |
| | collide | 100 | **no (timeout)** | 755/755 | no | **no** |
| | collide+fix | 0 | yes | 755/755 | = `seq` | yes |
| kitchen-sink dsd | full / seq | 0 | yes | 344/349 | yes | yes |
| | collide | 23 | **no (timeout)** | 349/349 | no | **no** |
| | collide+fix | 0 | yes | 344/349 | yes | yes |
| kitchen-sink scoped | collide | 23 | **no (timeout)** | 248/249 | no | **no** |
| | collide+fix | 0 | yes | 248/249 | = `seq` | yes |
| stress dsd (3 islands of slotted text) | collide / collide+fix | 48 / 0 | yes / yes | all | no / yes | - |
| stress scoped | collide / collide+fix | 48 / 0 | **timeout** / yes | all | no / = `seq` | - |

("adopted" counts the elements the server wrote that are still in the document after hydration, i.e. not thrown away and re-rendered;
the 5 and 1 missing on kitchen-sink are the same in the full render.) The four JS errors the client logs on kitchen-sink (two on list-50) are
the same in every row including `full`: `patch` on a null node in this Stencil beta's dev build, nothing to do with islands.

Collisions are not always loud: with a small shell (list-50 dsd) the ids overlap but the page hydrates and works, only the vnode-to-node
mapping differs. With more shell components (kitchen-sink) or any scoped-mode relocation, the client's `$orgLocNodes$` map (keyed by
`hostId.nodeId`, filled from the `o.` comments of the whole document) gets the other island's node and hydration never completes.

**Scoped mode**: `seq` (no collision) already hydrates to a different DOM than `full`: in the full render the light-DOM children of a
shadow component such as `ion-content` end up directly in its shadow root next to nothing else; in the islands page `ion-content` keeps
its `div#background-content` and `div.inner-scroll` and the children go into the slot. I did not investigate which is right: scoped
serialization of components that are `shadow: true` in the client build is a path nobody has exercised with Ionic. The recommendation
below is DSD only for islands.

> **Resolved in #206.** Which DOM is right: the one a client-only render builds. Stencil's dev client (`stencil build --dev`, used here) hydrates a *whole* scoped page to a wrong DOM (30,254 px from the client-only render on list-50: a blank page), and the production client (the `hydrateClient` build) hydrates the whole page and the islands page to the client-only DOM (0 px). On the engine as shipped the whole page and the islands page come to the same DOM on either client; the difference between them seen here was not reproduced. Islands work in scoped mode; see [islands.md](islands.md#scoped-mode).

### Smallest fix: `idBase` (prototype `make-idbase-hydrate.mjs`)

```js
// initializeWindow(win, doc, opts, results), in the hydrate app's runner
doc[STENCIL_DOC_DATA] = typeof opts.idBase === 'number'
  ? { hostIds: opts.idBase, rootLevelIds: opts.idBase, staticComponents: new Set() }
  : docData;
```

`renderToString(html, { idBase: 5000 })` numbers this render's hosts from 5001 and its root-level nodes likewise; without the option nothing
changes. This is a one-snippet guarded patch of the same kind as `ssr-patches.js` (anchor + exact-count swap + a guard test); it also
passes through `normalizeHydrateOptions` untouched. The engine gives the shell base 0 and island *i* `(i + 1) * stride`; a render whose
`hydratedCount` reaches the stride is detectable afterwards (`result.hydratedCount`) and should fail loudly or retry with a larger
stride. Other options I considered and dropped:

- *Post-pass rewrite* of the ids in the island html (add the offset to every `s-id`, `<!--r.N-->`, `c-id`, `o.`, `t.`, `s.`, `c.`): works on strings
  but is a second grammar to keep in sync with Stencil; the patch is simpler.
- *Sequential offsets* (island *i* starts where *i-1* ended): minimal ids, but serialises the renders, which is the point of the exercise.
- *Prefixing* instead of offsetting: the ids are dotted numbers the client splits on `.`, a prefix would need a client change.

Cost of the offset in bytes (`id-size.mjs`, shell + islands, stride 0 = colliding / 1000 / 10000 / 100000): list-50 dsd gzip 19906 / 19967 / 19916 / 19945;
kitchen-sink dsd 26533 / 26644 / 26651 / 26656; the scoped pages grow 2-4% gzipped (list-50 8999 -> 9157, kitchen-sink 9435 -> 9835 at stride 1000).
Negligible against the page; use a stride of 1000 and the overflow check.

Also found on the way: Stencil renders at most `maxHydrateCount` (300) components per `renderToString`; islands are separate renders, so
each gets its own budget (an incidental gain for long pages, and a limit to watch per island).

### A placement rule the prototype needed

The first kitchen-sink split put the header's toolbars in an island directly inside `<ion-header>`. After hydration `ion-header` was empty.
`ion-header` is a **non-shadow** component with a slot: Stencil annotates each light-DOM child with relocation ids (`c-id="0.692"`,
`s-sn`, a `<!--o.0.N-->` comment at the original place) so the client can find them again. The island marker is one such child; its
annotations vanish when the marker is replaced by the island's html, and the island's own roots carry none. Islands must therefore sit in a
plain element or a **shadow** host (`ion-content`, `ion-list`: DSD needs no relocation), or be the whole non-shadow component themselves
(the final split makes `<ion-header>...</ion-header>` the island, under `ion-app`). The engine can check this: after the shell render, a
marker that has a `c-id`/`s-sn` attribute or an `o.` comment pointing at it is in the unsupported place; fail with the island's name.

## 2. Styles per island

`styles-check.mjs`, both pages, both modes (full render vs islands page, shell in `<head>` as Stencil wrote it).

| | DSD | scoped |
|---|---|---|
| fragment html | `<style sty-id>` inside every instance's `<template shadowrootmode>`: list-50 island has 75 style tags for 25 items. Same as in a full document: identical | **no styles at all** (issue #131's note), 0 style tags |
| `result.styles` of a fragment | only the components that are not shadow-DOM (`ion-input`, 18.6 KB) and now and then an id-less rule (611 bytes with `ion-card`/`ion-input`) | every component the fragment used, `{ href, id, content }` |
| full document `<head>` | 3 style tags (list-50), 10 (kitchen-sink) | 7, 41 |
| shell alone, `<head>` | 2, 2 | 3, 9 |

Page-wide dedupe (`styleDeduper` in `stream.mjs`): remember the ids already on the page (the shell's `result.styles` first, as they are in
its head), and in front of each island write `<style sty-id="id">content</style>` for the ones not seen. The union of `sty-id`s equals the
full render's in all four combinations (no id missing, none only in the islands page, none repeated), and the page weighs the same
(list-50 dsd 1,014,242 vs 1,014,531 bytes; kitchen-sink scoped 241,221 vs 240,714).

Visual check, JavaScript off (what the server wrote), 520x900, `/mnt/project-files/perf/islands/*.png`:

| page / mode | pixels differing (sum of channel diff > 8) | computed styles differing (15 properties, every element incl. shadow) |
|---|---|---|
| list-50 dsd | 0 / 468,000 | 0 of 1007 |
| list-50 scoped | 0 | 50 of 755: `ion-item` `display: none` in the full render, `inline` in the islands page (see 3), no pixel effect |
| kitchen-sink dsd | 761 (0.16%) | 0 of 349 |
| kitchen-sink scoped | 0 | 0 of 249 |

The 761 pixels are the spinner and the animated skeleton: two renders of the *full* page differ by 566 pixels in the same place.

One client-side wrinkle: the Stencil client looks for `style[sty-id]` in `<head>`, not in the body, so after hydration it adds its own copy
of every style the islands wrote in the body (`style[sty-id]` count 5 -> 14 on kitchen-sink islands against 5 -> 10 for the full page).
Harmless (a few KB, parsed once), avoidable by a client change or by writing the styles into `<head>` when the head is not yet sent.

## 3. `<html>` and head

Rendering the shell as a document (what the prototype does) gives all of it for free. If the head is to be sent *before* anything renders,
the shell has to produce it itself:

- `<html lang="en" data-stencil-build="..." class="plt-tablet plt-desktop md hydrated" mode="md">`: `lang` is the input's,
  `data-stencil-build` the `buildId` option, `mode="md"` and `md` in the class come from Ionic's global script, `hydrated` from Stencil, and
  `plt-tablet plt-desktop` from the mock window's user agent (a server-side guess that the client replaces; the full render has the same
  string). Identical on `list-50`, `kitchen-sink`, and a document with no components, in dsd and scoped.
  `probeHtmlTag()` renders an empty document once at startup and takes the tag from it, instead of hard-coding what Ionic's global script does.
- `<head>`: whatever the template has (charset, viewport, title, the stylesheet `<link>`) is passed through. Stencil adds the styles of
  components used outside shadow roots (DSD: 2 style tags for either shell; scoped: 3 and 9 for the shell alone, 7 and 41 with
  the islands). Those cannot be known before the render; `streamEarly` writes them at the top of `<body>`.
- Nothing else is added: no script tag, no preload. The client bundle is the template's business.

An ancestor-dependent difference to know about: `ion-item` inside `ion-list` is rendered with `class="... in-list"`, `role="listitem"` and
`hidden=""`; rendered alone (the island does not contain the `ion-list`) it has none of them. After hydration `in-list` and `role` are
there (the post-hydration DOM equals the full page's modulo the `hidden` attribute), and the DSD page is pixel- and style-identical before
hydration. Two ways to avoid even that: make the island contain its context (`<ion-list>` is in the island, the shell has the page
layout around it), or render the island inside its ancestors and cut the wrapper out (not prototyped).

## 4. Streaming

`server.mjs` (Express; `node spike/islands/server.mjs <port> <workers> [dsd|scoped]`) has these routes, all gzip with
`Z_SYNC_FLUSH` after every chunk so the compression does not hold the bytes back:

| route | what it does |
|---|---|
| `/full/:page` | today: `stencilEngine({ workers })`, `res.render`, one response |
| `/noisl/:page` | shell + islands rendered in parallel on a pool of the same size, **assembled and sent as one response** (separates the effect of parallelism from that of streaming) |
| `/inorder/:page` | shell and islands are submitted at once; the shell up to the first island is written when the shell is done, then island *i* and the shell text up to island *i+1*, each when it is next in line |
| `/early/:page` | `/inorder` with the head written before anything renders (template head + probe `<html>` tag; the shell's styles at the top of the body) |
| `/ooo/:page` | the whole shell with `<template id="isl-i">` anchors at once, then every island the moment it finishes, in `<div hidden id="isl-c-i">...</div><script>$ISL(i)</script>`, a one-line script moving the children before the anchor |

The engine's pool does not return `result.styles`, `components` or `hydratedCount` yet, so `pool.mjs` / `pool-worker.mjs` are a copy of
its protocol with those fields added (the worker file is the same shape as `express-worker.js`); the baseline route uses the real
`stencilEngine`.

Out-of-order notes: islands are written into a hidden container in the normal document parse, so DSD in them parses (it would not inside
`<template>`: declarative shadow roots are not parsed in template content), and the script moves the nodes, shadow roots included. It
needs JavaScript and the fallback for no-JS is "island not shown" (an inline `<noscript>` style could reveal them; not done). `?delay=name:ms`
makes an island slow to show the point of out-of-order (an island waiting on a database).

Correctness (`stream-check.mjs`, Chromium, hydrating client): every route hydrates to the same DOM as `/full`, on both pages, including
`ooo` and `early`, with all server nodes adopted and the clicks working.

## 5. Measurements

Conditions: 2 workers (3 of the 4 vCPUs are shared with other jobs), gzip, one request at a time unless stated, 3 warm-up rounds, then
the routes visited round-robin with a rotating start. `list-50` / `kitchen-sink`, DSD.

### Server (`measure-server.mjs`, n = 25 per cell)

| | route | TTFB ms | last byte ms | gzip bytes | chunks |
|---|---|---|---|---:|---:|
| list-50 | full | 39.6 (34.7-89.7) | 41.7 (34.8-90.1) | 20,567 | 4 |
| | noisl | 32.4 (23.6-65.4) | 33.0 (23.7-65.9) | 20,574 | 4 |
| | inorder | **5.4** (3.3-22.1) | **30.0** (20.7-61.7) | 25,081 | 8 |
| | early | **2.5** (0.6-11.6) | 32.5 (18.5-66.0) | 25,127 | 10 |
| | ooo | 5.4 (2.7-15.0) | 34.0 (22.7-55.6) | 25,303 | 10 |
| kitchen-sink | full | 31.6 (22.7-42.4) | 33.0 (23.0-43.4) | 31,434 | 4 |
| | noisl | 27.3 (17.8-60.4) | 27.9 (18.2-61.1) | 31,920 | 4 |
| | inorder | **7.0** (4.1-13.9) | **23.2** (17.6-43.7) | 35,359 | 13 |
| | early | **3.5** (0.8-6.7) | 24.4 (17.3-43.1) | 35,398 | 15 |
| | ooo | 6.7 (4.5-15.0) | 24.6 (19.3-36.7) | 36,281 | 15 |

TTFB falls by 86-94% because the first byte no longer waits for a render, and the last byte by 28-30% against `full`, of which most (21% and
15%) is just rendering the pieces in parallel (`noisl`). Streaming itself costs nothing in latency but costs **bytes**: a sync flush per
chunk makes gzip 12-22% bigger (the dictionary is small, the chunks are small). A flush per island rather than per chunk and a higher
level would recover some; not tuned.

The cost side, throughput at concurrency 4 with the same two workers (`measure-throughput.mjs`, 3 rounds of 5 s per cell, requests/s):

| | full | noisl | inorder | ooo |
|---|---:|---:|---:|---:|
| list-50 | 53.6 (48.8-55.2) | 48.8 (48.4-52.6) | 51.0 (50.2-53.2) | 49.0 (48.2-49.6) |
| kitchen-sink | 82.6 (75.4-83.8) | 61.4 (60.0-68.2) | 64.6 (61.0-65.2) | 66.2 (63.2-67.0) |

Splitting a page into 4-5 renders pays the per-render fixed cost (new `MockWindow`, runtime rebuild, style setup, a worker round trip,
the shell is rendered with its islands' markers) that `docs/profile-ssr.md` puts at 6-7% of a render, once per piece. A saturated server
gets slower per page (-5..-9% on list-50, -20..-26% on kitchen-sink: the more, smaller pieces, the worse); an idle one gets faster. This is the
price of the latency win and the reason to cache islands (below).

### Browser (`measure-paint.mjs`, n = 9, cold cache each load, 414x800, PerformanceObserver `paint` and `largest-contentful-paint`)

The page is the server's html and Ionic's 38 KB stylesheet (render-blocking, as in a real app); no client bundle (section below).

No throttling:

| | full | inorder | early | ooo |
|---|---|---|---|---|
| list-50 FCP = LCP ms | 116 (92-132) | **76** (64-100) | **76** (52-100) | 88 (68-108) |
| kitchen-sink FCP ms (LCP) | 108 (88-120) | **68** (52-92) | **60** (40-84) | 72 (48-92) (LCP 80) |

'Fast 3G'-like (CDP `Network.emulateNetworkConditions`, 1.6 Mbit/s, 750 kbit/s up, 150 ms latency): **no difference**: list-50 540 / 544 / 548 / 540 ms,
kitchen-sink 532 / 544 / 536 / 528 (LCP of `ooo` 552). Reason, found by looking at `responseStart` (152 ms for every route): CDP's latency
delays the response by 150 ms from the request, and the server's render runs inside that window, so server time disappears from the
measurement. A more honest model splits the round trip: 75 ms before the request reaches the server (`UP_DELAY_MS=75` in `server.mjs`) and 75 ms
of CDP latency back, same bandwidth:

| | full | inorder | early | ooo |
|---|---|---|---|---|
| list-50 FCP ms | 480 (440-544) | 460 (428-512) | **440** (428-496) | 456 (448-524) |
| kitchen-sink FCP ms (LCP) | 492 (476-512) | 480 (472-496) | **468** (456-492) | 464 (452-488) (LCP 484) |

On that profile the best case (`early`) is 5-8% better, with ranges that overlap: a real but small effect, because here 38 KB of
render-blocking CSS at 200 KB/s plus two round trips is most of the 450-500 ms and the server render is 30-40 ms of it. (The first rows of
this table ran while the client bundle was building on the same machine, hence the wide list-50 ranges.) The benefit scales with the
server's render time: on this fast machine and these cheap pages it is the 35-45% of the unthrottled table or 5-8% on slow mobile, and a page
that takes 300 ms to render would save most of that on both. `ooo` pays for its swap: the first content paint waits for the first island.

### Client hydration (`measure-client.mjs`, dev client build, n = 7, 414x480, CDP `Performance.getMetrics`)

How the Ionic client is built here: **the lazy loader** (`dist/ionic/ionic.esm.js` 49 bytes -> `ionic.js` 25 KB loader + 52 `*.entry.js`,
872 KB, grouped by the `bundles` of `stencil.config.ts`: `ion-item`, `ion-label`, `ion-list`, `ion-note`... are one entry; a group loads
when the first host of one of its tags connects), **the custom-elements build** (95 per-component modules + shared chunks, 1.08 MB in
prod, `defineCustomElement()` each; this is what the experiment uses), and the stencilrs Vite build (one `ionic.js` of 1.1 MB that
registers everything eagerly, hydration code compiled out in this harness). Per-island chunking therefore needs: the island's tag list
(the render result has it: `result.components`) and a way to load exactly those tags' modules, which the per-component build already has and
the lazy loader only at the granularity of its bundle groups.

`client-boot.mjs` adds the directives on top of the per-component build: the server tags the top-level elements of each island
`data-island="name" data-client="load|idle|visible|static"` (no wrapper element: it would break `::slotted` and slot assignment); `boot()`
wraps `customElements.define` so a host inside an island that is not active yet is parked in `connectedCallback`, and connects the parked
hosts when the island activates (`load`: at boot; `idle`: `requestIdleCallback`; `visible`: `IntersectionObserver`; `static`: never), loading
`import(tag.js)` only for tags an active island needs. Variants of the same server html: **all** (every island `load`), **static** (the deferred
islands never hydrate), **visible** (they hydrate when scrolled into view). Deferred: kitchen-sink `form` + `rest`, list-50 `b` (25 of 50 items,
shared tags). Scripting is `ScriptDuration`; ready is the time from the boot script's start to `componentOnReady` of every active host.

| page, CPU | variant | script ms | main-thread task ms | ready ms | JS (files, KB) | DOM nodes | JS heap MB |
|---|---|---|---|---|---|---:|---:|
| kitchen-sink 1x | all | 67 (60-71) | 249 | 226 (213-250) | 101, 1260 | 1319 | 6.0 |
| | static | **32** (29-37) | 158 | **138** (121-149) | **56, 537** | 1151 | 3.8 |
| | visible | 55 (48-59) | 218 | 140 (123-155) | 94, 1195 | 1251 | 5.2 |
| | visible, after scrolling `rest` in | +11 (10-15) | | | +7 files | | |
| kitchen-sink 4x | all | 286 (253-315) | 1087 | 841 (735-912) | same | 1315 | 6.1 |
| | static | **139** (131-186) | 734 | **482** (460-580) | | 1147 | 3.8 |
| | visible | 224 (215-244) | 908 | 496 (446-577) | | 1251 | 5.2 |
| | visible, after scrolling | +50 (45-78) | | | | | |
| list-50 1x | all | 73 (72-82) | 204 | 149 (142-159) | 33, 397 | 3105 | 4.9 |
| | static (island b) | **43** (39-58) | 167 | 132 (111-154) | 33, 397 | 2755 | 3.8 |
| | visible | **41** (38-55) | 167 | 140 (125-162) | 33, 397 | 2755 | 3.8 |
| | visible, after scrolling b in | +18 (16-23) | | | | | |
| list-50 4x | all | 398 (336-506) | 1026 | 617 (525-685) | | 3105 | 4.9 |
| | static | **193** (185-214) | 792 | 474 (434-511) | | 2755 | 3.7 |
| | visible | **200** (194-215) | 783 | 485 (447-532) | | 2755 | 3.8 |
| | visible, after scrolling | +87 (78-98) | | | | | |

Read it as: leaving two of four islands alone halves scripting (-52% at 1x and 4x), drops 57% of the JS bytes and 45 of 101 requests
(kitchen-sink: those islands own six tags nobody else uses, and the cards), and brings the page to "ready" 39-43% sooner. On list-50 the
two islands share all tags, so no code is saved, but half the instances are not hydrated: scripting -41/-51%, 350 fewer DOM nodes
(the shadow roots the client does not build), 1.1 MB less heap. `visible` costs the same at boot as `static` for the deferred part and
pays it back when the island scrolls in (+11 ms / +50 ms at 4x on kitchen-sink; +18 / +87 ms on list-50), never earlier than needed. (On kitchen-sink
the `form` island was in the 480 px viewport and activated at boot, so the `visible` row defers only `rest`; the file/byte numbers show it.)
These are dev-build numbers (unminified code, `isDev` checks on): the ratios are the point, not the absolute ms; a production client with
hydration compiled in could not be built here (Stencil's own `ssr` target fails against the ionicons collection; see above).

## Beyond the plan: gains

1. **Cacheable islands.** The render cache (`render-cache.js`) keys on html + options; an island is a smaller, more static unit than a
   page: a header, nav, footer or product card repeats between pages and users. With `idBase` fixed per slot (island *i* of the template),
   its html is valid wherever it is cached, and a page's render cost becomes the cost of its dynamic islands only. Not measured; it is
   the way back to the throughput lost above (the throughput table is the all-miss case).
2. **Fewer annotations for static islands** (`annotation-size.mjs`): hydration ids on an island that is never hydrated are dead weight.
   Dropping `s-id`, `c-id`, `s-sn`, `s-mode` and the `<!--r. o. s. t. c.-->` comments: DSD -2% raw / -8..-21% gzip; scoped -34..-37% raw / -39..-71% gzip.
3. **Per-island hydration cap** (`maxHydrateCount` 300 per render) stops being a page limit.
4. **Smaller live DOMs per render.** `docs/profile-ssr.md` attributes 10-16% of render CPU to scavenges that copy the live DOM; islands render
   several small documents. Not isolated here (the throughput table includes it and is a net loss), so I would not count on it.
5. **Priority and failure isolation.** An island that needs a slow data source does not delay the shell (out-of-order with `?delay=`), and one that
   throws can fall back to its placeholder instead of failing the page (not prototyped).
6. **Early head** is the cheapest part: the head and the stylesheet link leave before any render, so the browser fetches the CSS in parallel
   with the server (the 5-8% on the 3G profile, bigger the slower the render).

## Proposed API

Template: islands are marked in the view, wrapper-less in the output.

```html
<!doctype html>
<html lang="en">
<head>...<link rel="stylesheet" href="/ionic.css"><script type="module" src="/islands.js"></script></head>
<body>
<ion-app>
  <stencil-island name="header" client="load">   <!-- or: idle | visible | static | none (default load) -->
    <ion-header>...</ion-header>
  </stencil-island>
  <ion-content>
    <stencil-island name="feed" client="visible" cache="60">...</stencil-island>
    <stencil-island name="footer" client="static" cache>...</stencil-island>
  </ion-content>
</ion-app>
```

Engine (all optional; absent = today's behaviour, `renderToString` of the whole view):

```js
const engine = stencilEngine({
  hydrate, workers: 'auto', renderCache: true,
  islands: { stream: 'in-order' | 'out-of-order' | false, earlyHead: true, idStride: 1000 },
});
app.get('/', (req, res) => res.render('home', locals));           // islands render in parallel, one assembled response
app.get('/s', streamView(engine, 'home', locals));                 // chunks flushed as they finish (engine.stream(path, locals) is the async iterable)
```

`renderOptions` gain `idBase` (the patch, section 1) and the engine hands `result.styles`, `components`, `hydratedCount` to the island
layer. The island's html is the fragment render with the shell's marker removed, the roots tagged `data-island` / `data-client`, the styles
that are new for the page written in front of it. Client: `@popcorn245/stencilrs/islands` (about 1.5 KB, `client-boot.mjs` is the
draft): the five directives above on the custom-elements build, with the island -> tag lists in a manifest.

## Follow-ups 8 and 9, built (#195)

The directives, the `connectedCallback` gate, the island to tags manifest and the `ready` events are `islands-client.js` and the engine's `islands.client` (docs/islands.md); the per-island
unit is the `hydrateClient` build's per-tag module, resolved per page from `result.components`. Measured (`examples/ionic/bench-islands-client.mjs`, production build, minified,
Chromium, 414x480, interleaved rounds, n=15, medians; kitchen-sink with `form` and `rest` deferred, list-50 with `b`): script time is CDP `ScriptDuration`, ready is from navigation until the shell and the
`load` islands are ready.

| | script ms | ready ms | JS requested (gzip) | HTML gzip |
|---|---|---|---|---|
| kitchen-sink, spike boot, all `load` | 126 (105-182) | 452 (369-616) | 634 KB (162 KB), 118 files | 33,237 B |
| kitchen-sink, spike boot, deferred static | 73 (60-106) | 313 (258-398) | 335 KB (97 KB), 74 files | 33,248 B |
| kitchen-sink, new client, all `load` | 98 (84-159) | 331 (293-448) | 638 KB (164 KB), 119 files | 33,090 B |
| kitchen-sink, new client, deferred static | 57 (55-87) | 237 (193-329) | 339 KB (99 KB), 75 files | 31,252 B |
| list-50, spike boot, all `load` | 104 (79-157) | 283 (259-370) | 228 KB (66 KB), 38 files | 21,628 B |
| list-50, spike boot, `b` static | 67 (53-88) | 257 (190-301) | 228 KB (66 KB), 38 files | 21,641 B |
| list-50, new client, all `load` | 83 (72-100) | 181 (142-237) | 232 KB (67 KB), 39 files | 20,565 B |
| list-50, new client, `b` static | 63 (46-93) | 163 (129-198) | 232 KB (67 KB), 39 files | 18,298 B |

Static against all-load on kitchen-sink: script -42% (new) and -42% (spike), JS -47% and -47%, ready -28% and -31%; the spike's dev-build figures were -50%, -57% and about -40%. On list-50 `b` uses the
tags `a` already loads, so no code is saved and only the hydration work is: script -24%, ready -10% (inside the noise: the ranges overlap). The new client's `all` against the spike's `all`: script -22%, ready -27%;
the two boots differ in the loader (one define pass, `modulepreload` of the modules and their chunks, the ready measure) and the contributions were not separated, so it is not a measure of the directives. The visible variant (`form` and
`rest` visible, scrolled to at the end) hydrated the part of `form` that was in the first viewport at once and the rest on scroll: +13 files, +13 ms script (10-23).

## Follow-up issues (sizes: S under a day, M a few days, L a week or more)

1. **`idBase` render option as a guarded `ssr-patches.js` patch**, with a differential test (`idBase` unset is byte-identical) and a guard test. S.
2. **Fragment API on the engine**: `renderFragment`/pool protocol returning `{ html, styles, components, hydratedCount }`, `idBase` per call; worker and in-process. S-M.
3. **Island extraction from views**: `<stencil-island>` scan (tokenizer-aware: not inside `<script>`/`<style>`/comments; nesting rejected), shell/islands split, placement check (marker with `c-id`/`s-sn` after the shell render is an error naming the island), root tagging, stride overflow check. M.
4. **Streaming responder**: `engine.stream()` + Express helper, in-order, gzip flush policy (flush per island, not per chunk; measure), error handling when an island throws after bytes are sent (replace by its fallback; log), `res` close/abort cancels pending renders. M.
5. **Out-of-order mode + no-JS story** (`<noscript>` reveal), and CSP/nonce for the one inline script. M.
6. **Early head**: probe `<html>` tag at startup (invalidate on `buildId`/mode/lang change), head styles at the top of the body, option to disable. S.
7. **Per-page style dedupe + the client's duplicate `style[sty-id]` in the body** (a Stencil client lookup change, or hoist). S-M (the second part touches Stencil's runtime: upstream or a client patch).
8. **Client directives** (`@popcorn245/stencilrs/islands`): the five directives, the `connectedCallback` gate (needs a supported hook from Stencil, or a guarded client patch), the island -> tags manifest from `result.components`, `ready` events. M-L.
9. **Per-island client chunking**: a manifest of tag -> module for the custom-elements build, and a decision on the lazy loader (its bundle groups are coarser than islands). L.
10. **Island render cache**: key on (island html, options, slot index), `cache` attribute, ttl, interplay with `idBase` slots; benchmark against the throughput loss. M.
11. **Scoped mode** (done, #206): why a full scoped page hydrates to a different DOM than islands in scoped mode (the dev client), and islands in scoped mode. M.
12. **Context-carrying islands**: wrap an island in its ancestors for rendering and cut the wrapper out (restores `in-list`/`role` in the server html). M, only if the pre-hydration difference matters.
13. **Docs + an example app** (`examples/` Express page with a slow island), reference for the directives. S.
14. **Throughput**: islands multiply the per-render fixed cost; any work from #182/#189 (shared window, cheaper runtime setup) pays out here first. Tracked there.

## Risks

- **Stencil internals**: the `idBase` patch edits text of the runner (guarded, like the others), and the client gate wraps `connectedCallback` of
  custom elements Stencil generates. Both can break on a Stencil upgrade; the guards make that a build error, not a silent one.
- **Hydration ids are a contract between server and client.** A cached island rendered with a different `idBase`, or two islands whose
  stride overlaps, wedges the page with no error (components never become ready). The stride check and a per-page overlap assertion in dev
  are not optional.
- **Slot relocation** across the island boundary (non-shadow slot hosts) loses content after hydration; needs the placement check.
- **Ancestor-dependent rendering** (`in-list`, `hostContext` of `ion-item` etc.) is missing from island html; the client fixes most of it on
  hydration, but the server html differs from the full render.
- **Throughput**: more renders per page, 5-26% fewer pages per second on a saturated server for the pages measured; wins latency, loses
  capacity unless islands are cached or the per-render cost falls.
- **Bytes**: sync flushes cost 12-22% of gzip size. A CDN or proxy that buffers the response (`nginx` without `X-Accel-Buffering: no`, many
  CDNs by default) turns streaming into one late response again; the parallel-render win remains.
- **Client gating is a prototype.** `visible` and `static` worked on Ionic's per-component build, but `static` only saves code for tags used by no
  other island, and a custom element upgrades everywhere or nowhere, so per-instance control is a patch of `connectedCallback`, not a platform feature.
- **Everything measured here is Ionic on a shared 4-vCPU container, dev client build, a 2-worker pool, DSD.** Scoped mode, a minified
  hydrating client build, real network and a CDN were not measured; the paint results on the 3G profile are small and inside the spread of some cells.
- **What did not work as hoped**: collisions are not benign (they wedge hydration); the CDP 'Fast 3G' profile alone hides all server-side gains;
  Stencil's own `ssr` output target does not build against the ionicons collection in this harness (so no minified hydrating client build);
  scoped-mode hydration of full pages already produces an odd DOM, independent of islands.
