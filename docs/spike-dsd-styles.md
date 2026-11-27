# Spike: per-shadow-root styles in declarative shadow DOM output

Question: DSD output repeats each component's full `<style>` inside every shadow root (Ionic `list-50`: ~1 MB of HTML against ~127 KB
scoped, ~21 KB gzip). What does that cost the browser, and which spec-compliant alternative is cheaper?

Short answer: the browser cost is small (parse and style recalc differences are within noise on desktop, a few ms on a throttled phone);
what the inline styles cost is **bytes**: 91% of list-50's raw HTML, 65% of its gzip. A `<link rel=stylesheet>` per shadow root removes
them, is standards-based, hydrates unchanged, and wins on repeat-heavy pages, but costs extra requests and a later complete first paint on
pages of many one-off components. See the verdict.

## Inventory (what is inline per shadow root)

Ionic 9.0.12 hydrate app (`examples/ionic`, `npm run build:hydrate`, pages of `ssr-pages.mjs`, `prettyHtml: false`), DSD mode:

| page | HTML | gzip | shadow roots | `<style>` in roots | style bytes in roots | distinct sheets (bytes) | everything else |
|---|---:|---:|---:|---:|---:|---:|---:|
| list-50 | 1,014,264 | 21,143 | 151 | 151 | 919,857 (90.7%) | 4 (20,676) | 94,407 |
| kitchen-sink | 360,502 | 31,334 | 74 | 74 | 323,311 (89.7%) | 31 (94,097) | 37,191 |
| list-50, `scoped` (reference) | 126,867 | 14,015 | 0 | 0 | 0 | | |
| kitchen-sink, `scoped` (reference) | 240,556 | 30,427 | 0 | 0 | 0 | | |

list-50 repeats `ion-item` (9,749 B) 50 times, `ion-toggle` (7,545 B) and `ion-badge` (943 B) the same: 4 distinct sheets, 151 copies.
kitchen-sink uses most components once, so only the repeated `ion-item` (3x) and a few others duplicate: its inline cost is mostly the
sheets themselves (distinct 94 KB), gzip already dedups what repeats.

stencilrs runtime (`runtime-server.js`, `examples/starter/bench/load`): the shipped page uses `scoped` components, so it has **one**
`<style>` in the head and no per-root styles (178,837 B, 16,275 B gzip). Turning `load-card` into a shadow component (500 cards, 177 B of
CSS) gives 298,337 B / 17,447 B gzip, 500 roots each with its own `<style sty-id>` (88,677 B, 30% of the page). The same code path
(`<template shadowrootmode>` then `<style sty-id>`), so the same fix applies; the prototype below turns that page into 230,337 B with one
shared sheet.

## Variants

All pages are the hydrate app's own output, post-processed (`spike/dsd-styles/build-variants.mjs`); the Ionic global stylesheet
(`ionic.bundle.css`, 38.7 KB, 6.1 KB gzip) is a local `<link>` in `<head>` for all of them, JavaScript is off on the page, and a/b/c
render pixel-identical frames (`shots.mjs`).

| id | what | standard? |
|---|---|---|
| a-inline | today: `<style sty-id>` first child of each shadow root | yes |
| b-link | `<link rel=stylesheet href=/c/<id>.<hash>.css sty-id=<id>>` in each shadow root | yes, all evergreen browsers |
| b-preload | b plus `<link rel=preload as=style>` per distinct sheet in `<head>` | yes |
| e-hybrid | b, but only sheets that start 3+ roots (`minUses: 3`); one-offs stay inline | yes |
| c-module | declarative CSS module scripts: `<style type=module specifier=x>` once, `shadowrootadoptedstylesheets="x"` per root | **no**: see below |
| d-scoped | Stencil `scoped` mode (reference): no shadow roots, one `<style>` per component in the head | yes; but not equivalent (below) |

### Variant c: declarative CSS module scripts, status

Checked here: Chromium 158.0.8127.36 (Chrome for Testing). `<style type=module specifier>` + `shadowrootadoptedstylesheets` does nothing
by default (the styles are not applied, `HTMLTemplateElement.shadowRootAdoptedStyleSheets` does not exist) and works with
`--enable-experimental-web-platform-features`, which is how c-module was measured. From a web search (the primary pages, groups.google.com
and the Edge explainer on github.io, are not reachable from this container, so these are second-hand and worth re-checking at
chromestatus.com): an Intent to Prototype (Sept 2025) listed Gecko "no signal" and the TAG review (w3ctag/design-reviews#1000, a follow-up
in #1195) still open; an Intent to Experiment (30 March 2026) with an origin trial; Microsoft Edge runs an origin trial for "Declarative CSS
Module Scripts" listed as ending 6 October 2026. Firefox has tentative WPT tests for `shadowrootadoptedstylesheets` but no shipping
statement; no information found for Safari. Verdict: experiment / origin trial only, one engine, not shippable, and the attribute and
element names may still change. **Do not ship; revisit when it is in stable Chrome and has a Firefox/WebKit position.** The existing
`adoptedStyleSheets` JS API needs script and is what Stencil's client uses after hydration (so the sharing the proposal gives the page is
already there once JS runs; the problem is only the bytes before it).

### Variant d: `scoped` as a reference only

`scoped` output has 1 style per component in the head and no `<template>`s, but it is not a drop-in for no-JS first paint: with
JavaScript off, the scoped list-50 does not render its items at all and kitchen-sink is mostly unstyled (screenshots in the
spike's `shots.mjs`; FCP is `n/a` in the tables). Scoped output relies on the client to finish layout. It is the byte floor, not an
alternative with the same behaviour.

## Method

`examples/ionic/spike/dsd-styles/`:

```sh
cd examples/ionic && npm ci && npm run fetch && npm run migrate && npm run build:hydrate && npm run build:stencilrs
node ssr-bench/html.mjs dist/hydrate-stencilrs/index.js $OUT                 # all pages, both modes
node spike/dsd-styles/build-variants.mjs $OUT                                 # variants + /c/ sheets + ionic.bundle.css
node spike/dsd-styles/feature-test.mjs                                        # what this Chromium supports
node spike/dsd-styles/shots.mjs $OUT $OUT/shots list-50                       # pixel equality of the variants
node spike/dsd-styles/fouc.mjs $OUT $OUT/shots list-50                        # sheets 1.2 s late: what is on screen at 600 ms
H2=1 CERT_DIR=<dir with key.pem cert.pem> node spike/dsd-styles/bench.mjs $OUT --runs 9     # h2 (use no H2 for HTTP/1.1)
CHROME_ARGS=--enable-experimental-web-platform-features node spike/dsd-styles/bench.mjs $OUT --runs 9 --variants a-inline,c-module
node spike/dsd-styles/memory.mjs $OUT --runs 7
node spike/dsd-styles/hydrate-check.mjs $OUT list-50                          # client hydration over each variant
```

`bench.mjs`: Chromium 158 (system Chrome for Testing, Playwright 1.64.1), local server with gzip level 6, HTML `no-store`, sheets
`max-age=3600`. Cold = fresh context per load; warm = same context, one priming load, then the measured load (HTML refetched,
stylesheets and `ionic.bundle.css` from cache). Desktop = no throttling; mobile = 4x CPU, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up
(docs/runtime.md). Variants interleaved per round, 9 rounds (the HTTP/1.1 first run: 11), one untimed round before. FCP/DCL are from an
untraced pass; Parse HTML (`ParseHTML`) and Recalculate Style (`UpdateLayoutTree`) are summed from a `devtools.timeline` trace in a second
pass (tracing perturbs time, so not mixed). "transferred" is the sum of `encodedDataLength`, i.e. with headers. Median (min-max) in the
raw output (`bench-*.jsonl`); the tables give medians. Load average of the 4-vCPU box during the runs: 0.4-2.7 (other work shared the
box in the first, HTTP/1.1 run, whose ranges are wider; the h2 run is the one tabulated). Anything inside the ranges is noise.

HTTP/1.1 vs h2: the first run used Node's `http` (6 connections per origin), which makes 31 small sheets look expensive; real sites
serve h2/h3, so the tables below are from an h2 run (`node:http2` with a self-signed certificate; `--ignore-certificate-errors` is
Playwright's `ignoreHTTPSErrors`). The HTTP/1.1 consequence is in the notes.

## Results

HTML bytes are the page alone. Transferred is cold / warm, the whole load (page + `ionic.bundle.css` + shared sheets). FCP in ms,
median, cold/warm. Parse and Recalc are ms of main-thread time from the trace, median of the cold load (the warm ones are in the raw
files and agree in direction). "Styled" is when the last shared sheet arrived (the first frame with every shadow root styled can't be
earlier; `-` = nothing to wait for).

### list-50 (151 shadow roots, 4 distinct sheets), h2

| variant | HTML raw | HTML gz | transferred cold / warm | FCP desktop cold/warm | FCP mobile cold/warm | styled (mobile cold) | Recalc style desktop / mobile | Parse HTML desktop / mobile |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| a-inline | 1,014,264 | 21,143 | 26.8 KB / 20.6 KB | 72 / 68 | 488 / 236 | - | 4.3 / 34.0 | 7.4 / 41.2 |
| b-link | 107,071 | 7,918 | 19.3 KB / 7.9 KB | 68 / 60 | 524 / 296 | 430 | 4.6 / 27.8 | 5.5 / 37.9 |
| b-preload | 107,350 | 7,960 | 19.3 KB / 8.0 KB | 64 / 56 | 484 / 268 | 397 | 4.6 / 34.5 | 5.6 / 43.7 |
| c-module (flag; HTTP/1.1 run) | 121,935 | 11,555 | 18.1 KB / 11.8 KB | 60 / 68 | 524 / 304 | - | 4.9 / 26.9 | 11.3 / 38.5 |
| d-scoped (reference; FCP n/a with JS off) | 126,867 | 14,015 | 20.3 KB / 14.1 KB | n/a | n/a | - | 1.0 / 5.2 | 3.7 / 19.6 |

### kitchen-sink (74 shadow roots, 31 distinct sheets), h2

| variant | HTML raw | HTML gz | transferred cold / warm | FCP desktop cold/warm | FCP mobile cold/warm | styled (mobile cold) | Recalc style desktop / mobile | Parse HTML desktop / mobile |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| a-inline | 360,502 | 31,334 | 37.6 KB / 31.4 KB | 64 / 44 | 492 / 232 | - | 12.2 / 88.7 | 7.8 / 51.2 |
| b-link (33 requests) | 95,768 | 12,330 | 44.1 KB / 12.4 KB | 88 / 48 | 576 / 252 | 659 | 13.8 / 70.5 | 7.8 / 59.9 |
| b-preload | 98,000 | 12,568 | 44.3 KB / 12.7 KB | 84 / 44 | 652 / 296 | 644 | 12.4 / 65.2 | 8.1 / 58.3 |
| e-hybrid (links for 3+ uses; 7 requests; a separate h2 run) | 188,147 | 23,101 | 34.6 KB / 23.2 KB | 68 / 40 | 452 / 272 | 430 | 12.6 / 55.6 | 8.0 / 46.9 |
| c-module (flag; HTTP/1.1 run) | 188,617 | 25,038 | 31.6 KB / 25.3 KB | 76 / 60 | 576 / 376 | - | 12.1 / 95.0 | 24.6 / 94.1 |
| d-scoped (reference) | 240,556 | 30,427 | 36.7 KB / 30.5 KB | 48 / 36 | 424 / 328 | - | 2.8 / 18.4 | 9.0 / 43.8 |

(The a-inline row beside e-hybrid in its run: mobile cold FCP 472 (460-632), Recalc 85.7, Parse 47.1, transferred 37.6 KB: same as above.)

Memory (`memory.mjs`, fresh Chromium per sample, renderer RSS after load minus after about:blank, 7 samples): list-50 a-inline +26.9 MB
(26.8-27.7), b-link +26.0 (25.6-26.4); kitchen-sink a-inline +30.7 (30.3-31.5), b-link +32.5 (31.4-32.9). That is -3% and +6%: The small
difference suggests Chromium does not keep 151 separate parsed sheets for identical inline text (not verified), so the copies cost mostly DOM nodes and strings. (scoped:
+10.5 / +19.0 MB, but it also has no shadow roots and no JS-off content.) RSS is coarse; read it as "no memory win".

### What the numbers say

- **Bytes**: b-link cuts the list-50 page from 1,014 KB to 107 KB (-89%) and from 21.1 KB to 7.9 KB gzip (-63%); transferred in a
  warm load 20.6 KB -> 7.9 KB (-62%), cold 26.8 -> 19.3 KB (-28%). On kitchen-sink the page gz falls -61% (31.3 -> 12.3 KB) but the *cold*
  load transfers **more** (+17%: 31 separately gzipped sheets with headers), warm -60%.
- **FCP, Parse HTML, Recalc style**: on desktop all within noise (FCP 64-88 ms, ranges overlap; Parse 7.4 vs 5.5 ms, Recalc 4.3 vs 4.6).
  On the throttled phone, b-link looks better on Parse+Recalc (list-50: 41+34 -> 38+28 ms; kitchen-sink recalc 89 -> 71 ms), but the
  ranges overlap and b-preload (same output plus preload tags) is not better, so I do not claim it. What is clear: **inline styles are not
  a CPU problem in Chromium**; parsing 1 MB of mostly CSS costs ~7 ms on desktop and ~40 ms at 4x.
- **First paint is not blocked, but a section stops painting until its sheet arrives.** `fouc.mjs` (sheets served 1.2 s late): with
  b-link nothing is on screen at 600 ms and FCP is 1,244 ms, with no unstyled frame (a-inline is styled at once). Chromium treats the
  parser-inserted `<link rel=stylesheet>` in a shadow root as render-blocking for the content after it; `blocking=render` is not needed
  and changes nothing. There is **no FOUC in Chromium**, but the first view is complete only when the sheets are: mobile cold +40 ms
  (list-50, one RTT) to +170 ms (kitchen-sink, 31 sheets) over h2, and on HTTP/1.1 kitchen-sink mobile cold the last sheet arrives at
  1,190 ms against 480 ms (DCL 1,213 vs 321 ms). Warm loads are not affected (cached sheets).
- `<link rel=preload>` of the sheets does not help (same FCP, within noise); the parser reaches the links as soon as the head is done.
- e-hybrid (sheets used 3+ times linked, the rest inline) is the best trade on a mixed page: kitchen-sink HTML 360 -> 188 KB, 7 requests
  instead of 33, cold transfer -8%, warm -26%, "styled" 430 ms (as late as `ionic.bundle.css`, so no extra wait).
- c-module (flag, one engine, not shippable): bytes are good (list-50 gz 11.6 KB, no requests), but Parse HTML on kitchen-sink got *worse* in
  Chromium (24.6 ms desktop vs 7.8; 94 vs 47 ms mobile), because the head carries all 31 module definitions; it also gains nothing over b-link on
  list-50. Another reason not to chase it.

### Hydration (variant b with the client)

`hydrate-check.mjs`, the stencilrs-built Ionic client (`dist-stencilrs`) over each variant, JS on. Stencil's `addStyle` (read in
`@stencil/core/dist/client-*.mjs`): for a shadow component with a constructable sheet it adopts the sheet and, for `hydrateClientSide`,
removes `shadowRoot.querySelector('[sty-id="<id>"]')` (the server's `<style>`); the lookup is by attribute, not by tag, which is why the
prototype keeps `sty-id` on the `<link>`. Result, list-50 (151 roots) and kitchen-sink (58 after hydration), for a-inline / b-link / b-preload /
b-link without `sty-id`: 0 page errors; all server elements kept (1767 of 1767, 638 of 638), `hydrated` count identical, the hydrated
`ion-toggle` toggles, adopted sheets = roots (so no extra duplicates from b), and the server's `<style>`/`<link>` is still in each root
2 s after hydration in **all four**, including today's a-inline (the removal runs in a write task I did not chase; same for `<link>` as for
`<style>`, and a link whose `sty-id` is missing is also kept without side effects). So b does not break hydration and does not add
duplicates over today. It does keep the shared sheet fetched even though the client adopts its own copy from JS; that is the same bytes
twice in memory as today's inline `<style>` + adopted sheet.

### Other browsers (not measured here: only Chromium is installed)

- `<link rel=stylesheet>` in a shadow root is valid and works in all evergreen browsers (Chrome, Firefox, Safari). Same URL in many roots
  is fetched once (list-50: 4 sheet requests for 151 roots, in `hydrate-check.mjs`).
- Render blocking: the HTML Standard defines a link's implicit render-blocking for parser-inserted links *in `<head>`*; a link in a shadow
  root inside `<body>` is, per spec, not render-blocking. Chromium's behaviour above (content after a pending body stylesheet is not
  painted) is its own "body stylesheet" blocking. I did not verify Firefox or WebKit; they may paint the shadow content before the sheet
  arrives, i.e. a possible FOUC there, mitigated by `blocking=render` (Chromium 105+; check support in the other engines) or by keeping
  above-the-fold roots inline (the `minUses` idea turned around). Treat cross-browser FOUC as the open risk of variant b.

## Prototype (opt-in, default output unchanged)

- `ssr-shadow-styles.js`, exported from `@popcorn245/stencilrs/ssr`: `createShadowStyleStore({ base: '/c/', max })` and
  `externalizeShadowStyles(html, store, { preload, minUses })`: rewrites the leading `<style sty-id>` children of each
  `<template shadowrootmode>` into `<link rel=stylesheet href=/c/<id>.<hash>.css sty-id=<id>>`, and leaves head styles and scoped styles alone. The
  store holds the sheets (content-hashed names, FIFO bounded) and `store.middleware()` serves them `public, max-age=31536000, immutable`.
- `stencilEngine({ shadowStyleLinks: true | { base, max, preload, minUses } })` (express.js): applies it to whole-page renders (not scoped
  pages, not islands), `engine.shadowStyles` is the store (`app.use(store.base, store.middleware())`).
- It is a post-process of the serialized HTML (regex, one pass), not a serializer change, so it also works on `runtime-server.js`
  output (checked: the 500-card shadow page 297,337 -> 230,337 B, one `load-card.<hash>.css`). Cost: 4.3-5.2 ms for list-50 (1 MB in) next
  to a 32 ms render, ~14%; a serializer-level version would avoid building the strings at all and cost about nothing, and the render
  cache (`renderCache`) stores the post-processed HTML.
- Tests: `test/ssr-shadow-styles.test.js` (8 tests: rewrite, hashing, preload, middleware, `minUses`, option on a real hydrate app).
  Also run: `ssr-serializer`, `engine-fragment`, `islands-engine`, 58 tests, all pass.

## What is left

- Cross-browser FOUC/render-blocking behaviour (Firefox, WebKit); only Chromium was available.
- A serializer-level implementation (avoid the second pass), and sharing the sheets across pages of one app: one file per component is what
  a build could emit once (`/c/<tag>.<hash>.css`) instead of the server learning them at render time, so the first request for the page
  and its sheets could be parallelised by `Link: <...>; rel=preload` headers / 103 Early Hints (not measured).
- Stencil's client keeps the server's `<style>` next to the adopted sheet after hydration (also today): a few hundred KB of DOM text on
  list-50 that could be freed.
- `blocking=render` and critical-roots-inline variants.

## Verdict

**Build it, as an opt-in with a threshold, not as the default.** Effort S (done as a prototype; a serializer-level version and
Early Hints, M).

- Use `shadowStyleLinks: { minUses: 2 or 3 }`: it removes the repeat (list-50: -89% raw, -63% gz HTML, -62% warm transfer) without turning a
  page of one-off components into 30 requests. Plain `shadowStyleLinks: true` is right for lists/tables of one component repeated, wrong for a
  kitchen-sink page cold on a slow network (+17% bytes, +170 ms to the first complete view on h2, +700 ms on HTTP/1.1).
- Not worth it for the browser's CPU or memory: parse/recalc/memory differences are within noise or a few ms. If the aim is only wire bytes, gzip
  already removes most of the repeat (list-50: 21 KB gzip, 8 KB with links); the raw 1 MB matters for memory in proxies/caches, the
  streamed parse, and servers that don't compress.
- Spec notes: standards-only (`<link rel=stylesheet>` in a shadow root; hydration unchanged with `sty-id` kept on the link); nothing
  non-standard is shipped. Declarative CSS module scripts (`shadowrootadoptedstylesheets`) are the right long-term answer but are flag/origin-trial in one
  engine today: wait. Risks: cross-browser FOUC (unverified), a cache/CDN/CSP concern (`style-src` must allow the sheet origin; inline `<style>` needs `unsafe-inline` or a
  nonce today, so links can be an improvement), sheet store lifetime (a content-hashed name that has been evicted 404s: keep the store at least as long as the
  longest-lived cached page, or build the sheets at build time).
