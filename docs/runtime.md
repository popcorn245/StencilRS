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
creation order with a number per host. The server writes the numbers out: `rs-n="<host>.<n>"` on
elements, and a `<!--rs n=...-->` comment for a marker, or before a text node (`<!--rs t ...-->`).
A child that a light-DOM host moved into one of its slots also carries `rs-l="<host>"`.

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
| create 1,000 rows | 11.6 | 6.5 | 26.5 | 6.9 | 7.8 |
| replace 1,000 rows | 26.1 | 8.3 | 36.6 | 8.7 | 12.4 |
| update every 10th row | 4.1 | 0.6 | 13.2 | 0.7 | 5.1 |
| select a row | 3.4 | 0.4 | 13.1 | 0.4 | 5.7 |
| swap two rows | 3.4 | 0.4 | 15.7 | 0.4 | 5.2 |
| remove a row | 7.6 | 0.5 | 19.7 | 0.6 | 4.9 |
| create 10,000 rows | 130.3 | 52.0 | 132.9 | 54.7 | 94.9 |
| append 1,000 to 1,000 rows | 14.7 | 5.1 | 24.0 | 5.4 | 10.6 |
| clear 1,000 rows | 9.1 | 4.1 | 19.3 | 4.1 | 5.9 |
| 1,000 components: create | | | 11.8 | 9.2 | 11.7 |
| 1,000 components: change a prop on each | | | 19.4 | 14.3 | 20.5 |

Bundle JS:

| Runtime | Raw | Gzip |
|---|---:|---:|
| Stencil | 81.7 KB | 27.6 KB |
| stencilrs (hydration in place included) | 20.4 KB | 7.4 KB |
| Qwik | 56.8 KB | 24.6 KB |

Stencil's figure is its standalone runtime as the Vite plugin builds it, with every feature flag on.
`stencil build` tree-shakes unused features, so the real size gap is smaller than this. Qwik's
figure counts every chunk, though Qwik loads them lazily.

What this does not measure is Qwik's main strength: resuming server HTML without running component
code on load. That needs a page-load benchmark (server render, then time to first interaction),
which is the natural next comparison now that this runtime hydrates in place.

Run it:

```sh
cd examples/starter
npx vite build --config bench/vite.stencil.config.ts
npx vite build --config bench/vite.stencilrs.config.ts
(cd bench/qwik && npm install && npx vite build)   # optional; skipped if dist-qwik is missing
node bench/run.mjs 15
```
