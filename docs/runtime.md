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
`s-rs="<id>"`, and each child a light-DOM host moved into a slot gets `rs-l="<id>"` (text gets a
`<!--rs-l:<id>-->` before it).

On the client, a host with `s-rs` hydrates just before its first render. A shadow host empties
its declarative shadow root; a light-DOM host takes back its marked children and drops the rest.
It then renders as usual. This is re-render hydration: the server markup is on screen until the
scripts run, but its DOM nodes are replaced rather than adopted. Adopting them in place is the
next step.

With `runtime: 'stencilrs'`, Vite SSR builds (`transformOptions.ssr`) also compile for this
runtime. One renderer renders one page at a time.

**Check:** `test/runtime-ssr.test.js` renders in happy-dom, loads the markup in Chromium,
hydrates, and clicks through.

## Benchmark

`examples/starter/bench`: a js-framework-benchmark style table and 1,000 small components, the same
source built both ways. It ran headless in Chromium (Linux, cloud container), median of 15 runs, in
milliseconds.

- **work** is `componentWillRender` → `componentDidRender`: render plus DOM commit, like for like.
- **total** is from the call to the commit. It also includes the time Stencil's runtime waits for
  its next animation frame before writing; this runtime writes on a microtask.

| Case | Stencil work | stencilrs work | Stencil total | stencilrs total |
|---|---:|---:|---:|---:|
| create 1,000 rows | 13.9 | 6.5 | 28.2 | 6.8 |
| replace 1,000 rows | 25.4 | 9.1 | 35.4 | 9.3 |
| update every 10th row | 3.1 | 0.7 | 10.9 | 0.8 |
| select a row | 3.2 | 0.4 | 13.8 | 0.4 |
| swap two rows | 3.6 | 0.5 | 15.7 | 0.6 |
| remove a row | 7.4 | 0.5 | 18.3 | 0.5 |
| create 10,000 rows | 128.9 | 50.1 | 131.6 | 52.1 |
| append 1,000 to 1,000 rows | 14.7 | 4.9 | 24.2 | 5.1 |
| clear 1,000 rows | 7.8 | 3.6 | 18.1 | 3.6 |
| 1,000 components: create | | | 13.7 | 8.0 |
| 1,000 components: change a prop on each | | | 18.5 | 14.4 |

Bundle JS: Stencil 81.7 KB (27.6 KB gzip), stencilrs 16.9 KB (6.3 KB gzip, with scoped CSS, slots and HMR). Stencil's figure is
its standalone runtime as the Vite plugin builds it, with every feature flag on. `stencil build`
tree-shakes unused features, so the real size gap is smaller than this.

Run it:

```sh
cd examples/starter
npx vite build --config bench/vite.stencil.config.ts
npx vite build --config bench/vite.stencilrs.config.ts
node bench/run.mjs 15
```
