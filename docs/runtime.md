# The stencilrs runtime (experimental spike)

`stencilrs({ runtime: 'stencilrs' })` compiles the same component source for a small runtime of
its own (`runtime.js`, about 4.8 KB gzip) instead of Stencil's. Stencil's runtime stays the default,
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
child-before-parent load order, `Env`, `setMode`/`getMode`, asset paths, and HMR (`hotSwap`).

**Check:** the ui-kit's 874 specs pass on this runtime (`COMPILER=runtime npx vitest run` in
`examples/ui-kit`, 107 files), and the starter's 27 browser tests pass unchanged on both
runtimes (`npx vitest run --config vitest.rs.config.ts`).

## Not yet

- the lazy loader (not needed: Vite splits code)
- on the host of a non-shadow component, `innerHTML`, `textContent` and `replaceChildren` are not
  routed to slots (`appendChild`, `insertBefore`, `append`, `prepend`, `removeChild` are)

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
creation order with a number per host. The server writes the numbers out: `r:n="<host>.<n>"` on
elements, and a `<!--^1.3-->` comment for a marker, or before a text node (`<!--^t1.7-->`). A
child that a light-DOM host moved into one of its slots also carries `r:l="<host>"`, and a host
holding such children carries `r:s`. A component's client scan only enters other components that
hold slotted content.

On the client, a host with `s-rs` renders once with a map of those numbers. Instead of cloning a
template it looks up the nodes the server made, binds its parts to them (event listeners,
properties), and corrects any text or attribute that differs. No node is created, moved or
removed. This works for shadow and scoped components, a component rendering into another one's
slots, and keyed lists. Nothing walks the DOM in template order, so a host relocating another
one's children doesn't matter.

If the client's first render doesn't match (a number is missing, or the node has another tag),
the host falls back: it empties what it rendered, keeps its slotted children, and renders from
scratch.

With `runtime: 'stencilrs'`, Vite SSR builds (`transformOptions.ssr`) also compile for this
runtime. One renderer renders one page at a time. The marks cost bytes: roughly 15 per dynamic
node.

**Check:** `test/runtime-ssr.test.js` renders in happy-dom and hydrates in Chromium. It checks
that every server node is the same object afterwards (shadow, scoped, nested slots, keyed lists),
that the page is interactive, and that a tampered page falls back and still works.

### Resuming: components that wait for an event

By default (`createRenderer(load, { resumable: true })`) the page also carries each component's
state, in one `<script type="rs/state">`: the members that differ from a fresh instance, and the
DOM events it listens to. Each element with a handler carries `r:e="<host>:click"`.

On the client, a component that can wait doesn't render on load. It takes its state from that
script, and its element stays as the server wrote it. It hydrates in place when something needs
it:

- an event that reaches one of its handlers (one capture listener per event type on the document
  wakes the component before the event gets to the element, so nothing is replayed)
- a change to a property or state
- `forceUpdate`, or `componentOnReady()`
- an event a child emits to one of its handlers

A component waits only if nothing in it has to run on load. That means no `componentWillLoad`,
`componentDidLoad` or `connectedCallback`, no window or document listeners, no signals, no listener
for a DOM event the document doesn't delegate, and state that goes through JSON. Anything else
hydrates on load as before.

This is Qwik's resumability, adapted: Qwik also skips running components on load and wakes code on
events. Unlike Qwik, the component's code is already loaded (7.8 KB gzip for the whole runtime),
so waking it costs a render, not a network round trip.

## Page-load benchmark against Qwik

`examples/starter/bench/load`: a page of 500 product cards, each with a like button, and a header
counter. It is the same page in stencilrs (server-rendered, resumable) and in Qwik 1.20.4
(`bench/qwik/load`, `renderToString`, resumed). Every load uses a fresh browser context with no
cache, and the server gzips. Two profiles: desktop (no throttling) and mobile (4x CPU slowdown,
150 ms RTT, 1.6 Mbps down, as Lighthouse's mobile). Median of 15 loads.

| | stencilrs desktop | Qwik desktop | stencilrs mobile | Qwik mobile |
|---|---:|---:|---:|---:|
| HTML (KB gzip) | 28.8 | 20.6 | 28.8 | 20.6 |
| JS before interactive (KB gzip) | 7.8 | 22.9 | 7.8 | 22.9 |
| First contentful paint (ms) | 56 | 60 | 280 | 304 |
| Interactive (ms) | 47 | 50 | 410 | 374 |
| Main-thread JS during load (ms) | 6 | 2 | 28 | 9 |
| Total blocking time (ms) | 0 | 0 | 0 | 0 |
| First click on a card → DOM (ms) | 6.5 | 22.7 | 39.2 | 75.8 |
| Next click, another card (ms) | 0.8 | 10.8 | 5.0 | 27.5 |
| Click on the header counter (ms) | 8.3 | 12.6 | 44.7 | 25.0 |

Before resuming (hydrating every component on load), stencilrs on mobile spent 188 ms of
main-thread JS during load, with 183 ms of blocking time. The header counter is the one case
Qwik wins. Its click wakes the page component, which renders all 500 cards' values again;
Qwik's signals update the one text node without running the page component.

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
| create 1,000 rows | 12.1 | 6.3 | 25.6 | 6.7 | 8.1 |
| replace 1,000 rows | 23.9 | 8.7 | 37.1 | 9.0 | 10.3 |
| update every 10th row | 3.4 | 0.6 | 16.4 | 0.8 | 4.2 |
| select a row | 3.5 | 0.4 | 17.0 | 0.4 | 4.1 |
| swap two rows | 3.5 | 0.5 | 15.6 | 0.5 | 5.0 |
| remove a row | 7.2 | 0.5 | 17.7 | 0.5 | 4.4 |
| create 10,000 rows | 135.1 | 49.3 | 136.9 | 51.3 | 92.0 |
| append 1,000 to 1,000 rows | 14.3 | 5.1 | 25.3 | 5.2 | 10.5 |
| clear 1,000 rows | 7.7 | 3.9 | 19.4 | 3.9 | 5.2 |
| 1,000 components: create | | | 12.8 | 9.0 | 10.5 |
| 1,000 components: change a prop on each | | | 17.0 | 14.6 | 14.5 |

Bundle JS:

| Runtime | Raw | Gzip |
|---|---:|---:|
| Stencil | 81.7 KB | 27.6 KB |
| stencilrs (hydration in place and resuming included) | 22.5 KB | 8.2 KB |
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
