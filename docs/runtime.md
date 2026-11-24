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
(`docs/signals.md`).

**Check:** the starter's 27 browser tests pass unchanged on both runtimes
(`npx vitest run --config vitest.rs.config.ts`).

## Not yet

- scoped CSS, and slots outside shadow DOM
- functional components (`<Foo />` for a function)
- server rendering and hydration
- the lazy loader and child-before-parent load ordering
- hot module replacement
- `h()` called directly
- Stencil's `Env`, `setMode` and `getMode`

The compiler reports each of these as an error; there is no fallback to Stencil's compiler for
this target.

## Benchmark

`examples/starter/bench`: a js-framework-benchmark style table and 1,000 small components, the same
source built both ways. It ran headless in Chromium (Linux, cloud container), median of 15 runs, in
milliseconds.

- **work** is `componentWillRender` → `componentDidRender`: render plus DOM commit, like for like.
- **total** is from the call to the commit. It also includes the time Stencil's runtime waits for
  its next animation frame before writing; this runtime writes on a microtask.

| Case | Stencil work | stencilrs work | Stencil total | stencilrs total |
|---|---:|---:|---:|---:|
| create 1,000 rows | 10.9 | 5.0 | 25.9 | 5.1 |
| replace 1,000 rows | 23.4 | 7.8 | 35.2 | 8.0 |
| update every 10th row | 3.1 | 0.6 | 8.6 | 0.7 |
| select a row | 3.3 | 0.3 | 13.9 | 0.4 |
| swap two rows | 3.2 | 0.5 | 8.7 | 0.5 |
| remove a row | 6.6 | 0.3 | 19.2 | 0.3 |
| create 10,000 rows | 125.9 | 44.3 | 128.3 | 46.3 |
| append 1,000 to 1,000 rows | 13.3 | 4.6 | 25.4 | 4.9 |
| clear 1,000 rows | 6.9 | 3.9 | 20.0 | 3.9 |
| 1,000 components: create | | | 12.0 | 6.4 |
| 1,000 components: change a prop on each | | | 17.7 | 14.6 |

Bundle JS: Stencil 81.7 KB (27.6 KB gzip), stencilrs 12.1 KB (4.8 KB gzip). Stencil's figure is
its standalone runtime as the Vite plugin builds it, with every feature flag on. `stencil build`
tree-shakes unused features, so the real size gap is smaller than this.

Run it:

```sh
cd examples/starter
npx vite build --config bench/vite.stencil.config.ts
npx vite build --config bench/vite.stencilrs.config.ts
node bench/run.mjs 15
```
