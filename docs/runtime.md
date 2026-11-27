# The stencilrs runtime (experimental spike)

`stencilrs({ runtime: 'stencilrs' })` compiles the same component source for a small runtime of
its own (`runtime.js`: 4.5 KB gzip for a small client-only app in a production build, 9.0 KB with every optional part, see
[Smaller builds](#smaller-builds-runtimefeatures)) instead of Stencil's. Stencil's runtime stays the default,
and nothing changes for projects that don't set the option.

## How it differs

Stencil's runtime re-runs `render()`, builds a virtual DOM tree and diffs it against the last one.
Here the compiler (`crates/stencilrs_transform/src/fine.rs`) turns each JSX tree into:

- **a static template**, hoisted to the module and parsed once by the browser, then cloned
  (`document.importNode`) for each use;
- **a list of its dynamic parts**: child holes, attributes or properties, events, `class`,
  `style`, `ref`, spreads.

`render()` still runs on every change, so lifecycle and semantics stay Stencil's. It returns only
the values of the parts. An update compares each value with the last one and touches only what
changed, the way Lit does. Lists are matched by `key` (or by position), and moves use a longest
increasing subsequence, so a swap moves two rows.

```js
// <p title={this.label}>{this.label}!</p>
const __rs_tmpl0 = __rs_template("<p rs><!--rs-->!</p>", [[0, 1, "title"], [1, 0]], false, null);
render() { return __rs_t(__rs_tmpl0, [this.label, this.label]); }
```

## Covered

`@Prop` (attribute parsing, `reflect`, `mutable`), `@State`, `@Event`, `@Element`, `@Method`,
`@Watch`, `@Listen`, `@AttachInternals` (form-associated), `@PropSerialize`, `@AttrDeserialize`,
inheritance and `Mixin()`, `<Host>`, the load, render and update lifecycle, `componentOnReady`,
`forceUpdate`, shadow or light DOM, adopted stylesheets, SVG, and `@Signal()` fields
(`docs/signals.md`). Also: scoped CSS (`sc-<tag>` classes, styles injected per root node), slots
outside shadow DOM (relocation, nested and late slotting, unslotted children kept hidden in the
host as Stencil does), functional components and dynamic tags, `h()` called directly,
child-before-parent load order, `Env`, `setMode`/`getMode`, asset paths, and HMR. Hot reload is its own module (`runtime-hot.js`), which the Vite plugin imports
in dev only, so none of it ships. A signal passed to a template as it is (`{count}`) is bound to
that part and updates it without a render (`docs/signals.md`). `@stencil/store` works too: `getRenderingRef()` returns the
component that is rendering, and the plugin keeps the store out of Vite's pre-bundle so its
`@stencil/core` import resolves to this runtime.

**Check:** the ui-kit's 874 specs pass on this runtime (`COMPILER=runtime npx vitest run` in
`examples/ui-kit`, 107 files), and the starter's 27 browser tests pass unchanged on both
runtimes (`npx vitest run --config vitest.rs.config.ts`).

## Not yet

- the lazy loader (not needed: Vite splits code)
- on the host of a non-shadow component, `innerHTML`, `textContent` and `replaceChildren` are not
  routed to slots (`appendChild`, `insertBefore`, `append`, `prepend`, `removeChild` are)

## Smaller builds (`runtimeFeatures`)

`runtime.js` is one module, and its optional parts are behind switches (`F_SERVER`, `F_HYDRATE`, `F_RESUME`, `F_LIGHT`, `F_SIGNALS`,
`F_VNODE`, `F_HOT`). In a production browser build the Vite plugin turns each on or off, the bundler folds the checks, and what no
component can reach is not shipped. A one-component app is **7.0 KB gzip** with the default (`'auto'`, which keeps hydration and resuming) and **4.5 KB** with `'client'` (an app no server renders), instead of 9.0 KB (9,034 B, 6,996 B and 4,609 B). The dev server and Vitest always run the whole
runtime.

```ts
stencilrs({ runtime: 'stencilrs' });                                   // 'auto' (the default): hydration and resuming stay
stencilrs({ runtime: 'stencilrs', runtimeFeatures: 'client' });        // auto for an app no server renders: no hydration, no resuming
stencilrs({ runtime: 'stencilrs', runtimeFeatures: false });           // the whole runtime ('all' is the same)
stencilrs({ runtime: 'stencilrs', runtimeFeatures: { vnode: false } }); // the parts you name are off, the rest are on
```

| Feature | What it is | `'auto'` turns it on when | Bytes (gzip) |
|---|---|---|---:|
| `light` | components without shadow DOM: slot relocation, scoped and global styles, the `sc-` class | any component of the build has `encapsulation` `none` or `scoped` (metadata the compiler returns for it; Stencil's default is none), or a template has a `<slot>` part outside shadow DOM | 878 |
| `vnode` | `h()` vnodes in node parts, `{...props}` spreads | the compiled code calls `h()`, uses a functional component or dynamic tag, or a template has a spread part | 362 |
| `signals` | binding a signal passed to a template | a module imports `@stencil/core/signals` or `@popcorn245/stencilrs/signals`, or the plugin's `signals` option is on | 377 |
| `hydrate` | hydration in place (claim scanning, `r:n` marks, mismatch fallback) | always, unless `'client'` or `hydrate: false` (a client build cannot tell that a server rendered its page) | 1,582 |
| `resume` | the state script, event delegation, waking components, early-event replay (needs `hydrate`) | as `hydrate` | 910 |
| `server` | the `SERVER` branches of `runtime-server.js` | never: a browser build does not render | 303 |
| `hot` | hot-reload hooks | never: dev server only | 97 |

(Bytes: the saving of turning that one off in the reference app below.)

**Where the answer comes from.** Not from a scan of the sources. The plugin hands every module it transforms to a `FeatureScan`: a compiled
component with its metadata (`encapsulation`) and the code the compiler emitted (an `h` the user imported for JSX and never called is gone from
it), a base class, JSX compiled outside a component, and every other module that imports the runtime. The runtime module itself is transformed
last: when it is first asked for, the plugin loads the build's entries and what they import (`this.load`, so each module is transformed once,
as it would be anyway), reads the scan, and writes the constants into the runtime before the bundler tree-shakes it (a `renderChunk`
substitution cannot do this: the classes would already be kept). Components of a package the build compiles (`hydrateClient.collections`) are
in the scan like the project's own.

A wrong `false` renders a page broken, a wrong `true` costs bytes, so what the plugin cannot read counts as using the feature: a module that
imports `Base`, `define` or `Mixin` from the runtime (a hand-written component, a library compiled by stencilrs elsewhere) turns on `light`
and `vnode`; one that imports `h`, `Fragment` or `FunctionalComponent` turns on `vnode`; any signals import turns on `signals`. A module that
only reads `Build` or `getAssetPath` asks for nothing. If, after the runtime was built, a module turns up that needs a feature `'auto'` left out (a
plugin emitted a chunk the entries do not reach), the build fails naming the feature and the file, and says what to set. It never builds a broken page.

**Hydration stays on under `'auto'`.** Nothing in a client build says whether a server rendered its html, and a build without hydration
renders such a page again next to the server's nodes, so `'auto'` keeps `hydrate` and `resume`. An app no server renders opts out with
`runtimeFeatures: 'client'` (auto without those two; `{ hydrate: false, resume: false }` is the same by hand, and `'client'` with
`hydrateClient` is a build error). If a `'client'` build does meet a server-rendered host (`s-rs`), the runtime logs once,
`server-rendered page, build without hydration (runtimeFeatures)`. `test/runtime-features-hydrate.test.js` runs the default build in Chromium
against server html (hydrating in place and resuming, shadow components and a scoped one, with and without resuming) and
`examples/starter/bench/load/check.mjs` does it for the 500-card page: the same nodes survive, a click wakes one component.

**`light: false` with a component that is not shadow DOM is a build error** (`runtimeFeatures.light is false, but src/x.tsx has <x-card> (none)`),
not a page without its slots and styles. Under `'auto'` the case cannot happen. Other parts turned off by hand are the user's word: `vnode:
false` with a spread throws at run time (`spread is not in this build`).

**Changing the default.** `DEFAULT_RUNTIME_FEATURES` in `runtime-features.js` is what `runtimeFeatures` is when not set: `'auto'`, or `'all'`
for the whole runtime as before.

### What each part costs (the reference app)

One component (a counter with a prop, a state, a click handler, shadow DOM with a four-rule style, a keyed list of 10), Vite 8.4.0, default
minifier, `target: es2022`; `examples/starter/bench/size` (`node run.mjs`, `features.mjs`, `smoke.mjs`; each built app loaded in Chromium).

| Build | Raw | Gzip | Brotli |
|---|---:|---:|---:|
| `runtimeFeatures: false` (the whole runtime) | 24,867 | 9,034 | 8,191 |
| `'client'` (auto for an app no server renders; shadow DOM only here) | 11,424 | 4,609 | 4,152 |
| `'client'`, plus light DOM | 14,550 | 5,506 | 5,006 |
| `'client'`, plus signals | 12,313 | 4,972 | 4,488 |
| default, hydration kept, resuming off by hand | 15,927 | 6,079 | 5,471 |
| **default (`'auto'`)**: shadow DOM, hydration and resuming | 18,429 | 6,996 | 6,312 |
| default + light + signals + vnode | 23,958 | 8,632 | 7,812 |

The same app in other frameworks (gzip): Solid 5.0 KB, Preact 6.6 KB, Lit 7.0 KB, Svelte 13.0 KB, Qwik 24.2 KB (client-rendered), Stencil's runtime 25.6 KB.
The 500-card load page (`bench/load`, default `'auto'`, hydrating and resuming) is 8.5 KB of JS gzip, 9.6 KB whole.
What stays in the 4.5 KB is the part every component needs (template parser, instances, lists, `class`/`style`/attribute/event/ref parts,
reflection, `@Watch`/`@Listen`, `componentOnReady`, `define`); each of those is 50 to 120 B, and gating them was judged not worth the ways to break an
app. How the numbers were found, and the other frameworks' build setups: [spike-runtime-size.md](spike-runtime-size.md).

## Server rendering and hydration

```js
import { createRenderer } from '@popcorn245/stencilrs/runtime/server';
const render = await createRenderer(() => import('./dist-server/components.js'));
const html = await render('<my-card heading="Hi"><b slot="title">T</b></my-card>');
```

The server runs the same runtime in a [happy-dom](https://github.com/capricorn86/happy-dom)
window (an optional peer dependency). Shadow roots are written as declarative shadow DOM with
their styles inlined; scoped styles are written as `<style sty-id>` tags. Each host gets
`s-rs="<id>"`.

**Hydration keeps the server's nodes.** Every node a render needs later (an instance's top-level
nodes, the nodes its parts bind to, the text and markers of holes and list entries) is claimed in
creation order with a number per host. The server writes the numbers out: `r:n="<n>"` on
elements, and a `<!--^3-->` comment for a marker, or before a text node (`<!--^t7-->`). A bare
number belongs to the component the node is written in (its element or shadow root); a claim of
another component carries its id (`r:n="1.5"`, a parent's node slotted into a child). A child that
a light-DOM host moved into one of its slots also carries `r:l="<host>"`, and a host holding such
children carries `r:s`. A component's client scan only enters other components that hold slotted
content, and there reads only marks with its id.

On the client, a host with `s-rs` renders once with a map of those numbers. Instead of cloning a
template it looks up the nodes the server made, binds its parts to them (event listeners,
properties), and corrects any text or attribute that differs. No node is created, moved or
removed. This works for shadow and scoped components, a component rendering into another one's
slots, and keyed lists. Nothing walks the DOM in template order, so a host relocating another
one's children doesn't matter.

If the client's first render doesn't match (a number is missing, or the node has another tag),
the host falls back: it empties what it rendered, keeps its slotted children, and renders from
scratch. In dev (the hot module loaded) it also logs a warning naming the component.

The default `runtimeFeatures` keeps this; `'client'` drops it (see [Smaller builds](#smaller-builds-runtimefeatures)).

With `runtime: 'stencilrs'`, Vite SSR builds (`transformOptions.ssr`) also compile for this
runtime. One renderer renders one page at a time. The marks cost bytes: roughly 8 per dynamic
node.

**Check:** `test/runtime-ssr.test.js` renders in happy-dom and hydrates in Chromium. It checks
that every server node is the same object afterwards (shadow, scoped, nested slots, keyed lists),
that the page is interactive, and that a tampered page falls back and still works.

### Resuming: components that wait for an event

By default (`createRenderer(load, { resumable: true })`) the page also carries each component's
state, in one `<script type="rs/state" e="click">`: per component id, the members that differ
from a fresh instance; `e` lists the events the page delegates. Each element with a handler
carries `r:e="click"` (bare when the handler is the nearest component's, `r:e="1:click"`
otherwise). A component whose state can't go through JSON, or that listens to a DOM event the
document doesn't delegate, carries `s-rh`: it hydrates on load.

On the client, a component that can wait doesn't render on load, and its element stays as the
server wrote it. The state script is parsed the first time anything needs it. A component takes
its state then, whether or not it waits (a parent that waits won't pass it its props). It hydrates
in place when something needs it:

- an event that reaches one of its handlers (one capture listener per delegated event type on the
  document wakes the component before the event gets to the element)
- a change to a property or state
- `forceUpdate`, or `componentOnReady()`
- an event a child emits to one of its handlers

A component waits only if nothing in it has to run on load. That means no `componentWillLoad`,
`componentDidLoad` or `connectedCallback`, no window or document listeners, no signals, and no
`s-rh`. Anything else hydrates on load as before.

**Interactive before the runtime arrives.** After the state, the server writes a 300-byte inline
script that catches the page's delegated events from the moment the HTML is parsed, and fires
`rsinit`. When the runtime loads it stops the catcher; once the components are defined, each
caught event wakes the components on its path and their handlers run along it, innermost first
(`stopPropagation` is honoured). A handler then sees `currentTarget` as null, and the event's
default action has already happened, as with Qwik's loader.

**Lists that wait inside a woken component.** A list whose render ran nothing that the client
needs (no events, refs or slots of its component, no props that aren't plain values, and every
component in it has its own state) gets `~<last claim>:<node count>` on its first node's mark
(`<!--^t6~2005:1500-->`). When its component wakes, the scan steps over those nodes without
reading them, and the render keeps the list's value instead of adopting it. While each render
gives an equal value (same templates, keys and values), the list stays as the server left it. The
first different value adopts the server's nodes in place, then updates them as usual.

This is Qwik's resumability, adapted: Qwik also skips running components on load and wakes code on
events. Unlike Qwik, the component's code is already loaded (9.5 KB gzip for the whole runtime, less when `runtimeFeatures` leaves parts out),
so waking it costs a render, not a network round trip.

## Page-load benchmark against Qwik

`examples/starter/bench/load`: a page of 500 product cards, each with a like button, and a header
counter. It is the same page in stencilrs (server-rendered, resumable) and in Qwik 1.20.4
(`bench/qwik/load`, `renderToString`, resumed). Every load uses a fresh browser context with no
cache, and the server gzips. Two profiles: desktop (no throttling) and mobile (4x CPU slowdown,
150 ms RTT, 1.6 Mbps down, as Lighthouse's mobile). Median of 15 loads.

| | stencilrs desktop | Qwik desktop | stencilrs mobile | Qwik mobile |
|---|---:|---:|---:|---:|
| HTML (KB gzip) | 15.9 | 20.6 | 15.9 | 20.6 |
| JS during load (KB gzip) | 8.9 | 22.9 | 8.9 | 22.9 |
| First contentful paint (ms) | 60 | 52 | 284 | 300 |
| Interactive (ms) | 20 | 45 | 339 | 374 |
| Main-thread JS during load (ms) | 5 | 2 | 20 | 11 |
| Total blocking time (ms) | 0 | 0 | 0 | 0 |
| First click on a card → DOM (ms) | 7.6 | 15.7 | 38.0 | 77.4 |
| Next click, another card (ms) | 1.2 | 13.1 | 6.1 | 31.4 |
| Click on the header counter (ms) | 1.4 | 14.1 | 15.8 | 25.0 |

Interactive is when each page's inline loader catches events (`rsinit`, Qwik's `qinit`).

Where the gains came from, mobile, in order:

| Step | What changed | Result |
|---|---|---|
| Resuming | components wait instead of hydrating on load | main-thread JS 188 → 28 ms, blocking 183 → 0 ms |
| Lists that wait | the counter's render keeps the 500-card list as the server left it | counter click 44.7 → 7.5 ms |
| Marks relative to their component | `r:n="1"` instead of `r:n="2.1"` | HTML 28.8 → 15.9 KB gzip |
| Inline catcher with replay | interactive once the HTML is parsed | interactive 410 → 339 ms |
| State parsed on demand, `s-rh`, `e` | nothing parsed or reflected per component on load | main-thread JS 28 → 20 ms |

Qwik still runs less script during load (11 ms against 20 ms on mobile). Most of the rest is the
browser upgrading the 500 card elements, which every custom element pays once its tag is defined.

Run it:

```sh
cd examples/starter
npx vite build --config bench/load/vite.config.ts && npx vite build --ssr --config bench/load/vite.config.ts
node bench/load/render.mjs
(cd bench/qwik/load && npx vite build && npx vite build --ssr src/entry.ssr.tsx && node render.mjs)
node bench/load/run.mjs 15
```

## Benchmark

`examples/starter/bench`: a js-framework-benchmark style table and 1,000 small components. The
same source is built for Stencil's runtime and for this one. The same components are also written
for [Qwik](https://qwik.dev) 1.20.4, client-rendered (`bench/qwik`). The benchmark ran headless in
Chrome (Linux, cloud container), median of 15 runs, in milliseconds.

- **work** is `componentWillRender` → `componentDidRender`: render plus DOM commit, like for like.
- **total** is from the call to the commit. It also includes the time Stencil's runtime waits for
  its next animation frame before writing; this runtime writes on a microtask. Qwik has no hook to
  time a render by, so its total runs to the last DOM mutation of the change (a
  `MutationObserver`).

| Case | Stencil work | stencilrs work | Stencil total | stencilrs total | Qwik total |
|---|---:|---:|---:|---:|---:|
| create 1,000 rows | 10.8 | 6.4 | 25.6 | 6.6 | 7.4 |
| replace 1,000 rows | 23.5 | 8.6 | 35.4 | 8.8 | 10.6 |
| update every 10th row | 3.2 | 0.6 | 12.2 | 0.7 | 4.4 |
| select a row | 3.2 | 0.5 | 15.9 | 0.5 | 4.0 |
| swap two rows | 3.0 | 0.5 | 15.4 | 0.6 | 4.1 |
| remove a row | 6.3 | 0.5 | 13.9 | 0.6 | 4.3 |
| create 10,000 rows | 119.2 | 48.6 | 125.3 | 50.6 | 78.8 |
| append 1,000 to 1,000 rows | 13.6 | 4.9 | 24.8 | 5.1 | 11.4 |
| clear 1,000 rows | 7.6 | 3.8 | 19.6 | 3.9 | 5.2 |
| 1,000 components: create | | | 13.1 | 6.9 | 10.5 |
| 1,000 components: change a prop on each | | | 18.1 | 14.5 | 14.7 |

Bundle JS:

| Runtime | Raw | Gzip |
|---|---:|---:|
| Stencil | 76.0 KB | 26.2 KB |
| stencilrs (hydration in place, resuming and signal bindings included; `runtimeFeatures: false`) | 25.4 KB | 9.5 KB |
| stencilrs, `runtimeFeatures: 'client'` (the reference app, shadow DOM only) | 11.2 KB | 4.5 KB |
| Qwik | 56.8 KB | 24.6 KB |

Stencil's figure is its standalone runtime as the Vite plugin builds it, with every feature flag on.
`stencil build` tree-shakes unused features, so the real size gap is smaller than this. Qwik's
figure counts every chunk, though Qwik loads them lazily.

Qwik's main strength, resuming server HTML, is measured in the page-load benchmark above.

Run it:

```sh
cd examples/starter
npx vite build --config bench/vite.stencil.config.ts
npx vite build --config bench/vite.stencilrs.config.ts
(cd bench/qwik && npm install && npx vite build)   # optional; skipped if dist-qwik is missing
node bench/run.mjs 15
```
