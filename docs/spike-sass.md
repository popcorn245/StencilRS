# Spike: Sass on the critical path of a cold Ionic build

Question: Sass is 55-60% of a cold `vite build` of Ionic (docs/profile-ionic-cold.md item 9). Three levers: A, a
persistent content-addressed CSS cache; B, a native Rust Sass compiler (`grass`); C, a caching custom importer for
sass-embedded. Measured on `origin/next` (`1fb3f32`), `examples/ionic` (Ionic 9.0.12 migrated, 94 components, 182 Sass
compiles: 156 component sheets plus 26 `css/` files), `sass-embedded` 1.99.0, Node 22, shared 4-vCPU box.

**Noise warning.** Other spikes ran concurrently: load average was 2.3-4.7 at the start and rose to 8 during the A
bench (every number below is "loaded"). Rounds are interleaved (cold, warm, cold, warm...) so paired deltas are
meaningful; absolute walls drift upward within the run. Byte-for-byte output hashes are deterministic.

## Finding zero: lever A already exists

`vite-css.js` has a `css.cache` option (default `true`): an in-memory memo (always, for watch rebuilds) **and a disk
cache** at `node_modules/.cache/stencilrs/sass/<key>.json` for the Sass step (since #88/#96/#122): key =
sha1(sass version, options, file path, stylesheet text), value = `{css, deps, depHashes}` where `depHashes` are the
content hashes of every file Sass loaded (`loadedUrls`); a hit is used only while all dependency hashes still match.
The harness's global `css/` files have their own disk cache (`vite.config.ts`, `ionic-global-css`). It is skipped when the
Sass options hold functions, importers or a logger (not hashable), and `cache: false|'memory'` turns the disk half off.
`bench.mjs` already clears it for "cold" and keeps it for "warm". So the work here was to measure it and check its
invalidation, not to build it. What it does not cache: the post-Sass chain (Lightning CSS + `scopeCss`, in memory only,
about 73 + 21 ms of main-thread time per docs/profile-ionic-cold.md 3.3, not A/B'd) and nothing is portable across
checkout paths (the file path is in the key and in `depHashes`).

## Results

n = 8 interleaved pairs, fresh process per build (`vite build` of examples/ionic, output to a scratch dir). "Cold" =
Sass disk cache and `node_modules/.vite` removed first. Sass wall = union of the time at least one
`compileStringAsync`/`compileAsync` was in flight (a `--require` shim wrapping `AsyncCompiler`).

| Variant | Cold build wall, median (min-max) | Sass wall, median (min-max) | Sass compiles | Correctness |
|---|---|---|---|---|
| Baseline: cold, empty cache (cache is written) | 3182 ms (1935-3627) | 2168 ms (1161-2516) | 182 | reference output hash `91421f3a` |
| **A. Warm disk cache, fresh process** | **1539 ms (1129-2362)** | 0 | 0 | 8/8 byte-identical to cold (42 files) |
| A. Warm, after editing one component stylesheet (`button.ios.scss`, n=1) | 1234 ms | tiny | 1 | identical to a no-cache build of the edited tree |
| A. Warm, after editing a component partial (`button.scss`, n=1) | 1287 ms | tiny | 2 (ios + md) | identical to no-cache build |
| A. Warm, after editing a shared Ionic partial (`themes/ionic.mixins.scss` or `ionic.globals.scss`, n=1) | 2170-2529 ms | about 1.8 s | 160 | identical to no-cache build (output unchanged: the edit was a variable) |
| B. `grass` (patched, see below), Sass step only, standalone | n/a, not wired in | 618 ms 1 thread, 312 ms 2, 267 ms 4 (median of 7) vs sass-embedded 1458 ms conc. 1, 750 ms conc. 4 | 182 | **fails**: 125/182 equal after Lightning CSS normalisation, 57 differ |
| C. JS importer caching partial contents (component sheets only) | n/a | 597-653 ms vs 653 ms builtin, conc. 4 | 156 | identical on the sheet checked; no speed difference |

Paired cold-minus-warm deltas (ms): 806, 398, 1531, 1265, 1677, 1929, 1818, 1481 (median about 1500 ms; the spread
follows the load, which rose over the run). On a quiet machine docs/profile-ionic-cold.md's Sass wall (about 1.0-1.2 s)
is what the warm cache removes; here under load the cold Sass wall was 1.2-2.5 s.

Invalidation (`spike/sass/inval-a.mjs`): the right sheets recompile and nothing else. A leaf stylesheet edit recompiles
1 sheet, a component partial edit 2 (the ios and md sheets that `@import` it), an edit of a Sass file every component
imports recompiles 160 (the component sheets and 4 `css/` ones; the other 22 are not affected; the output is the same because the
edit added only a variable, but the cache cannot know that: it keys on input content, not output). The second build
after each edit recompiled 0; restoring the file recompiled what the cold run (which wipes the cache) had replaced.
In all four cases the output hash equals the hash of a cold build of the same edited tree, and restoring the file gives
back the baseline hash.

## B: grass

`grass` 0.13.4 (crates.io was reachable), `default-features = false`, standalone crate
`examples/ionic/spike/sass/grass-bench`, not in the workspace. Every sheet compiled with `from_path`, `expanded` for
components and `compressed` for `css/` (as the build does), deprecations quiet.

**Stock grass: 172 of 182 sheets fail.** 119 with "Can't find stylesheet to import", 53 with "This file is already being
loaded". One cause: `find_import` adds a candidate extension with `Path::with_extension`, which *replaces* the last
dotted segment, so `@import "../themes/ionic.globals"` is looked up as `ionic.scss` and `@import "./button.ios.vars"`
as `button.ios.scss`; Ionic names nearly every partial that way. A 6-line fix (append the extension;
`spike/sass/grass-dotted-import.patch`) makes all 182 compile. Everything below uses the patched crate.

**Patched grass: 182 compile, 125 equal and 57 differ** after both sides go through Lightning CSS (minify). Causes, per
sheet (`classify.mjs`, `classify-detail.mjs`; a sheet can have several):

| Cause | Sheets | Nature |
|---|---|---|
| Colour functions round differently (`#1a65eb` dart vs `#1965eb` grass: `color.adjust`/mix tint and shade) | 18 | wrong values (off by one in a channel); every `ion-color-*` tint/shade, buttons, checkbox, searchbar |
| `@supports selector(:dir(rtl))` nesting lost (`float-elements`, the two bundles containing it) | 3 | wrong semantics: the `:dir(rtl)` rules apply unguarded |
| `calc(31px - 2px * 2)` printed as `calc(31px - (2px * 2))` | 1 | equivalent |
| Only declaration order, rule splitting or custom-property comma spacing (`0, 84, 233` vs `0,84,233`) | 36 | equivalent for browsers, not byte-equal (9/182 were byte-identical before normalising) |

So it does not pass the whole set; not wired into the build.

Speed (patched grass, release, LTO, 7 runs, load about 2.5): 618 ms (577-706) on 1 thread, 312 ms (281-449) on 2,
267 ms (228-322) on 4, for all 182 sheets; mean 2.8 ms a sheet, slowest 14.5 ms (`ionic.bundle`). sass-embedded in the
same minute: 1458 ms (1439-1610) with one sheet at a time, 750 ms (604-858) with 4 in flight (what the build does), 696 ms
(644-790) including spawning a fresh compiler process. So grass is about 2.4x faster single-threaded and about 2.8x at
4 threads against the 4-in-flight dart process, not an order of magnitude, and it would run in-process (no Dart
process, no protobuf pipe: 84-111 ms of main-thread `writeBuffer` in the cold profile). At best it saves about 0.5 s
of a 2.4 s cold build, only if its output were right, and it would still lose to a warm cache by a wide margin.

## C: importer / `@use`

A JS importer (`canonicalize` + `load`) over the 156 component sheets, concurrency 4, 7 interleaved passes after a
warm-up, one compiler process per variant: builtin file importer 653 ms (563-683), JS importer reading from disk
597 ms (562-678), JS importer serving contents from a shared Map 641 ms (534-667). All within noise, as expected: the
embedded compiler's cost is parsing and evaluating the `@import` tree inside the Dart process on every compile; an
importer only changes who reads the bytes (which the OS cache already serves), and each load adds an IPC round trip.
Dart-sass keeps no parsed-module cache between compilations. A `@use` migration (modules are evaluated once per
compilation, not per `@import`) was **not measured**: Ionic's Sass is `@import` throughout (4 deprecations silenced
in the harness) and migrating 400 files is not a quick check; it is the only route left that could shrink a single
compile, and it is a change to Ionic's source, not to stencilrs.

## Verdicts

| Lever | Verdict | Effort | Risk |
|---|---|---|---|
| A. Persistent Sass cache | **Already built and working: leave on, document it.** Warm fresh-process build is about 1.5 s faster than cold here, removes all Sass work, output byte-identical, invalidation exact. Worth doing: persist the post-Sass chain too (ceiling about 0.1 s), and make the key relative to the project root so a restored CI cache survives a different checkout path (only matters where runners use varying paths) | S each | Low: a stale-entry bug would be silent; the dependency-hash check covers `loadedUrls` but not a changed `sass.loadPaths` directory content that was never loaded, nor a Sass version bump inside the same `sass` version string (key has the version) |
| B. grass | **Don't.** Stock fails 172/182 (dotted `@import` names); patched compiles all but 21 sheets are wrong (colour rounding, lost `@supports`) and 36 more are not byte-equal. Gain at best about 0.5 s on a cold build, and no gain over lever A | L to make it equivalent (colour math, at-rule nesting, upstream fixes), plus a dual compiler path | High: silent colour and RTL differences in shipped CSS; dart-sass is the Sass reference implementation |
| C. Importer cache / `@use` | **Importer: don't (no effect).** `@use` migration: unmeasured, a Ionic-source change | importer S, `@use` L | none / source churn |

What cannot be improved by these levers: a truly cold build (empty cache, first CI run) still pays the whole Sass wall;
that is bounded by dart-sass throughput on one Dart process (profile doc: 2 or 4 compiler processes, expanded style and
a silent logger are all noise).

## Reproduce

```sh
cd examples/ionic && npm ci --ignore-scripts && npm run fetch && npm run migrate
node spike/sass/bench-a.mjs 8                      # A: cold vs warm, interleaved
node spike/sass/inval-a.mjs                        # A: invalidation and equality with a no-cache build
node spike/sass/run-build.mjs --cold --list /tmp/sheets.txt   # one build, writes the 182 stylesheet paths
cd spike/sass/grass-bench && cargo build --release  # stock grass: 172 fail
cargo build --release --target-dir /tmp/gt --config 'patch.crates-io.grass_compiler.path="<grass_compiler 0.13.4 with grass-dotted-import.patch applied>"'
/tmp/gt/release/grass-bench /tmp/sheets.txt /tmp/grass-out 1 2 4
cd ../../.. && node spike/sass/dart-vs-grass.mjs /tmp/sheets.txt /tmp/grass-out 5   # dart timing + equivalence
node spike/sass/classify.mjs; node spike/sass/classify-detail.mjs
node spike/sass/importer-c.mjs /tmp/sheets.txt 7   # C
```

Files: `examples/ionic/spike/sass/` (`run-build.mjs`, `sass-shim.cjs`, `bench-a.mjs`, `inval-a.mjs`, `dart-vs-grass.mjs`,
`classify*.mjs`, `importer-c.mjs`, `grass-bench/`, `grass-dotted-import.patch`). Nothing under the plugin changed;
no tests were affected.

## Not measured

A `@use` migration; A on a quiet machine (load was 2.3-8); a cold build with the OS page cache dropped (not permitted
here); the post-Sass-output persistence as an A/B; cache portability across checkout paths (read from the code, not
tested); a grass build wired into the napi binding.
