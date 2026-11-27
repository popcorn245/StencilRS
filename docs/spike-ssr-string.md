# Spike: a string renderer for the stencilrs runtime's server rendering

Question: how fast can stencilrs SSR get if it stops rendering into a DOM emulator, and how does that compare
with Lit SSR, Solid, Qwik and Astro?

Short answer: on the 500-card page the happy-dom renderer takes about 90 to 150 ms per render. A prototype string
renderer that reuses the compiled templates produces **byte-identical HTML** in about **2.7 to 4 ms**
(30 to 40 times faster), and the client resumes it unchanged in Chromium. It is as fast as Astro and Lit
(custom element per card), 3 to 4 times faster than Qwik, and about 6 times slower than Solid's `renderToString`.
Verdict: build it, as an opt-in renderer with an automatic fallback to happy-dom (see the end).

Branch `spike/ssr-string`. Everything is under `spike/`; no existing file changed, default output is unchanged.

## 1. Baseline: the happy-dom renderer

`examples/starter/bench/load` (500 product cards, each a scoped `<load-card>` with a like button, plus a header
counter), rendered by `createRenderer` from `runtime-server.js` (happy-dom 21.0.1, resumable). Node 22.23, a shared
4-vCPU box with other spikes running (load average 1.4 to 2.6, see below).

| | ms |
|---|---:|
| create renderer + import components (setup) | 180 to 307 |
| first render (cold) | 189 to 375 |
| warm render, n=30, median (min-max) | 92 (78-137), 138 (91-239), 153 (95-228) over three runs |
| warm render, n=40, interleaved with the string renderer | median 115 (87-295) and 146 (89-259) |

HTML is 177,447 characters, 15,914 bytes gzip. The spread between runs is the other spikes' load; minimums are
the most stable number (78 to 95 ms).

`node --cpu-prof` over 41 renders (self time, `spike/prof-summary.mjs`):

| where the time goes | share |
|---|---:|
| happy-dom: DOM creation, insertion, queries, events (`Node`, `Element`, `EventTarget`, `Text`, `NamedNodeMap` ...) | 49.0% |
| garbage collection (mostly what happy-dom allocates for the DOM nodes and their attribute maps) | 24.8% |
| `runtime-server.js` (`serialize`, `serializeKids`, `settle`): walking the DOM back out to a string | 12.1% |
| happy-dom: attributes | 4.3% |
| the stencilrs runtime and the components' own code | 4.8% |
| node internals, module loading | 3.7% |
| happy-dom: HTML parsing of templates, its serializer | 0.2% (the runtime serializes itself, and parses each template once) |

So about 90% of a render is the DOM emulator (its work, its garbage, and walking it); runtime and component code
are 5%. That is why a renderer that never builds a DOM can get close to the cost of the string it has to write.

## 2. The prototype: `spike/runtime-string.js`

### What it is

The compiled components import their runtime. For a server bundle built with `spike/vite.string.config.ts` that
import resolves to `spike/runtime-string.js` instead of `runtime.js`. It exports the same surface the compiled code
uses (`template`, `t`, `Base`, `define`, `createEvent`, `Host`, ...). A component is a plain object; `render()`
returns `t(template, values)` as before; the renderer walks the compiled template (`html` + `parts`) and splices
values into a string:

- Each template is compiled once (a small tokenizer, not a DOM) into a program: static strings and ops (open an
  element that carries marks or is a component host, a hole, a top-level text).
- Part values are applied the way `runtime.js` applies them: text (escaped, with its `<!--^t<n>-->` mark),
  attribute parts, class and style parts, event parts (`r:e`), nested templates, arrays (keyed lists), nested
  components (their output spliced in the host element), `<Host>` attributes, reflected props, scoped CSS
  (`<style sty-id>` in the head, once per tag), shadow roots (`<template shadowrootmode="open">` with the style first).
- It reproduces the claim order of `runtime.js` exactly (`claim`/`instantiate`/`setList`: a root marker first,
  then top-level nodes, then marked nodes, then each part; a list claims all its start and marker nodes first and
  then renders its entries last to first), so `r:n`, `<!--^n-->`, `<!--^t<n>-->` and the `~<last claim>:<count>`
  list skips come out the same. `s-rs` ids are assigned in document order in a last pass over the string (a
  placeholder per host), where the state script and the event catcher are also produced.
- Everything it does not model throws `Fallback` (see below). `createStringRenderer(load, { fallback })` calls
  `fallback(html)` for such a page; `spike/fallback-worker.mjs` is the happy-dom renderer in a worker thread, which
  also keeps happy-dom's `window`/`document` globals away from the string renderer's process (see risks).

### Is the output the same?

`node spike/compare-html.mjs`: the 500-card page, string vs happy-dom: **identical, byte for byte** (177,447
characters, the state script and event catcher included).

`node spike/compare-fixtures.mjs` compares the two renderers on more components (all identical except where a
fallback is expected):

| page | result |
|---|---|
| shadow DOM + style + prop | identical |
| keyed list of shadow components + `onClick`, resumable and not | identical |
| class object / style object / attribute / `href` / escaping / conditional / `null`, `false`, `0`, `''` children, scoped style | identical |
| `<Host class role>`, `@Prop({ reflect })`, shadow root with a `<slot>` element | identical |
| functional component with children, state set in `componentWillLoad` | identical |
| nested components, a list inside a list, shadow components in a keyed list | identical |
| text around two components | identical |
| scoped `<slot>` (light-DOM slot relocation) | falls back |
| `document` used in `componentWillLoad` | falls back (`ReferenceError`, no DOM exists) |
| `async componentWillLoad` | falls back |
| a signal bound to a part | falls back |

### Does the client take it?

`node spike/hydrate-check.mjs` (Chrome for Testing 158 via `CHROME=/usr/bin/google-chrome`, the real client bundle of
`bench/load`): the string-rendered page loads without console errors, all 500 cards are upgraded, the server's
nodes are the same objects afterwards, clicking card 10 twice and card 250 once gives `♥ 2` / `♥ 1` (others `♥ 0`),
clicking the header counter gives `Clicked 1` and keeps the 500 cards. `HYDRATION OK`. (Being byte-identical to the
happy-dom output, this is what `test/runtime-ssr.test.js` already covers for the DOM renderer, which still passes:
15/15.)

### Speed

Warm, n=40, interleaved in one process (`node spike/bench-render.mjs 40`):

| renderer | median ms (min-max) |
|---|---:|
| stencilrs happy-dom | 115 (87-295) and 146 (89-259) |
| stencilrs string | 3.3 (2.5-9.9) and 4.1 (2.5-39.7) |

Standalone, n=300 to 600 (`spike/bench-string-only.mjs`), median 2.4 to 2.8 ms, min 1.75 ms. Cold: no setup
(1 ms: nothing to create), first render 13 to 23 ms (the JIT), against 180 to 300 ms setup plus 190 to 375 ms
first render for happy-dom.

Where the ~2.7 ms go (`render.sync`, measured with `performance.now()`): about 1.75 ms building the string
(500 component instances, template walks, claim bookkeeping) and about 1.25 ms in the last pass (flattening the
177 KB string and numbering the 501 hosts). It is not tuned: no pooling of component instances, `Map` per
instance for members, per-render arrays for attribute ops. I did not measure an optimized version.

## 3. Comparison on an equivalent page

The same page everywhere: header with a counter button, 500 cards (name, price, like button with its own counter),
same data. Versions pinned: Qwik 1.20.4 (the existing `bench/qwik/load`), Lit 3.3.3 + @lit-labs/ssr 4.1.0,
solid-js 1.9.20 (`solid-js/web` Node build, JSX compiled by babel-preset-solid 1.9.19 with `generate: 'ssr',
hydratable: true`), Astro 7.4.13 (container API, `experimental_AstroContainer`, one `.astro` component per card,
run inside vitest 5.0.4 because Astro compiles `.astro` through Vite), stencilrs at this commit. Production
builds, Node 22.23. Warm renders after 5 warm-ups. All but Astro are interleaved in one process, with the order
rotating each iteration (`spike/compare/bench-all.mjs`); Astro runs in its own process three times (n=40 each).
Load average 1.5 to 2.6 from other spikes: treat differences under about 20% as noise.

| renderer | ms/render, median (min-max) | renders/s | HTML gzip bytes | HTML bytes |
|---|---:|---:|---:|---:|
| stencilrs, happy-dom (today) | 115 (87-295) | 9 | 15,914 | 177,447 chars |
| **stencilrs, string (spike)** | **3.0 (2.1-7.0)** | **336** | 15,914 | 177,447 chars |
| Lit SSR, a LitElement per card (declarative shadow DOM) | 4.8 (2.7-19.4) | 208 | 4,801 | 213,760 |
| Lit SSR, lit-html templates only (no element per card) | 1.2 (0.8-4.6) | 845 | 3,565 | 133,136 |
| solid-js `renderToString` (hydratable) | 0.44 (0.30-2.5) | 2256 | 4,722 | 80,421 |
| Qwik 1.20.4 `renderToString` | 9.8 (6.4-19.8) | 102 | 21,114 | 158,989 |
| Astro 7.4.13 container, `.astro` per card | 1.7 (1.35-4.5) | 590 | 3,252 | 62,012 |

Medians of the three repeats: stencilrs string 2.65 to 2.97, Lit 4.8 to 5.1, Lit templates 1.2 to 1.4, Solid
0.43 to 0.44, Qwik 9.8 to 10.8, Astro 1.4 to 1.8 (the stencilrs happy-dom row is from `bench-render.mjs` in
another process: the DOM renderer installs `window`/`document` globals, which must not be there for the others).

What the HTML contains differs, so read the bytes with it in mind:

- stencilrs: marks for in-place hydration (`r:n`, `<!--^n-->`), each component's state, the event catcher. It is
  resumable: nothing runs on load. About 3.5 to 4.7 times the gzip size of Lit/Solid/Astro (the marks are
  different numbers on every card, so they don't compress), 25% smaller than Qwik's.
- Qwik: its own state and listener serialization; resumable.
- Lit: hydration markers (`<!--lit-part-->`); the client re-renders every element on hydration (not resumable).
- Solid: `data-hk` keys; the client runs every component on hydration.
- Astro: plain HTML. The like buttons are not wired (an island would be needed per card), so it is the
  floor for what a page of this shape costs to write.

Not apples to apples either: the Solid/Astro/Lit-templates rows have no component instance per card. The Lit
custom-element row and the stencilrs rows do, and they are within 1.5 times of each other.

## 4. Verdict

**Build it** (opt-in `createRenderer(load, { renderer: 'string' })`, with automatic fallback to the happy-dom renderer per
page), because:

- 30 to 40 times faster on a realistic page (~3 ms against ~90 to 150 ms), cold start without a 200 to 300 ms
  setup, no per-request DOM garbage (24% of the baseline was GC), and it puts stencilrs in the same range as Lit and
  Astro, with Qwik clearly behind.
- The output can stay byte-identical, so nothing changes on the client and the existing hydration, resuming and
  islands work apply. The same differential test (string vs happy-dom, byte for byte) works as the safety net.
- The compiler already did the hard part: a template string plus part list is all a string renderer needs. The
  spike is about 770 lines (runtime-string.js, with comments).

**What it cannot beat**: Solid, at 0.44 ms, writes a smaller string (80 KB, no marks, no state) from components
that are plain functions. The marks, the state diff per component (`stateEntry`) and the instance per card are the
price of resumability; I'd expect 1.5 to 2 ms after tuning, not 0.5 (not measured).

### Effort: M to L (about 3 to 4 weeks for one person to ship it as a supported option)

Covered by the spike (and tested): templates, text/attribute/class/style/event parts, `<Host>`, lists and nested
lists, nested components, shadow and scoped components, scoped and shadow styles, reflected props, the state
script, the event catcher, `~` list skips, `s-rs`/`s-rh`, resumable on and off, functional components,
lifecycle hooks that are synchronous and DOM-free (`connectedCallback`, `componentWillLoad`, `componentWillRender`,
`componentDidRender`, `componentDidLoad`), direct `@Event` listeners.

What a real implementation still needs:

| feature | what it takes | size |
|---|---|---|
| **Slots in light DOM** (scoped/none encapsulation): `SlotPart`, relocation of the host's children, hidden stash, `r:l`, `r:h`, `r:s`, marks of another component (`1.5`), fallback content | the hardest part: the claim and relocation rules of `__adopt`/`SlotPart` have to be mirrored for strings (a component's slotted children are rendered by its parent but placed by the child). Until done it falls back, and every light-DOM component with children (Ionic-style apps) would take the slow path | M-L |
| Shadow DOM slots | already works when the host's children are static markup in the parent's template (a `<slot>` is a plain element in the shadow root); children that are components work too. Not tested with dynamic children | S |
| async `componentWillLoad` (and any `await` in a hook) | make `renderComponent` return a promise only when a hook returns a thenable; parent and siblings wait. The spike falls back | M |
| `ref` parts, spreads, `h()` vnodes, dynamic tags, svg templates, `<template>`/`<table>`/`<select>`/`<textarea>` in templates (HTML parser quirks) | most are mechanical (spread = the attribute rules per key; vnodes = a second value kind); svg needs namespaces; refs call user code with an element, so they stay a fallback | M |
| signals bound to parts | `peek()` once, as the runtime does on the server; set `host.__live` | S |
| state or props changed after the first render (`componentDidLoad` sets state, watchers firing, `forceUpdate`) | the runtime re-renders in place; for strings, re-render the host and replace its output. The spike falls back | M |
| attribute/property semantics of native elements | the spike uses a small table of reflected IDL attributes; a real one needs the HTML spec's list (or the table generated from happy-dom), and properties that never reach an attribute (`value`, `checked`) | S |
| `style` serialization | the spike matches happy-dom on `{color, fontSize}` and strings; shorthand and vendor cases need checking against happy-dom | S |
| a shared claim/mark implementation | `runtime.js` and the string renderer both encode the claim order and the mark/skip rules; put them in one place or test them against each other in CI (the compare scripts, over the unit tests of the ui-kit and the SSR fixtures) | M |
| streaming and islands (`express-stream.js`, `islands`) | both call the renderer; they need `render` to be swapped, nothing more, but stream chunking would be natural on a string renderer | S-M |

### How to fall back to happy-dom

The renderer throws `Fallback` as soon as it meets something it does not model, and the page is rendered from the
beginning by the happy-dom renderer (`createStringRenderer(load, { fallback })`). Components that do DOM work in
`componentWillLoad` fail on their own: in the DOM-less process there is no `document`, `window`, or element API, so
the hook throws a `ReferenceError`/`TypeError`, which the renderer turns into `Fallback` (the happy-dom renderer would
swallow the error and go on). So there is no static analysis to maintain; the rule is "any exception in user code
during a string render means retry in happy-dom". Practical points:

- Run the fallback in a **worker thread** (`spike/fallback-worker.mjs`, demonstrated by `spike/fallback-demo.mjs`):
  `createRenderer` installs `window`, `document`, `HTMLElement` ... on `globalThis`, and a string render that finds a
  `document` would silently use it (I hit this: in my first comparison `document` in `componentWillLoad` "worked").
  The cost of the worker is a structured-clone of the HTML string (sub-millisecond for 180 KB) and a second loaded
  copy of the components.
- Cache the decision per page signature (component tag set + the first `Fallback` reason) so a page that always
  falls back doesn't pay for the failed string attempt every time (a failed attempt costs at most one string render,
  a few ms, since it is a prefix of the work).
- A `static ssr = 'dom'` flag (or a build-time diagnostic) on a component lets authors opt out explicitly.

### Risks and deviations from the DOM-based server render

- **Behavioural difference visible to user code**: in the string path there is no `window`/`document` at all, so code
  that guards with `typeof window !== 'undefined'` takes its server branch, where under happy-dom it takes the browser
  branch. Stencil's own `Build.isServer` is the same in both. Needs a note in the docs.
- **Lifecycle order**: the runtime renders a child after its parent committed; the string renderer renders a child
  while assembling the parent's template. A parent's `componentDidRender` therefore runs after its children's whole
  lifecycle, and an event a child emits reaches only listeners on the child's own element (not ancestors). Lists
  render entries last to first, as the runtime does.
- **Two implementations of the claim order** that have to agree to the byte for hydration to keep the server's nodes
  (a mismatch only costs a client re-render for that component, with a dev warning, so it fails soft). The
  differential tests are the mitigation.
- **U+0001 to U+0003** are the renderer's placeholder characters; in dynamic text and attribute values they come out as
  U+FFFD (they are not valid HTML characters anyway).
- **Entities**: static template text is decoded and re-escaped like happy-dom's serializer (`& < >` in text, `& "` in
  attributes, `&nbsp;` as the character); an unknown named entity falls back.
- **Memory**: the string path holds every host until the last pass (501 here); fine.
- Whatever else happy-dom does that a page relied on by accident (for example `innerHTML` assignments in hooks) is a
  fallback by construction.

## 5. Reproduce

```sh
# once: the worktree needs root node_modules and the native binding (see the shared rules), then
(cd examples/starter && npm ci)
(cd examples/starter/bench/qwik && npm ci)
(cd spike/compare && npm install --legacy-peer-deps && node build-solid.mjs)

# builds
(cd examples/starter && npx vite build --config bench/load/vite.config.ts)                 # client bundle
(cd examples/starter && npx vite build --ssr --config bench/load/vite.config.ts)           # happy-dom server bundle
(cd examples/starter && npx vite build --ssr --config ../../spike/vite.string.config.ts)   # string server bundle
(cd examples/starter/bench/qwik/load && npx vite build && npx vite build --ssr src/entry.ssr.tsx)

# 1. baseline and profile
node spike/bench-baseline.mjs 30
node --cpu-prof --cpu-prof-dir=/tmp/prof spike/bench-baseline.mjs 40 && node spike/prof-summary.mjs /tmp/prof/*.cpuprofile

# 2. the prototype
node spike/compare-html.mjs                 # byte-identical to happy-dom on the 500-card page
node spike/compare-fixtures.mjs             # more components, and the expected fallbacks
CHROME=/usr/bin/google-chrome node spike/hydrate-check.mjs     # the client resumes it
node spike/fallback-demo.mjs                # fallback through a worker
node spike/bench-render.mjs 40              # string vs happy-dom, interleaved
node spike/bench-render.mjs cold string     # (and `cold dom`) fresh process, first render

# 3. the comparison
node spike/compare/bench-all.mjs 40         # string, Lit, Lit templates, Solid, Qwik
(cd spike/compare/astro && N=40 OUT=/tmp/astro.json npx vitest run)   # Astro
```

`spike/gen-dom-events.mjs` regenerates `spike/dom-events.generated.js` (the `on*` names of happy-dom's window and
`HTMLElement` that the renderer needs without a DOM: the event-type rule of `EventPart` and the "page does not
delegate this event, hydrate on load" rule of the state script).

## 6. Not measured or not done

- Tuned string renderer (the 1.5 to 2 ms estimate is a guess); a version without per-card component instances.
- Real Ionic/ui-kit components through the string renderer: the 874 ui-kit specs are not run on it; I only compared
  the starter's fixtures and the 500-card page. Light-DOM slot pages fall back by design.
- SolidStart itself (router, streaming, `renderToStringAsync`): only `solid-js/web`'s `renderToString`. Solid 2.0
  (npm `latest` is 2.0.4) was not tried.
- Qwik and Astro with their interactive parts (Astro with an island per card would be far heavier).
- Memory use under concurrent requests.
- Timings were taken on a shared box; the ratios (30x to 40x over happy-dom, 1 to 2x of Lit components and Astro,
  4x under Qwik's cost, 6x over Solid) held in every run, the absolute numbers moved by up to 50%.
