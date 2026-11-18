---
title: "Roadmap"
description: "What was left, what has landed since, and what is next."
---

# Roadmap

This page used to be a list of gaps. Almost all of them have been closed; the dates and pull
requests are on [the story](/story/). Each item that was on it:

| Was | Now |
|---|---|
| Inline `styles` on scoped components fell back to Stencil (needs `scopeCss`) | Ported to Rust, [#24](https://github.com/popcorn245/StencilRS/pull/24). |
| Per-mode styles (`styleUrls: { ios, md }`) and component global styles fell back | Ported, [#25](https://github.com/popcorn245/StencilRS/pull/25) and [#26](https://github.com/popcorn245/StencilRS/pull/26). |
| No lazy-loading (`loader-bundle`) output | `componentExport: 'lazy'`, [#28](https://github.com/popcorn245/StencilRS/pull/28). |
| No SSR output | `componentExport: 'ssr'`, [#31](https://github.com/popcorn245/StencilRS/pull/31). |
| No `newSpecPage` mode | spec-page mode, [#30](https://github.com/popcorn245/StencilRS/pull/30). |
| No docs metadata (JSDoc text, full `complexType`) | Ported, [#33](https://github.com/popcorn245/StencilRS/pull/33). |
| Lazy output of decorated base classes and mixins fell back | Ported, with SSR and spec-page output, [#34](https://github.com/popcorn245/StencilRS/pull/34). |
| A full `stencil build` replacement for the benchmark | A benchmark patch of Stencil's own build, [#29](https://github.com/popcorn245/StencilRS/pull/29) and [#32](https://github.com/popcorn245/StencilRS/pull/32); see [Benchmarks](/benchmarks). |

## Next

The Ionic proving ground: build [Ionic Framework](https://ionicframework.com)'s core, about 95
components, with stencilrs and make every one render, then document each component from stencilrs'
own metadata. Ionic is the test subject here, never our branding. See
[the story](/story/#now-ionic-as-the-proving-ground).

## Tracking

Each item is an issue on [GitHub](https://github.com/popcorn245/StencilRS/issues), with what
"done" means for it. Pick one up, or open a new one.
