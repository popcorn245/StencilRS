# Spike: a full `stencil build` through the Rust transform and tsgo (#94)

**Verdict: kill the "≥ 2x faster `stencil build`" feature.** Measured, the patched build is 1.16x faster
(24.0 s to 20.7 s), and the patch that gets there is the cheap half of the idea. The expensive half (replace
Stencil's Pass A with the Rust transform) cannot be done as a drop-in, and even done perfectly it tops out at
about 1.5x because Sass is the long pole of a cold Ionic build. What the spike found worth filing is listed
at the end.

Container: 4 cores, Node 22.23, Stencil 5.0.0-beta.25, TypeScript 6.0.3, `@typescript/native-preview`
7.0.0-dev.20260707.2, Ionic 9.0.12 migrated (`examples/ionic`). Other agents were building at the same time
(load average 2 to 5), so absolute numbers are noisy: every figure below is a median of at least 3
interleaved runs, with the range given. Stock cold build on the Windows tower: 21.7 s (from #94); here 24.0 s.

## What is measured and what is estimated

| Claim | Status |
|---|---|
| Where the time of a cold `stencil build` goes | **measured** (`node --cpu-prof`, plus Stencil's `--debug` phase timers) |
| tsgo vs tsc `--noEmit` on migrated Ionic | **measured** (5 runs each, interleaved) |
| Skip Stencil's type-check (`noCheck`), run tsgo beside the build | **measured** (patched Stencil, 3 cold builds per variant) |
| Skip the CLI's pre-build migration scan | **measured** |
| Pass B (per-bundle `transpileModule`) through stencilrs `transpile` | **measured, with caveats**: builds and runs, output not equivalent (see below) |
| Pass A (the decorator pass that builds Stencil's component metadata) through stencilrs | **not attempted, estimated** |
| Ceiling with Pass A in Rust and a faster Sass | **estimated** from the measured phases |

## 1. Where a cold build goes

Profile: `node --cpu-prof` on `@stencil/cli/bin/stencil.mjs build`, `migrated/.stencil` removed. Stencil
does not spawn JS workers for this build (one `.cpuprofile`); Sass and Rolldown run off-thread/out of process,
which shows as native or idle time. Sampled total was 29.3 s because the profiler and the machine load slow the run
(the same build is 18 to 19 s inside Stencil without the profiler), so read the shares, not the seconds.
`spike/aggregate-profile.mjs` and `spike/tree.mjs` produce the tables.

Self time by package (main thread):

| Package | ms | share |
|---|---:|---:|
| `typescript` | 14,028 | 47.8% |
| native / idle (waiting on Rolldown, Sass child, GC) | 7,557 | 25.8% |
| `node:internal` (mostly `child_process.spawn` of the Sass compiler) | 5,311 | 18.1% |
| `@stencil/core` (Stencil's own JS) | 886 | 3.0% |
| `@bufbuild/protobuf` + `sass-embedded` JS | ~700 | 2.4% |
| `rolldown` JS side | 326 | 1.1% |

Inclusive time of the TypeScript consumers (CPU ms in the profile):

| What | ms | Notes |
|---|---:|---|
| `detectMigrations` in `@stencil/cli` | 3,579 | `ts.createSourceFile` on every source file, **before every build**; not part of the compiler |
| Pass A `runTsProgram` (`program.emit`) | 5,737 | 3,682 is `getEmitResolver` which runs `checkSourceFile` (the type-check, done lazily by emit); 2,037 is the emit itself, 536 of it `.d.ts` |
| `createProgram` / full build setup | 1,819 | |
| Pass B `ts.transpileModule` | ~4,100 | 2,883 in Rolldown's `transform` hook, 1,230 in `outputCollection`; 448 calls: 224 modules x (standalone + lazy) |
| Sass (`@stencil/sass` to `sass-embedded`) | 3,800 | the main-thread cost of driving the compiler; the compiler itself runs in a child process |

Wall-clock phases of one `--debug` run (build 18.4 s inside Stencil, about 24 s process wall):

| Phase | Wall |
|---|---:|
| Node start, CLI, config load | ~0.5 s |
| `detectMigrations` | ~3.1 s |
| Create TS program, start build | ~1.6 s |
| **Pass A transpile** (incl. type-check) | **4.8 s** |
| collection + app types | ~1.3 s |
| **Generate outputs** (standalone 8.8 s and lazy 13.7 s run concurrently; 314 stylesheets take 8.4 s wall-clock inside them) | **13.9 s** |
| write 1,163 files | 0.17 s |

Attribution against the issue's list: TS program creation about 7% of wall (1.6 s), type-check roughly 1.1 to 3.7 s
(see below), Stencil's TS transformers (Pass A, Pass B) 4.8 s + part of 13.9 s, bundling and Sass overlap inside the 13.9 s,
docs-json and writes are small. The Rust transform is ~1% of a build, as #94 says; but TypeScript is not the whole
story: the migration scan (3 s) and Sass (the longest stylesheet chain inside "generate outputs") are not
"type-check" or "transform" at all.

## 2. tsgo vs tsc

`--noEmit -p migrated/tsconfig.json`, 5 runs each, interleaved (`spike/time-typecheck.mjs`):

| | tsc | tsgo | speedup |
|---|---:|---:|---:|
| as is | 6.22 s (5.97 to 6.66) | 1.50 s (1.27 to 1.61) | 4.1x |
| `--skipLibCheck` (what Stencil forces) | 4.22 s (4.16 to 4.27) | 0.83 s (0.77 to 0.91) | 5.1x |

Diagnostics: identical. Both report the same single error without `--skipLibCheck`
(`TS2550` in Rolldown's `.d.mts`, a harness artefact: `lib` is es2022), none with it. With deliberate errors
injected into `chip.tsx` (TS2322, TS6133, TS2339) the two printed byte-identical output with `--pretty false`.
tsgo is a clear win as a pure checker. It reads the same `tsconfig.json` and the `paths` in it.

## 3. The benchmark-only patch

`spike/patch-stencil.mjs` edits the installed Stencil in `node_modules` (originals kept as `.orig`;
`--revert` restores stock). It is env-gated, so one patched copy runs every variant. Never shipped.

1. `SPIKE_NOCHECK=1`: TypeScript `noCheck` for Pass A and no semantic-diagnostics sweep.
2. `SPIKE_TSGO=<bin>`: once `components.d.ts` is written, run `tsgo --noEmit --skipLibCheck` in a child process;
   awaited before the write, and its errors fail the build. Verified: an injected type error fails the build with tsgo's
   diagnostics (exit 1) while Stencil's own check is off.
3. `SPIKE_SKIP_MIGRATE=1`: skip the CLI's pre-build `detectMigrations`.
4. `SPIKE_RUST_PASSB=<stencilrs index.js>`: for component modules in the lazy and standalone bundles,
   call stencilrs `transpile` (`lazy` / `module` shape) on the original source instead of
   `ts.transpileModule` over Pass A's JS plus Stencil's transformers.

Cold builds, median of 3 rounds, variants interleaved (`spike/bench-build.mjs`; process wall seconds, container):

| Variant | Median | Range | vs stock |
|---|---:|---|---:|
| stock | 24.0 s | 23.8 to 25.4 | 1.00x |
| skip migration scan | 21.7 s | 21.0 to 22.5 | 1.11x |
| `noCheck` only | 23.5 s | 23.0 to 23.5 | 1.02x |
| `noCheck` + tsgo (parallel) + skip migration scan | 21.0 to 22.1 s (two sets of 3) | 20.7 to 22.2 | ~1.12x |
| all of that + Rust Pass B | **20.7 s** | 20.0 to 21.0 | **1.16x** |

Noise: stock ranges 23.8 to 25.4 s across 6 runs; differences under about 1 s are not significant here.

Why so little:

- **The type-check is mostly not separable.** Pass A's `program.emit` runs the checker (it needs the emit resolver),
  and the decorator transformer asks the checker for property types. `noCheck` cut Pass A from 4.5 s to 3.3 s,
  about 1.2 s, well under the 3.7 s the profile shows under `getEmitResolver`: the checker work the transformer
  needs moves, it does not vanish. tsgo then runs in 1.7 s in the child process and is fully hidden behind the rest of the build (waited 0 ms).
- **Pass B through Rust saved about 1.4 s** (outputs phase 6.6 s to 5.2 s in a build with Sass stubbed out;
  within noise in the full build: 21.0 to 20.7 s). It is limited to the 95 component modules; the other 129 modules
  still take `transpileModule` because they need Stencil's aliased-import and core-import rewrites.
- **Sass is the long pole.** In the "generate outputs" phase, 314 stylesheets take 8.4 s wall-clock. With a stub
  plugin that returns empty CSS for `.scss`, that phase drops from ~13.7 s to 6.6 s on stock Stencil and 5.2 s with Rust Pass B
  (that build ends with an error at Stencil's CSS import parser, so use it as a phase timing only, not a build time).
  Until Sass is faster, nothing done to TypeScript can win 2x.

Output equivalence of the Rust Pass B build is **not** established, and is partly wrong:
the lazy `dist/` is 3.85 MB vs 3.38 MB stock (same file names, different content),
`docs.json` is identical (Pass A is untouched, so it only differs in its timestamp), and the standalone `components/`
folder has 245 files vs 269 because stencilrs' `module` shape does not emit Stencil's `defineCustomElement` with the
dependency defines (the patch appends a stub so Rolldown links). Smoke tests were not run on that output.
Treat the 20.7 s as a timing of the transform swap, not a shippable build.

## 4. Estimate for the full idea (not measured)

Replacing Pass A would remove, from the 24 s: program creation (1.6 s), Pass A (3.3 s with `noCheck`, down to ~0.1 s
of Rust), plus the 3 s migration scan, the 1.4 s of Pass B already measured, and tsgo hidden in the background.
That is about 24 s down to ~15 s, **~1.6x**. The remaining ~15 s is Sass-bound (8 s) plus Rolldown and Stencil's
output generation (~5 s). A 2x build needs a roughly 2x faster Sass as well (see #89 and #91), and then the compile
side is ~8 to 9 s (2.5x).

## 5. What breaks

- **Pass A is not a transform, it builds Stencil's component model.** It extracts metadata into `compilerCtx.moduleMap`
  (components, props, events, `complexType`, dependencies) that the bundler, `components.d.ts`, `docs-json` and the
  collection all read. stencilrs' `transpile` returns its own `components` metadata and has a `compilerstatic`
  mode, but wiring it into `moduleMap` in place of `parse-static.ts` is a port of Stencil internals, not a patch. This is the
  part I did not attempt.
- **docs / `complexType` need a type checker.** Pass A resolves prop and event types through the checker (`resolved`,
  `references`). stencilrs reports a type it cannot resolve as an error beginning `stencilrs:` ("not ported"), and falls
  back to Stencil. tsgo's JS API is `unstable/*` (sync/async clients over IPC, AST and factory modules in
  `@typescript/native-preview` 7.0.0-dev); it is not a drop-in for the `ts.Program`/`TypeChecker` objects Stencil's transformers hold, and I
  found no transformer-carrying `emit` in its export map (not verified beyond reading it). Moving `complexType` to tsgo means a new
  resolver, not a flag.
- **`.d.ts` output** (`dist-types` target) is emitted by the TS emit in Pass A (536 ms here); stencilrs does not emit declarations, tsgo can.
- **Two TS programs on a cold project.** With no `components.d.ts` Stencil builds the program twice (`docs/pipeline.md`);
  the benchmark starts tsgo after types exist, as a real integration would have to, but the harness has `components.d.ts` already present.
- **Errors arrive late.** tsgo's verdict is awaited before the write, so a type error fails the build after the full
  bundle work; a real feature would want to fail fast.
- **Maintenance.** The patch edits one hashed, bundled file of a beta compiler (`compiler-CWxGH9sX.mjs`).
  Anything shipped would have to live upstream in Stencil; #9's decision stands.

## 6. Recommendation

**Kill** "route a full `stencil build` through Rust and tsgo for >= 2x". Measured gain 1.16x; the credible ceiling
without more work is ~1.6x, and the part that gets there is a rewrite of Pass A that touches `complexType`/docs.
Do not file it as a feature. File these instead, in order of return:

1. **Stencil upstream: the pre-build `detectMigrations` scan.** It parses every source file with `ts.createSourceFile` on every
   `stencil build`: ~3 s of a 24 s build (12%), measured, for a result that is `hasMigrations: false` in the steady state.
   Cheapest win in the whole spike, and independent of stencilrs.
2. **Sass** (already #89 and #91): the long pole of a cold Ionic build; no TS work matters until it moves.
3. **Optional, low priority: tsgo as an opt-in validator** for projects that keep `stencil build`. tsgo is 4 to 5x faster than
   tsc with identical diagnostics here, but with Pass A still checking lazily it saves about 1 s of a 24 s build.
   A tsgo-only `tsc --noEmit` replacement in CI (0.8 s vs 4.2 s) is the realistic use, and needs no stencilrs change.

Reproduce: `cd examples/ionic && npm i --no-save --ignore-scripts @typescript/native-preview`, then
`node spike/time-typecheck.mjs 5`, `node spike/patch-stencil.mjs && node spike/bench-build.mjs 3 stock,all`
(and `--revert` afterwards).
