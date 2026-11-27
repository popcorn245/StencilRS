# Spike: how small can the stencilrs runtime get?

> **Shipped.** `runtimeFeatures` is a product option, `'auto'` by default for `runtime: 'stencilrs'` production browser builds. The
> user-facing docs are [runtime.md](runtime.md#smaller-builds-runtimefeatures) and [vite-plugin.md](vite-plugin.md); the sections below
> are the measurements that led to it. What changed from this write-up: `'auto'` reads the modules the build compiles (component
> metadata and compiled code, `FeatureScan` in `runtime-features.js`), not a regex over `src/`, and it covers packages the build
> compiles (`hydrateClient.collections`); `hydrate` and `resume` follow `hydrateClient`; `light: false` with a component that is not
> shadow DOM is a build error; a gated build on a server-rendered page logs once; gated builds with hydration were run in Chromium
> (`test/runtime-features-hydrate.test.js`, `examples/starter/bench/load/check.mjs`). The switches' constants are written into the
> runtime before it is bundled (a late substitution left dead classes in the bundle), and `deferDefine`'s lazy-define code, which was not
> behind `F_RESUME`, now is (the whole runtime stayed 9,034 B gzip; a shadow-only app is 4,620 B, 4,547 B before the console message).
> The whole runtime measures 9,034 B gzip here against 9,307 B for the commit before this spike, so the 25 B regression is gone.
> Numbers below are the spike's own, not re-measured, except where docs/runtime.md has newer ones.

Question: `runtime: 'stencilrs'` (`runtime.js`) is 25.4 KB raw / 9.5 KB gzip with hydration in place, resuming and signal
bindings (docs/runtime.md). How small is it for an app that uses none of that, and how does it compare with Lit, Solid, Svelte 5,
Preact and Qwik for the same tiny app?

Answer: **4.5 KB gzip** for the reference app with every optional feature compiled out (8.8 KB with all of them), against 4.9 KB
for Solid, 6.6 KB Preact, 7.0 KB Lit, 13.0 KB Svelte 5 (table below). Nothing here changes default behaviour; the default bundle
grows by 25 bytes gzip.

## The reference app

One component, in every framework (`examples/starter/bench/size/apps/*`): a counter with one prop (`label`), one state
(`count`), a click handler, shadow DOM with a four-rule style, and a keyed list of 10 items (the item for `count % 10` gets a
class). Production builds with Vite 8.4.0 (Qwik: Vite 7.1.12, which Qwik 1 needs), default minifier, `target: es2022`. Size is all JS
in the output (no CSS file: every app has its style in JS). Each built app was loaded in Chrome 158 by `smoke.mjs`: it renders
the button and 10 items, a click moves the count and the bold item.

Where frameworks differ, so the numbers are read fairly:

| Framework | How the app is a custom element with a shadow root |
|---|---|
| Stencil (runtime `stencil`) | Stencil's runtime as the plugin builds it today, standalone, every feature flag on (docs/runtime.md says `stencil build` tree-shakes more, so the real gap is smaller) |
| stencilrs | the component as written for Stencil, compiled by stencilrs |
| Lit 3.3.3 | `LitElement`, `repeat` and `classMap` directives, `static styles` |
| Solid 1.9.9 | **no custom-element mode of its own** (`solid-element` is a separate package, not used): a 20-line `HTMLElement` that calls `render()` into a shadow root with an adopted sheet. This is what solid-element does at its core; a plain Solid component without the element would be about the same size |
| Svelte 5.43.0 | `compilerOptions.customElement: true` and `<svelte:options customElement>`: Svelte's custom-element wrapper is in the number (the shadow root and style come with it) |
| Preact 10.27.2 | `preact-custom-element` 4.5.1 with `shadow: true`, `useState`, the style as a `<style>` in the component |
| Qwik 1.20.4 | **no custom element and no shadow DOM**: a `component$` rendered client-side (`csr`) with `useStylesScoped$`, as `bench/qwik`. Counts all 7 chunks, though the handler chunk (152 B gzip) loads only on the click |

## Results: the same app in each framework

Reproduce: `cd examples/starter/bench/size && npm install && (cd qwik && npm install) && node run.mjs && node smoke.mjs`.
Gzip is level 9, brotli quality 11, of all the build's JS files, in bytes. The machine was a shared 4-vCPU box (load average
about 1.0 to 1.5); sizes are deterministic, so that does not matter.

| Framework | Version | Raw | Gzip | Brotli |
|---|---|---:|---:|---:|
| **stencilrs, auto-gated** (`runtimeFeatures: 'auto'`) | this branch | 11,282 B (11.0 KB) | **4,547 B (4.4 KB)** | 4,118 B (4.0 KB) |
| Solid | 1.9.9 | 12,327 B (12.0 KB) | 5,023 B (4.9 KB) | 4,551 B (4.4 KB) |
| Preact + preact-custom-element | 10.27.2 / 4.5.1 | 16,482 B (16.1 KB) | 6,747 B (6.6 KB) | 6,125 B (6.0 KB) |
| Lit | 3.3.3 | 18,322 B (17.9 KB) | 7,119 B (7.0 KB) | 6,401 B (6.3 KB) |
| **stencilrs, whole runtime** (default) | this branch | 24,115 B (23.5 KB) | 8,774 B (8.6 KB) | 7,946 B (7.8 KB) |
| Svelte 5 (custom element) | 5.43.0 | 33,509 B (32.7 KB) | 13,320 B (13.0 KB) | 12,118 B (11.8 KB) |
| Qwik (client-rendered, no shadow DOM) | 1.20.4 | 57,288 B (55.9 KB) | 24,817 B (24.2 KB) | 22,236 B (21.7 KB) |
| Stencil (its runtime, as the plugin builds it) | 5.0.0-beta.25 | 76,588 B (74.8 KB) | 26,209 B (25.6 KB) | 23,410 B (22.9 KB) |

Reading it:

- stencilrs gated to what the app uses is smaller than Solid (by 0.5 KB gzip), Preact, Lit and Svelte for this app. The app code is in
  every number (the compiled stencilrs component is roughly 0.4 KB gzip), and Solid's number includes my hand-written element wrapper.
- One tiny component says little about a large app: these numbers are mostly fixed framework cost, and per-component cost
  (what each added component adds) was not measured here. Solid and Svelte compile away more per component than a runtime does.
- The whole stencilrs runtime (8.8 KB) sits between Lit and Svelte. It was 8.75 KB before this spike's refactor (+25 B).
- Qwik's size is not comparable in what it buys: it loads little on startup from server HTML (docs/runtime.md measures that).
  Here it is client-rendered, so it pays for its whole core.

## Where the runtime's bytes go

`runtime.js` was one module: every feature was always in the bundle, because the code reaches them through the same classes.
For the app above, `features.mjs` builds it with all optional features on, then turns each off on its own (marginal gzip bytes
saved; `hydrate` is measured with `resume` already off, since resuming needs hydration):

| Feature (`runtimeFeatures` key) | Raw | Gzip | Brotli | Used by |
|---|---:|---:|---:|---|
| `hydrate`: hydration in place (claim scanning, `r:n` marks, deferred lists, mismatch fallback) | 5,190 | 1,661 | 1,465 | pages server-rendered by `renderToString` / `hydrateClient` builds |
| `resume`: state script, event delegation, waking components, early-event replay | 1,798 | 650 | 589 | resumable pages (`<script type="rs/state">`) |
| `light`: components without shadow DOM (slot relocation, `SlotPart`, scoped and global style injection, `sc-` class) | 3,371 | 889 | 829 | any `@Component` that is not `shadow` (**Stencil's default encapsulation is none**), scoped CSS |
| `server`: the `SERVER` branches (claim numbers, `__live`, list ranges) | 707 | 306 | 287 | `runtime-server.js` only: never needed in a browser |
| `signals`: signal bindings in parts (Stencil's and TC39) | 1,017 | 381 | 319 | `@stencil/core/signals`, `@popcorn245/stencilrs/signals` |
| `vnode`: `h()` vnodes in node parts, `SpreadPart` | 1,200 | 366 | 346 | code that calls `h` / functional components, `{...props}` in JSX |
| `hot`: the hot-reload hooks | 188 | 98 | 69 | dev server only |
| **all off** (client, shadow DOM only; app included) | 11,282 | **4,547** | 4,118 | |

The sums do not add to 8,774 - 4,547 = 4,227 exactly (shared helpers drop out together), but close: 1,661 + 650 + 889 + 306 +
381 + 366 + 98 = 4,351.

Whole-app sizes for typical profiles (every feature not listed is off):

| Profile | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| client, shadow DOM only | 11,282 | 4,547 | 4,118 |
| + light DOM (slots, scoped CSS) | 14,400 | 5,429 | 4,927 |
| + signals | 12,163 | 4,898 | 4,440 |
| SSR hydration in place, no resuming | 15,927 | 6,079 | 5,471 |
| SSR hydration + resuming | 17,716 | 6,728 | 6,065 |
| hydration + resuming + light + signals + vnode | 23,220 | 8,367 | 7,569 |

What stays in the 4.5 KB (the always-on core, from `stub.mjs`: the app built with all features off, with one part of the core stubbed
out of a temporary copy of `runtime.js`; the stubbed app does not work, only its size counts):

| Part of the core | Raw | Gzip |
|---|---:|---:|
| keyed lists: longest increasing subsequence (`lis`) | 238 | 108 |
| `class=` parts (string or object) | 408 | 110 |
| `style=` parts | 296 | 91 |
| attribute and property parts | 397 | 119 |
| event parts (`onClick`, ...) | 274 | 107 |
| ref parts | 77 | 14 |
| attribute reflection and serializers | 286 | 111 |
| `@Listen` (window, document, host) | 139 | 54 |
| parent waits for its children's load | 155 | 70 |
| `componentOnReady` and the READY promise | 137 | 50 |
| adopted stylesheets (and the `<style>` fallback) | 166 | 69 |
| `@Watch` | 55 | 21 |

Each is small (under 120 B gzip). The rest of the roughly 3.6 KB is the template parser and instances, the node part, list
diffing, the lifecycle and `define`: the part every component needs, and not worth splitting. The always-on parts above could be
made opt-in the same way, but at 50 to 120 B each, and each one a way to break an app silently, I would not.

## What was built

All opt-in; the default output has the same behaviour as before.

- **`runtime.js`**: seven switches (`F_SERVER`, `F_HYDRATE`, `F_RESUME`, `F_LIGHT`, `F_SIGNALS`, `F_VNODE`, `F_HOT`), each
  `typeof __RS_FEAT_X__ === 'undefined' || !!__RS_FEAT_X__`, so the file runs unchanged when nothing is defined (dev server,
  Vitest, the SSR renderer, which all load it as source). Code behind a switch is guarded with it, and methods that were only
  reachable through a feature moved out of their classes (`NodePart.undefer` / `setH`, `Base.__state` / `__resume` /
  `__hydrate`, and the slot-routing half of `Base` into `class Light`, which `Base` extends only when `F_LIGHT`), so that a build
  that turns the feature off drops them. Part types for spreads and `<slot>` in a build without them throw
  `stencilrs runtime: ... is not in this build (runtimeFeatures)`.
- **`vite.js`**: the option `runtimeFeatures` (`runtime: 'stencilrs'`, production builds, not SSR or spec-page): `{ hydrate: false, ... }`
  or `'auto'`. In every such build the plugin now `define`s all seven constants (on unless turned off), so the minifier folds them.
  That is the +25 B: without the `define` the `typeof` checks stay in the bundle (+255 B gzip), so the plugin always writes them.
- **`runtime-features.js`** (new, published): `runtimeFeatureDefines`, `detectUsedFeatures`, `autoRuntimeFeatures`, `readSources`.
  `'auto'` reads the project's `src/` (not `node_modules`) and turns on: `light` if any `@Component` is not shadow, `signals` on a signals
  import, `vnode` on an import of `h` / `Fragment` / `FunctionalComponent` / `Mixin`, a JSX spread or a capitalized tag; `hydrate` and `resume`
  with `hydrateClient`; `server` and `hot` never. A pattern that might mean a feature counts as using it.
- **`test/runtime-features.test.js`**: the detection and the defines (4 tests).
- **`examples/starter/bench/size/`**: the apps, `run.mjs`, `smoke.mjs`, `features.mjs`, `stub.mjs`.

Tests run (all pass): `runtime-ssr` 15, `ssr-hydrate` 5, `islands-hydrate` 3, `islands-client` 12, `islands-scoped` 19, `render-cache` 17,
`vite-hydrate-client` 9, `vite` 20, `ssr-serializer` 21, `runtime-features` 4. `smoke.mjs` passes for all 8 frameworks and for
`runtimeFeatures` with each feature off and with all of them off (client app in Chrome).

## Not measured, not done

- Gated builds with **hydration on** (profiles `SSR hydration ...` above) were sized but not run against server HTML in a browser: the
  existing hydration tests run the whole runtime. Hydrating with `light` off, or `light` components in a `light: false` build, is
  untested (the latter renders without slots and without its style: an unsupported combination).
- `'auto'` cannot see components that come from another package (`hydrateClient.collections`, a UI kit imported from
  `node_modules`, a dynamically defined tag). An app that uses such a library must pass the features itself.
- No timings: the change is bytes only; the hot paths gained a constant-folded check each, and the +25 B shows nothing else moved.
- Svelte without its custom-element wrapper and Lit without directives were not built (the question was a custom element for each).
- Qwik's resumability (what it is for) is not in a client-rendered size. See docs/runtime.md.
- Stencil's own `stencil build` tree-shaking (the lazy build) was not run: its row is the standalone runtime the plugin ships.

## Verdict

**Build it (S to land, M to harden).** The core question is settled by measurement: a tiny shadow-DOM app costs 4.5 KB gzip with
stencilrs, not 8.8 KB, and that is below Solid, Preact, Lit and Svelte for the same app. The features that cost the most are the ones
a client-only shadow-DOM app never uses (hydration 1.7 KB, light DOM 0.9 KB, resuming 0.65 KB).

- **Land now (S):** the switches, the always-defined constants and the `runtimeFeatures` option as opt-in. It is small, behaviour-preserving
  and tested.
- **Make two of them the default (S, small risk):** `server: false` and `hot: false` in every production browser build: 0.4 KB gzip (4.5% of
  the runtime) for nothing but ordering. This would change the default output, so I left it for the lead.
- **Before `'auto'` is the default (M):** run the hydration builds against server HTML in a browser, and let the plugin look at what it actually
  compiled (the metadata the project already collects, `vite-project.js`) in place of a regex over `src/`, which also covers collections.
  A mistaken `false` fails quietly: a light-DOM component loses its slots and style.
- **Risks:** wrong detection (above); two more places a feature is written (the constant and its guard); the `.call(el)` helpers
  are less obvious than methods. No deviation from web specs: this removes code that the app does not use, and does not change
  what the code does.
- **Not worth it:** gating the always-on core (lists, class/style/attribute/event parts, reflection, watchers: 50 to 120 B each).
