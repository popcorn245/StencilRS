# Profile: cold `vite build` and cold dev start of examples/ionic (after #89-#107)

Where the time goes now in a truly cold stencilrs build of Ionic (94 components, 95 `@Component` files) and in a
cold `vite` dev start, measured on `origin/next` at `7877366`, and what is left to win, ranked by measured
milliseconds saved against effort. It replaces the stale breakdown from before #96 (Sass 77% of a cold build, Rust
transform 53 ms for 95 components). Nothing here changes behaviour; the lead files issues from section 5.

## 1. Read this first: the numbers are noisy

All runs were made in a shared 4-vCPU Linux container (Node 22.23, Vite 8.3.4, `sass-embedded` 1.99.0, native binding
built from this checkout) while sibling sessions ran their own builds. The load average was about 0 when the
container was idle and **6 to 10 (on 4 cores) during the runs**, so every wall-clock number is slower and wider than a
quiet machine's. Compare:

| | cold `vite build` | dev start (first `ion-button` module) |
|---|---|---|
| Quiet reference, Windows i9 tower (#110) | 2.41 s | 1.50 s |
| Quiet reference, Mac M2 Pro (#110) | 0.75 s | 0.33 s |
| This container, loaded (median of 5, range) | **2.41 s (1.80-2.61)** | **0.85 s (0.73-1.04)** |

The coincidence with the tower's 2.41 s means nothing: this box has a different disk, a faster dev start (Linux
file watching is cheap) and 6-10 runnable threads competing. **Use the proportions, the CPU-time figures and the
paired A/B results below, not the absolute milliseconds.** Every figure is a median with (min-max) over the number of
runs given; the build was run 5 times plain, 5 times with hook timers, 3 times under `--cpu-prof`, plus 6 interleaved
A/B pairs per experiment. CPU totals for a build (`time`, 3 runs): real 1.94-2.10 s, user 2.74-2.85 s, sys 0.44-0.48 s,
that is about 1.6 cores busy of 4, with the Node main thread idle for 40-55% of the build (795-1055 ms of 2.0-2.6 s).

## 2. Method

* Caches cleared exactly as `examples/ionic/bench.mjs`'s stencilrs row does (`node_modules/.vite` and
  `node_modules/.cache/stencilrs` in `examples/ionic` and in `examples/ionic/migrated`), fresh process every run,
  `IONIC_STENCIL_CACHE=1`, output to a scratch directory. Build: `vite build --config vite.config.ts`. Dev: `vite`
  on a free port; the clock stops when `/src/components/button/button.tsx` answers with the compiled `ion-button`
  (the bench's `devStart`), and again after the module import closure has been fetched (16 modules).
* Profiles: `node --cpu-prof` on the whole process, aggregated with `examples/ionic/spike/aggregate-profile.mjs` and
  `tree.mjs` (plus a small script that buckets self time by package and takes the median of 3 profiles). The dev
  server was stopped with a signal handler that calls `process.exit`, so the profile is written.
* Wall-clock phases and per-hook times come from timers that were **not committed**: a scratch Vite config that wraps
  every hook of every plugin (inclusive time summed over calls, and the *union* time, the wall time during which at
  least one call was running, because Vite runs hooks concurrently), a `--require` shim that wraps
  `sass-embedded`'s compile calls, `lightningcss.transform` and the native binding's `transpileAsync`, `scopeCss`
  and `foldBuildFlags`, and `performance.now()` marks at `configResolved`, `buildStart`, `buildEnd`, `renderStart`,
  `generateBundle`, `writeBundle`, `closeBundle` and exit. The timers add a little overhead: the timed runs are within
  noise of the plain ones (build median 2.17 s timed vs 2.41 s plain).
* Rolldown, Rolldown's native minify (oxc) and the Rust transform run on native threads and do not show in a
  JavaScript profile; they are measured by the gaps between the marks and by the wrapped native calls.

## 3. Cold `vite build`

### 3.1 Wall-clock phases

Medians of the 5 timed runs; the marks are ms since process start, the durations are the median of the per-run
differences.

| Phase | Mark (ms) | Duration, ms | Share | What is in it |
|---|---|---|---|---|
| Node boot, `vite` import, config bundle and evaluation, plugin and native binding load | 468 (459-518) | **468** | 22% | see 3.2 |
| `configResolved` to `buildStart` | 494 | 26 | 1% | plugin `config`/`configResolved`, tsconfig reads |
| `buildStart` to `buildEnd`: scan, resolve, **transform, Sass, Lightning CSS** | 1765 (1472-2243) | **1271 (978-1697)** | **59%** | module graph of 386 modules; see 3.3 |
| `buildEnd` to `renderStart` | 1848 | 11 (8-84) | <1% | |
| Render and **minify** (`renderStart` to `generateBundle`) | 1963 | 122 (92-220) | 6% | Rolldown link, tree-shake, oxc minify of 1.1 MB in 16 chunks, all native |
| **Global CSS** (`generateBundle` to `writeBundle`) | 2132 | **173 (166-250)** | 8% | the harness's `ionic-global-css` plugin: 22 Sass files, serial after the bundle |
| **Write** (`writeBundle` to `closeBundle`) | 2155 | 23 (18-43) | 1% | 16 chunks, 22 CSS files, about 1.3 MB |
| Close, dispose Sass compiler, exit | 2169 (1776-2709) | 14 (12-18) | 1% | |

### 3.2 Start-up before `buildStart` (468 ms)

Measured in isolation in fresh processes (5 runs each, same load): Node boot 28-90 ms, `import('vite')` 118-165 ms
(one run 407 ms), `import('@popcorn245/stencilrs/vite')` **6-8 ms including the native binding load (1-2 ms)**,
`import('sass')` (the dart2js build) **177-196 ms**, `import('sass-embedded')` 107-175 ms. The rest, roughly 100 ms,
is Vite bundling and evaluating the config file. In the real build `sass-embedded` is loaded later, on the first
stylesheet (124-175 ms, main thread). So the plugin itself costs almost nothing to load; the harness's own
`import * as sass from 'sass'` (used only for `sass.info`) costs about as much as `vite` itself. A/B, 6 interleaved
pairs, with that import replaced by a constant: config evaluated at 361 ms vs 480 ms, **about 100 ms saved
(paired deltas 20-270 ms)**.

### 3.3 Inside `buildStart` to `buildEnd` (386 modules)

Hook wall time (union) is how long at least one call was in flight; the sums are inflated by queueing (95 Rust
transforms and 160 Sass compiles are submitted almost at once).

| Work | Calls | Wall (union), ms | Notes |
|---|---|---|---|
| Sass (`sass-embedded`, one compiler process, 4 in flight) | 182 (160 component + 22 global) | **1227 (957-1663)** | 160 of them overlap the graph build, the 22 global ones run at the end (3.1) |
| `@popcorn245/stencilrs::load` (Sass + Lightning CSS per stylesheet) | 386 | 1091 (825-1470) | covers nearly the whole phase: Sass is the critical path |
| `@popcorn245/stencilrs::transform` (95 Rust component transforms, 40 `foldBuildFlags`, 23 `scopeCss`) | 387 | 333 (147-538) | the Rust work is 95 `transpileAsync` calls spanning 324 ms wall (126-524) on the libuv pool, `foldBuildFlags` 56 ms and `scopeCss` 21 ms on the main thread |
| `@popcorn245/stencilrs::resolveId` | 1146 | 256 (152-501) | sum 878 ms, mostly queueing; each call is trivial |
| `vite:asset-import-meta-url::transform` | **1** | **246 (176-347)** | one call, on `@stencil/core/dist/runtime/client/runtime.js` (verified by logging the id); Vite's `stripLiteral` tokenizes the 90 kB file on the main thread |
| Lightning CSS `transform` | 160 | 73 sum (57-99) | 0.46 ms a call, synchronous on the main thread |
| `stencilrs::buildStart` (style scan) | 1 | 9 (7-13) | |

The Sass compiler is a throughput bottleneck: a stylesheet's compile starts only after its component's transform
returned, then 160 compiles queue behind one Dart process. A standalone loop over 218 Ionic component sheets with
the same options took 0.66-1.03 s on its own (N=1), and did **not** get faster with 2 or 4 compiler processes (N=2
0.80-1.09 s, N=4 0.72-0.87 s), with `style: 'expanded'` (0.81-0.90 s) or with `Logger.silent` (0.74-0.90 s); all
within the +-15% run-to-run noise.

### 3.4 Self time by package (median of 3 `--cpu-prof` runs, main thread only)

Total sampled 2239 ms (1991-2629). The profile sees only the Node main thread, not Rolldown, Dart or the Rust pool.

| Bucket | Self ms | Notes |
|---|---|---|
| (idle) | 814 (795-1055) | main thread waiting on Rolldown, Sass or the Rust pool |
| native: fs, zlib, other builtins | 377 (316-426) | mostly `writeBuffer` (the protobuf pipe to the Sass process, 84-111 ms), file reads and writes |
| `node:internal` (ESM/CJS loading) | 217 (207-220) | module loading: `sass`, `sass-embedded`, `vite` |
| `vite` | 203 (148-306) | `stripLiteral`/`jsTokens` on the runtime file are 143-181 ms of it in the slower runs |
| stencilrs `index.js` (napi wrappers) | 149 (67-163) | `foldBuildFlags` 32-68, `transpileAsync` 61-84 (JSON.parse and marshalling), `scopeCss` 23-30 |
| `sass` (dart2js, loaded by the harness) | 105 (105-118) | module evaluation only; the compiles run in the Dart process |
| GC | 88 (66-128) | |
| `lightningcss` | 79 (75-96) | the 160 transforms |
| `@bufbuild/protobuf`, `rxjs`, `sass-embedded` | 37, 18, 20 | the Sass IPC layer |
| stencilrs `vite-css.js`, `vite.js` | 26, 22 | the plugin's own JavaScript is about 50 ms in total |
| `browserslist` + `caniuse-lite` | 26 + 14 | one-off target resolution for Lightning CSS (cold) |

`@stencil/core/compiler`, TypeScript and `@stencil/unplugin` are never loaded: no component falls back.

### 3.5 Where the hooks go, by plugin

| Plugin | Wall (union), ms | Share of the 1271 ms graph phase |
|---|---|---|
| stencilrs `load` (Sass + Lightning CSS) | 1091 | 86% (overlaps the rest) |
| stencilrs `transform` (Rust) | 333 | 26% |
| `vite:asset-import-meta-url` | 246 | 19% |
| stencilrs `resolveId` | 256 | 20% |
| everything else in Vite (css-post, import-analysis, esbuild/oxc, define, ...) | under 10 each | |

## 4. Cold dev start

Plain runs: first `ion-button` module at **848 ms (733-1042)**, full import closure (16 modules) at 1056 ms
(966-1446). Timed runs, ms from process start:

| Phase | Median (min-max) | Notes |
|---|---|---|
| Node boot, `vite`, config load (`config-evaluated`) | **574 (463-687)** | 68% of the time to `listening`; the same start-up as 3.2, including the `sass` import |
| to `configResolved`, to `configureServer` | 14 (12-15), 19 (11-43) | |
| `configureServer` to `listening` | 104 (92-110) | watcher set-up, plugin container |
| `listening` (711 ms, 588-822) to first compiled `ion-button` | about 140 | one Rust transform (14-33 ms), **two Sass compiles (button ios and md) 44-271 ms wall**, `sass-embedded` import 154-218 ms on the main thread, Lightning CSS 2 ms, then the optimizer's pre-bundle of the runtime |
| closure fetched | about +210 | 17 transforms |

Main-thread profile of a dev start (median of 3, total 1328 ms): `vite` 316 ms, `node:internal` module loading 312
(config bundle, `sass` 144-156, `sass-embedded` 97-114), native fs 291 (`lstat` alone 96 ms in the one profile
broken down, `readdir` 29: the file watcher's crawl of `migrated/`), Sass JS 112, idle 104, GC 75. The stencilrs
plugin JavaScript is 16 ms. `vite:asset-import-meta-url` runs on the runtime here too: 57 ms (47-94).

## 5. Ranked opportunities (measured ms saved x effort)

Savings are for this loaded container and rounded; "measured" means an A/B or an isolated timing, "estimated" means
read off the phase table and not tried.

| # | Opportunity | Where | Saved (cold) | Evidence | Effort |
|---|---|---|---|---|---|
| 1 | **Keep Vite's `vite:asset-import-meta-url` (`stripLiteral`) off `@stencil/core`'s client runtime**, e.g. serve the runtime from a `load` hook with the `new URL(..., import.meta.url)` pattern pre-resolved or removed, or hand Vite a pre-bundled runtime in build as dev already does | build and dev | build **~280 ms** (paired A/B, hook skipped for that one id, 6/6 pairs faster, deltas 140-660 ms, medians 2.87 s vs 2.5 s); dev ~50 ms | measured | medium: needs care so assets referenced by the runtime still work, or an upstream Vite fix for the O(n) tokenizer |
| 2 | **Drop the harness's `import * as sass from 'sass'`** (only `sass.info` is used; read the version from `sass-embedded`/package.json or import lazily) | `examples/ionic/vite.config.ts`, and any user config that copies the pattern | build and dev **~100 ms** (6 A/B pairs, config phase 480 to 361 ms, deltas 20-270) | measured | trivial |
| 3 | **Start the global CSS Sass compile at `buildStart`** (or `buildEnd`) instead of `generateBundle`: it is 22 files, 166-250 ms, serial after the bundle while Dart sits idle through the 122 ms render and minify | harness `ionic-global-css` plugin (and what the README tells users to write) | **~100-150 ms** (bounded by the render+minify gap) | estimated from phase table; Sass is throughput-bound so not the full 173 ms | low |
| 4 | **Preload `sass-embedded` early** (an unawaited `import()` in `buildStart` / `configureServer`) instead of on the first stylesheet: 107-175 ms of main-thread module loading, 154-218 ms in the dev first response | plugin `vite-css.js` | dev **~100-150 ms**; build 0-100 ms (main thread is idle 40%, so it may overlap) | module-load cost measured, overlap not | low |
| 5 | **Narrow `foldBuildFlags`'s gate** (`code.includes('Build')` matches far more than `Build.isBrowser`/`isServer`): 40 synchronous calls, 56 ms (44-125) on the main thread, 1.4 ms each | plugin `vite.js` | **20-50 ms** | measured calls, saving estimated | low |
| 6 | **`resolveImports` in the Rust transform** is about 55% of its cost: 95 files take 190-226 ms with it and 77-85 ms without (sync, single thread, same box). Cache or skip the import reads per file (Rolldown reads the same files again) | `stencilrs_transform` | **20-60 ms** wall (it runs on 4 threads and overlaps Sass; the first component's transform gates Sass start) | measured CPU, wall estimated | medium |
| 7 | Resolve Lightning CSS `targets` once without `browserslist`/`caniuse-lite` (precomputed or cached targets): 26 + 14 ms self | plugin `vite-css.js` | **~30-40 ms** | measured | low-medium (changes how targets are derived) |
| 8 | Dev: the file watcher's initial crawl of `migrated/` (`lstat` 96 ms, `readdir` 29 ms in one profile; 104 ms from `configureServer` to `listening`) | `watchIgnore` defaults, harness config | dev **~50-100 ms**, unverified | one profile | medium (needs its own A/B) |
| 9 | Sass itself: 1.0-1.2 s wall, 55-60% of a cold build and the critical path. No cheap lever found: extra compiler processes, `expanded` style and a silent logger all measured as noise. What is left is doing less Sass (one parse of Ionic's shared `@import` tree per stylesheet is why 160 compiles cost 0.7-1.0 s), which is not a stencilrs change | Sass / Ionic's stylesheets | unknown | negative A/B results | high |
| 10 | Rolldown render + minify (122 ms), write (23 ms), Lightning CSS (73 ms, 0.46 ms a call), `scopeCss` (21 ms): already small and mostly native | | under 40 ms each | measured | not worth an issue |

Items 1-4 together are worth roughly **0.45-0.6 s of this container's 2.4 s cold build** and 0.25-0.35 s of its
0.85 s dev start, with 2 and 3 being harness-only one-liners. Nothing else is a double run: Sass compiles each sheet
once (the global ones in the harness, the component ones in the plugin, never the same file), the native binding
loads once (1-2 ms), and neither TypeScript nor `@stencil/unplugin` is touched.

## 6. Reproducing

1. `npm install && npm run build:native` at the repo root; in `examples/ionic`: `npm ci --ignore-scripts`,
   `npm run fetch`, `npm run migrate`.
2. Clear the four cache directories listed in section 2, then
   `node --cpu-prof --cpu-prof-dir <dir> node_modules/vite/bin/vite.js build --config vite.config.ts` from
   `examples/ionic` (for dev, drop `build` and stop the server with a signal your preload turns into
   `process.exit(0)`, or the profile is not written).
3. `node examples/ionic/spike/aggregate-profile.mjs <file>.cpuprofile 25` and
   `node examples/ionic/spike/tree.mjs <file>.cpuprofile 60 30`. The `.cpuprofile` files are not committed.
