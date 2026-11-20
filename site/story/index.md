---
title: "The story"
description: "How stencilrs got here, as a timeline: parity, the fallbacks, full output, the speed, the cold start, and Ionic as the proving ground."
pageClass: story
---

<script setup>
import { data } from '../data/site.data'
const d = data.derived
const s = data.stats
const sf = data.bench.stencilBuild
</script>

# The story

How a one-session experiment turned into a compiler you can drop into Vite. Every date and pull
request below is from the repository's history; every number is from the data files
([benchmarks](/benchmarks)) or the pull request it cites.

## The per-file port {#the-per-file-port}

<When when="14–15 October 2026" />

The question: could the slow part of the Stencil compiler be rewritten in Rust and still produce
*exactly* what Stencil produces? The rule from the first commit was to **measure against the real
thing**. Stencil v5's compile pipeline was mapped, golden output was captured from real Stencil
before any compiler code was written, and the analysis and code generation were ported on
[oxc](https://oxc.rs) until the comparison was clean. Code generation reached 164 of 164 files identical to Stencil's, about 40× faster per file.

A Vite plugin and a starter project followed, then the 136-component ui-kit, migrated to Stencil v5
for real and brought to a clean `stencil build`, and its 874 specs, green with both compilers. Inheritance and
mixins, `@AttachInternals`, serializers and source maps landed the next day. The parity corpus has since
grown to **{{ s.parity.passed }}/{{ s.parity.total }}** fixtures identical to Stencil v5.
The full account is [How it was built](/guide/how-it-was-built).

## Going public {#going-public}

<When when="17–19 October 2026" :issues="[12, 13, 14, 15, 16]" :prs="[18, 19, 20, 21, 22]" release="v0.1.0" />

A licence (MIT), CI and the Storybook on GitHub Pages, prebuilt native binaries per platform, a README
and docs for a public audience, and an automated release with semantic-release.

## Closing the fallbacks {#closing-the-fallbacks}

<When when="19 October 2026" :issues="[1, 2, 3, 4]" :prs="[24, 25, 26, 23]" />

Until now a handful of features were handed back to Stencil's own compiler, file by file. Four issues
closed that list:

1. **`scopeCss`**: Stencil's CSS scoping, ported to Rust, so inline styles on scoped components compile in stencilrs ([#24](https://github.com/popcorn245/StencilRS/pull/24)).
2. **Per-mode `styleUrls`** (`{ ios, md }`) ([#25](https://github.com/popcorn245/StencilRS/pull/25)).
3. **Component `globalStyle`** and `globalStyleUrl` ([#26](https://github.com/popcorn245/StencilRS/pull/26)).
4. **Const evaluation**: constants as decorator arguments and computed member names ([#23](https://github.com/popcorn245/StencilRS/pull/23)).

## Full output parity {#full-output-parity}

<When when="19 October 2026" :issues="[5, 6, 7, 8]" :prs="[28, 31, 30, 33, 34]" />

Customelement output was never the whole of what Stencil emits. Four more outputs, each compared with
Stencil's own:

1. **Lazy-loading** (`loader-bundle`) output, `componentExport: 'lazy'` ([#28](https://github.com/popcorn245/StencilRS/pull/28)).
2. **SSR / hydrate** output, `componentExport: 'ssr'` ([#31](https://github.com/popcorn245/StencilRS/pull/31)).
3. **spec-page** mode for `newSpecPage` ([#30](https://github.com/popcorn245/StencilRS/pull/30)).
4. **Docs metadata**: JSDoc text and the full `complexType` ([#33](https://github.com/popcorn245/StencilRS/pull/33)).

Decorated base classes and mixins got lazy, SSR and spec-page output too ([#34](https://github.com/popcorn245/StencilRS/pull/34)).

## Proving the speed {#proving-the-speed}

<When when="19–20 October 2026" :issues="[9, 10, 11]" :prs="[29, 32, 27, 35, 36]" />

A speed claim for a compiler means little until it is measured where people use it. Stencilrs was fed
into Stencil's own build in place of its TypeScript transform passes, and a **full `stencil build`**
of the ui-kit was benchmarked against stock Stencil v5 ([#29](https://github.com/popcorn245/StencilRS/pull/29),
[#32](https://github.com/popcorn245/StencilRS/pull/32)): **{{ d.fullBuild }}** on Stencil's own
"build finished" time, a modest gain on purpose, because only the component transform changes.
Source-map quality got its own fix ([#27](https://github.com/popcorn245/StencilRS/pull/27)).

The benchmarks were re-run on a quiet machine and the headline claims matched to them
([#35](https://github.com/popcorn245/StencilRS/pull/35), [#36](https://github.com/popcorn245/StencilRS/pull/36)):
**{{ d.perFile }}** per file and **{{ d.viteBuild }}** for a production Vite build. See the
[Benchmarks](/benchmarks).

## 0.2.0 {#0-2-0}

<When when="20 October 2026" :prs="[37]" release="v0.2.0" />

`next` was promoted to `main` as 0.2.0 ([#37](https://github.com/popcorn245/StencilRS/pull/37)).

## Fast from a cold start {#fast-from-a-cold-start}

<When when="23 October 2026" :issues="[38, 39, 40, 41, 42, 43, 44, 45]" :prs="[50, 48, 47, 51, 46, 49, 52]" />

The benchmarks measured warm builds, but every real build and dev server starts cold. So the
overhead around the compiler went next:

- cheaper source-map composition ([#50](https://github.com/popcorn245/StencilRS/pull/50));
- tsconfig and imported-module summaries cached across calls ([#48](https://github.com/popcorn245/StencilRS/pull/48));
- a lighter Node binding: mimalloc and JSON results ([#47](https://github.com/popcorn245/StencilRS/pull/47));
- async and batch transpile, off the main thread ([#51](https://github.com/popcorn245/StencilRS/pull/51));
- `foldBuildFlags` ported to Rust ([#46](https://github.com/popcorn245/StencilRS/pull/46));
- component CSS served through the Rust `scopeCss` in the Vite plugin ([#49](https://github.com/popcorn245/StencilRS/pull/49));
- **no TypeScript on the Vite path** unless a file falls back, which saves loading it (about 700 ms) before the first file is compiled ([#52](https://github.com/popcorn245/StencilRS/pull/52)).

The ui-kit, fresh process, before and after ([#52](https://github.com/popcorn245/StencilRS/pull/52)):

<DataTable
  :head="['Measurement', 'Before', 'After', 'Change']"
  :rows="[
    ['Cold production build', d.coldBuildBefore, d.coldBuildAfter, d.coldBuildRatio],
    ['Dev server, process start to first response', d.devBefore, d.devAfter, d.devRatio],
  ]"
/>

## Cornfield integration {#cornfield-integration}

<When when="12 November 2026" :issues="[54, 56, 57]" :prs="[55, 58, 59]" />

Putting stencilrs into a second real project, cornfield, turned up three gaps, each a clear issue and a fix:

- **Type declarations** for library builds: `components.d.ts` is emitted through the Vite plugin ([#54](https://github.com/popcorn245/StencilRS/issues/54), [#55](https://github.com/popcorn245/StencilRS/pull/55)).
- **Intersection types** in `@Prop` types resolved to an empty string, now resolved in `complexType` ([#56](https://github.com/popcorn245/StencilRS/issues/56), [#58](https://github.com/popcorn245/StencilRS/pull/58)).
- **musl**: prebuilt binaries for Alpine, and a clear error on unsupported platforms ([#57](https://github.com/popcorn245/StencilRS/issues/57), [#59](https://github.com/popcorn245/StencilRS/pull/59)).

## Now: Ionic as the proving ground {#now-ionic-as-the-proving-ground}

<When when="18 November 2026" :issues="[60, 61, 62, 63, 64, 65, 66, 67]" />

A compiler that matches Stencil on its own fixtures and one component library is a good start. The
next test is somebody else's: [Ionic Framework](https://ionicframework.com)'s core, MIT licensed, about
{{ s.ionic.components }} components with per-mode Sass styles and real-world Stencil code. It is credited as
the test subject and never used as our branding.

- **Baseline** ([#60](https://github.com/popcorn245/StencilRS/issues/60)): Ionic {{ s.ionic.version }}, pinned, migrated to Stencil v5 with checked-in, reviewable steps, and a `stencil build` baseline. A first probe: all {{ s.ionic.components }} component files transpile per file through stencilrs, with no errors.
- **Build it with stencilrs** ([#61](https://github.com/popcorn245/StencilRS/issues/61)): every component mounted in both modes through the Vite plugin. Every failure is a win, and becomes an issue.
- **Gaps found** ([#62](https://github.com/popcorn245/StencilRS/issues/62)): docs and spec-page metadata is clean for only {{ s.ionic.complexTypeClean }} of {{ s.ionic.components }} components, because of `complexType` cases such as intersection members and generic methods.
- **This site** ([#63](https://github.com/popcorn245/StencilRS/issues/63)): VitePress, with the stencilrs plugin in its Vite config, so the docs are themselves compiled by it. One page per Ionic component, with live demos and API tables from stencilrs' own metadata, is in the Components section ([#64](https://github.com/popcorn245/StencilRS/issues/64)); an Ionic-built-both-ways benchmark follows ([#65](https://github.com/popcorn245/StencilRS/issues/65)), charts ([#66](https://github.com/popcorn245/StencilRS/issues/66)) and deployment ([#67](https://github.com/popcorn245/StencilRS/issues/67)).
