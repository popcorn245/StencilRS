---
title: "Introduction"
description: "What stencilrs is, how it fits with Stencil v5, and where to start."
---

# Introduction

**Stencil v5 components, compiled by Rust.**

stencilrs is a re-implementation of the part of the [Stencil](https://stenciljs.com) compiler that
turns a component file (`@Component`, `@Prop`, `@State`, JSX…) into a working custom element. It is
written in Rust on top of [oxc](https://oxc.rs), runs inside Vite 8 (Rolldown), and produces the
**same output as Stencil v5**, roughly **20× faster per file** and **~3× faster end to end**.

You write components exactly as you would for Stencil v5. stencilrs compiles them; Stencil's own
runtime (`@stencil/core`) runs them in the browser.

## What's on this site

| Section | What |
|---|---|
| **Guide** | Everything in this sidebar: how to use stencilrs, how it works, how it was built and verified. |
| [**The story**](/story/) | How the project got here, as a timeline. |
| [**Components**](/components/) | Live components, compiled by stencilrs as the page loads: one page per Ionic Framework component, with demos in iOS and Material Design mode and API tables. |
| [**Benchmarks**](/benchmarks) | The measurements behind the speed claims. |
| [**Reference**](/reference/pipeline) | Design notes: Stencil v5's compile pipeline, its transformers, and the project READMEs. |
| [**Storybook**](/storybook/) | The 136-component ui-kit and the starter components, each with its stories. |

Every component on this site was compiled by stencilrs as the page loaded, through the Vite plugin:
this site is itself a test of the compiler.

## Where it stands

| Check | Result |
|---|---|
| Same output as Stencil v5's per-file compiler (`transpileSync`), 222 fixtures, in each of five outputs | **222 / 222** metadata, diagnostics and code |
| Same metadata as a full `stencil build`, 136 ui-kit components | **136 / 136** |
| ui-kit spec suite (874 tests), Stencil v5 vs stencilrs | **874 / 874** both, no test differs |
| Per-file compile, 222 files, source maps on | **108 ms** vs 2.4 s (22×) |
| Production `vite build`, all ui-kit components | **1.0 s** vs 3.0 s (2.9×) |

## Start here

- [Getting started](/guide/getting-started): install it, add the Vite plugin, run the starter.
- [Writing components](/guide/writing-components): what's supported.
- [How it works](/guide/how-it-works) and [How it was built](/guide/how-it-was-built).
- [Benchmarks](/benchmarks).
