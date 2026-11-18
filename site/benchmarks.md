---
title: "Benchmarks"
description: "Per-file compile, a production Vite build and a full stencil build, stencilrs against Stencil v5."
---

<script setup>
import { data } from './data/site.data'
const b = data.bench
const d = data.derived
const ms = (v) => `${v.toLocaleString('en-US')} ms`
const transpile = b.transpile.rows.map((r) => [r.compiler, ms(r.coldMs), ms(r.medianMs), `${r.perFileUs.toLocaleString('en-US')} µs`])
const vite = b.viteBuild.rows.map((r) => [r.compiler, ms(r.firstMs), ms(r.warmMedianMs)])
const full = b.stencilBuild.rows.map((r) => [r.compiler, ms(r.buildFinishedMedianMs), ms(r.wallMedianMs)])
const sb = b.stencilBuild.stencilrsFiles
</script>

# Benchmarks

Measured {{ b.date }} on {{ b.machine }}. Stencil {{ b.versions.stencil }} (TypeScript {{ b.versions.typescript }}),
Vite {{ b.versions.vite }}, oxc {{ b.versions.oxc }}, Rust {{ b.versions.rust }}.

The numbers on this page are read from `storybook/docs/data/benchmarks.json`; charts come later.

## Compile: per file

{{ b.transpile.what }}: {{ b.transpile.files }} files ({{ b.transpile.kib }} KiB), the parity corpus.
Same inputs, same output contract, so this is the compiler alone.

<DataTable :head="['Compiler', 'Cold', 'Warm median', 'Per file']" :rows="transpile" highlight="stencilrs" />

**stencilrs: {{ b.transpile.speedup }} faster.** Source maps are on in the headline rows for both
compilers (each writes them by default, as `@stencil/unplugin` asks); the no-map rows are for
reference. `node parity/bench.mjs` times both compilers both ways.

## Build: the whole ui-kit through Vite

{{ b.viteBuild.what }}. Everything else in the build is identical: Rolldown bundling, CSS,
minification. Only the component compiler changes.

<DataTable :head="['Compiler', 'First build', 'Warm median']" :rows="vite" highlight="stencilrs" />

**stencilrs: {{ b.viteBuild.speedup }} faster**, end to end, source maps on.

## Build: a full `stencil build`, stencilrs swapped in

{{ b.stencilBuild.what }}. Both rows run the same Stencil v5 CLI and config, alternating. In the
stencilrs row, Stencil's per-bundle component transform (the `ts.transpileModule` pass inside its
bundler) is replaced with stencilrs' `transpile()` for the standalone and lazy bundles, with source maps on
(its default; Stencil keeps its own config default): {{ sb.standalone.stencilrs }} and {{ sb.lazy.stencilrs }} files
respectively, {{ sb.standalone.fallback + sb.lazy.fallback }} falling back to Stencil.

<DataTable :head="['Compiler', 'Build finished', 'Wall (incl. CLI start)']" :rows="full" highlight="stencilrs" />

**With stencilrs: {{ b.stencilBuild.speedup }} faster.** The gain is modest on purpose: only the component transform changes.
Stencil still runs its type-checked TypeScript pass over every file, processes the CSS, bundles the three
output targets and writes docs-json, and those dominate the build. This is a benchmark patch of a
throwaway copy of `@stencil/core` (`examples/ui-kit/bench-stencil-build.mjs`), not something stencilrs ships.

## Cold start

A fresh process, ui-kit, before and after the cold-start work in
[PR #52](https://github.com/popcorn245/StencilRS/pull/52) (numbers from that PR, measured on a shared box, not in
the data file above):

<DataTable
  :head="['Measurement', 'Before', 'After']"
  :rows="[
    [data.stats.coldStart.build.what, d.coldBuildBefore, d.coldBuildAfter],
    [data.stats.coldStart.dev.what, d.devBefore, d.devAfter],
  ]"
/>

## What the numbers mean

- **Dev server and tests** compile files one at a time on demand: that's the per-file number. In the
  ui-kit's Vitest suite, Stencil's compiler took over 10 s to compile all 136 components for a single
  spec file's first test; stencilrs does it in a fraction of a second.
- **Production builds** spend time on more than compiling (bundling, CSS, minifying), so the speedup
  is smaller: ~3× through Vite. Inside a full `stencil build` it is ~1.1×, because Stencil's
  type-checked TypeScript pass, CSS and bundling remain Stencil's.
- stencilrs is single-threaded here; Vite calls it per file, so it parallelises with Vite's own work.

## Reproduce

```sh
cd parity && node bench.mjs 10                     # per file
cd examples/ui-kit && node bench-build.mjs 3       # whole ui-kit through Vite
cd examples/ui-kit && node bench-stencil-build.mjs 5 --json  # full stencil build, stock vs stencilrs
```
