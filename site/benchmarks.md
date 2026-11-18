---
title: "Benchmarks"
description: "Per-file compile, a production Vite build and a full stencil build, stencilrs against Stencil v5."
---

<script setup>
import { data } from './data/site.data'
import { data as ionic } from './data/ionic.data'
const b = data.bench
const d = data.derived
const ms = (v) => `${v.toLocaleString('en-US')} ms`
const transpile = b.transpile.rows.map((r) => [r.compiler, ms(r.coldMs), ms(r.medianMs), `${r.perFileUs.toLocaleString('en-US')} µs`])
const vite = b.viteBuild.rows.map((r) => [r.compiler, ms(r.firstMs), ms(r.warmMedianMs)])
const full = b.stencilBuild.rows.map((r) => [r.compiler, ms(r.buildFinishedMedianMs), ms(r.wallMedianMs)])
const sb = b.stencilBuild.stencilrsFiles

const io = ionic
const order = Object.keys(io.rows)
const sec = (v) => (v == null ? 'n/a' : `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)} s`)
const msf = (v) => (v == null ? 'n/a' : `${Math.round(v).toLocaleString('en-US')} ms`)
const mib = (v) => (v == null ? 'n/a' : `${Math.round(v).toLocaleString('en-US')} MiB`)
const cell = (m, row, f) => {
  const r = io.metrics[m]?.rows[row]
  return r ? `${f(r.median)} (${f(r.min)} to ${f(r.max)})` : 'n/a'
}
const ionicTable = (ids, f) => ids.map(([m, name]) => [name, ...order.map((r) => cell(m, r, f))])
const ionicHead = ['Measurement', ...order.map((r) => io.rows[r])]
const ionicBuild = ionicTable([['coldBuild', 'Cold build'], ['warmBuild', 'Warm rebuild']], sec)
const ionicDev = [
  ...ionicTable([['devStart', 'Dev server start to ion-button'], ['devStartClosure', '... and every module it imports']], sec),
  ...ionicTable([['editRebuild', 'Edit one component, watch rebuild']], sec),
  ...ionicTable([['editDevTransform', 'Edit one component, Vite dev re-transform']], msf),
]
const ionicCompile = ionicTable([['transpileCold', 'All 95 components, cold pass'], ['transpileWarm', 'All 95 components, warm pass']], msf)
const ionicMem = ionicTable([['peakRss', 'Cold build, peak'], ['devPeakRss', 'Dev server, peak']], mib)
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`
const ionicOut = [
  ['Files', ...order.map((r) => io.output[r]?.files ?? 'n/a')],
  ['Raw', ...order.map((r) => (io.output[r] ? mb(io.output[r].rawBytes) : 'n/a'))],
  ['Gzip (text files each)', ...order.map((r) => (io.output[r] ? mb(io.output[r].gzipBytes) : 'n/a'))],
  ['JavaScript, raw / gzip', ...order.map((r) => (io.output[r] ? `${mb(io.output[r].js.rawBytes)} / ${mb(io.output[r].js.gzipBytes)}` : 'n/a'))],
]
const nSamples = (m) => Math.max(...Object.values(io.metrics[m]?.rows ?? {}).map((r) => r.n), 0)
</script>

# Benchmarks

Two sets of numbers: the ui-kit (a small library, measured on the maintainer's machine) and [Ionic](#ionic-one-source-three-compilers) (94 components, a preview from a shared container).

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

## Ionic: one source, three compilers

<div class="warning custom-block"><p class="custom-block-title">{{ ionic.preview ? 'Preview numbers' : 'Numbers' }}</p>
<p v-if="ionic.preview">These were measured in a shared cloud container ({{ ionic.machine.cpu }}, {{ ionic.machine.logicalCores }} logical cores,
{{ ionic.machine.ramGiB }} GB) while other jobs ran on it (load average {{ ionic.machine.loadavgAtStart.join(' / ') }} when the run started). Expect noise: read the
min to max ranges, not just the medians. The final run on a quiet machine replaces them.</p></div>

[Ionic Framework](https://github.com/ionic-team/ionic-framework)'s `core` ({{ ionic.versions.ionic.tag }}, 94 components, per-mode Sass) is the
largest open-source Stencil code base, so it is the fairest single test: the same source built three ways
(the harness is `examples/ionic`; the migration to Stencil v5 is described in its README).

| Row | Build |
|---|---|
| {{ ionic.rows.stencil4 }} | `stencil build` of Ionic as published, Stencil {{ ionic.versions.stencil4 }} (the reference) |
| {{ ionic.rows.stencil }} | `stencil build` of the same source migrated to Stencil {{ ionic.versions.stencil5 }} |
| {{ ionic.rows.stencilrs }} | `vite build` of that migrated source with `@popcorn245/stencilrs/vite` (Vite {{ ionic.versions.vite }}) |

Median of {{ ionic.runs }} runs, with min to max in brackets. Every raw sample is in
`site/data/benchmarks-ionic.json`, measured {{ ionic.startedAt.slice(0, 10) }} on {{ ionic.machine.os }}, Node {{ ionic.machine.node }},
stencilrs `{{ ionic.versions.stencilrs.git.slice(0, 9) }}`.

### Builds

<DataTable :head="ionicHead" :rows="ionicBuild" highlight="stencilrs" />

### Dev server and watch

<DataTable :head="ionicHead" :rows="ionicDev" highlight="stencilrs" />

### Compiling the 95 component files, nothing else

<DataTable :head="ionicHead" :rows="ionicCompile" highlight="stencilrs" />

The compiler alone: stencilrs `transpile` against Stencil's `transpileSync` (version 4 on the stock source, 5 on the migrated one),
source maps on, one process, single-threaded.

### Peak memory

<DataTable :head="ionicHead" :rows="ionicMem" highlight="stencilrs" />

### Output size

<DataTable :head="ionicHead" :rows="ionicOut" highlight="stencilrs" />

The three layouts are not the same artifact. Stencil writes a lazy loader build, a standalone build and `docs.json` (and a Stencil 4
build also writes CommonJS and more type declarations); stencilrs writes one ES module bundle with shared chunks. Compare the rows as
"what a build leaves in the folder", not as the weight of one page.

### Method

- **Cold build.** A fresh process per sample with Stencil's `.stencil` cache and Vite's cache removed first. Stencil's cache is *on*
  for the whole benchmark (the harness config reads `IONIC_STENCIL_CACHE`), so the cold build pays for writing it and the warm build can use it.
  The Stencil rows include the separate Sass command that produces Ionic's global `css/` (stencilrs builds it inside the same run).
- **Warm rebuild.** The same command again with every cache kept; one extra build before the {{ ionic.runs }} measured ones is discarded.
  Neither Stencil version nor Vite has more than a build cache between processes, so this is "run the command again", not an incremental build.
- **Dev server.** Stencil: `stencil build --dev --watch --serve`. stencilrs: `vite`. Fresh process, caches removed, a free port. The clock
  stops when the compiled `ion-button` module answers HTTP 200 (Stencil: the lazy bundle `ion-button.entry.js`; Vite: `button.tsx`
  transformed on request); the second row waits for everything that module imports, as a page would. Vite compiles on request, Stencil builds
  everything before it serves anything: that is the difference being measured.
- **Edit and rebuild.** One `console.debug` line is inserted in `button.tsx`'s `render()`. Stencil: the same dev process, time to its next
  "build finished" line. stencilrs: a separate `vite build --watch` (the same work Stencil's watch does: every output rebuilt), time to the next "built in".
  The Vite dev server's own re-transform of the edited module is listed apart.
- **Per-file transform.** `examples/ionic/bench/transpile-worker.mjs`, a fresh process per sample. The first of {{ ionic.runs }} passes over all files
  is the cold one, the rest are warm (median of the later passes).
- **Peak memory.** Resident memory of the whole process tree (build workers included), sampled every 250 ms; a short spike can be missed.
- Rows are interleaved within each run, so drift on the machine hits all of them.

### What is not here

- **stencilrs inside `stencil build`** (the issue's fourth row) is not measured. `examples/ui-kit/bench-stencil-build.mjs` patches
  Stencil's bundler for the ui-kit's single stylesheet per component and its `ui-kit` paths; Ionic has per-mode (iOS / Material) styles, a global script
  and aliased imports, and the swap's glue would need to be checked against all of them before its numbers meant anything. The UI-kit result above
  (about 1.1x) says what that row would show anyway: only the component transform changes, and it is a small part of a Stencil build.
- **The final numbers.** These were measured on a shared box. The quiet-machine run on the maintainer's machine will replace them.

### Where stencilrs spends its time

Two paths in the stencilrs row are slow, and both are Sass, not the compiler:

- **The watch rebuild is not incremental.** After one line of `button.tsx` changes, `vite build --watch` takes about as long as the
  Stencil 4 rebuild and several times longer than Stencil v5's incremental rebuild (about 0.6 s), because it recompiles every stylesheet
  again. Replaying the Sass calls alone (the 218 per-mode component `.scss` files, then the 12 global ones) costs about 2.9 s and 0.7 s on this box, which
  accounts for nearly all of the 3.5 s. The plugin does not cache a stylesheet whose inputs did not change, and the harness's global `css/` step
  runs on every rebuild. The Vite dev server does not have the problem: it transforms only the module that was requested, again in tens of milliseconds.
- **A cold build is mostly Sass too.** Of about 4.2 s, the same replay puts about 3.6 s in Sass (`sass` is JavaScript, single-threaded here), so the
  compile of 95 files (about 70 ms, see the per-file table) and the bundling are the smaller part. This is why the whole build is about 6x faster than
  `stencil build`, not as many times faster as the compile step alone.
- **Warm builds do not help any row.** Stencil v5's `.stencil` cache saves nothing measurable on a rebuild in a fresh process
  (its warm median is not below the cold one), and Vite keeps nothing between processes. Only watch mode and the dev server are incremental.

### Reproduce

```sh
cd examples/ionic
npm ci --ignore-scripts
npm run bench                      # fetches, migrates and builds what it needs; about 50 minutes at the default 10 runs
npm run bench -- --runs 3 --preview  # a quicker, labelled run
# writes ../../site/data/benchmarks-ionic.json; --help lists the options (--rows, --steps, --out)
```

The benchmark needs no browser: it is builds, dev servers and a compiler loop. Linux and macOS record peak memory; on Windows
those rows are missing.

## Reproduce

```sh
cd parity && node bench.mjs 10                     # per file
cd examples/ui-kit && node bench-build.mjs 3       # whole ui-kit through Vite
cd examples/ui-kit && node bench-stencil-build.mjs 5 --json  # full stencil build, stock vs stencilrs
```
