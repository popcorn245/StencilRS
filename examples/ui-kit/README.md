# ui-kit: a 136-component production library on Stencil v5, checked against stencilrs

The ui-kit of the Bucket app (136 Stencil 4 components, 107 spec files) migrated to Stencil v5. It builds
with zero errors and zero warnings under `stencil build`, and stencilrs is checked against it.

```sh
npm install
npm run build           # stencil build (v5): loader-bundle, standalone, www, docs-json
node check-build.mjs    # stencilrs metadata vs the full build's, per component and field
npm run test:stencil    # specs on components compiled by Stencil v5 (@stencil/unplugin)
npm test                # specs on components compiled by stencilrs
npm run compare         # tests that differ between the two
node failures.mjs       # failing specs grouped by error
node coverage.mjs       # which files stencilrs compiles vs hands to Stencil
npm run test:spec-page  # the same specs on Stencil's own newSpecPage, components compiled in spec-page mode
npm run test:spec-page:stencil && npm run compare:spec-page   # ... against @stencil/unplugin's spec-page mode
```

`test:spec-page` aliases the specs' `test-utils/spec-page` to `@stencil/core/testing`'s
`newSpecPage` (`harness/stencil-spec-page.ts`) and runs on Stencil's mock-doc instead of jsdom.
The specs were written against jsdom, so 68 of 872 fail with either compiler (mock-doc lacks
`getSelection`, `disabled` / property reflection on some native elements, `document` for Editor.js, …);
`compare:spec-page` checks stencilrs fails none that Stencil passes.

## Result (2026-10-14)

| Check | Result |
|---|---|
| `stencil build` (v5.0.0-beta.25, TypeScript 6.0.3) | **0 errors, 0 warnings**, ~12 s |
| stencilrs metadata vs the full build (`check-build.mjs`) | **136 / 136 components identical** (props incl. types, attributes, reflect, defaults; states, events, methods, listeners, watchers, element ref, encapsulation) |
| stencilrs vs Stencil's `transpileSync`, per file (`../../parity`) | **136 / 136 identical** metadata, diagnostics and code |
| Spec suite (jsdom), Stencil v5 | **874 / 874** |
| Spec suite (jsdom), stencilrs | **874 / 874**, no test differs |
| Spec suite in headless Chrome (`npm run test:browser`) | 863 / 874 (the 11 mock browser APIs only jsdom lets a test replace) |
| Files stencilrs compiles itself | 136 / 136 (no fallback to Stencil) |

## Benchmark: `stencil build` with stencilrs swapped in (custom elements)

```sh
node bench-stencil-build.mjs 5 --keep   # 5 runs each, stock vs patched; --only stock|patched
node check-standalone.mjs               # the two standalone outputs behave alike (~2 min, jsdom)
```

Stencil compiles every component twice: a type-checked TypeScript pass that fills its module map
(kept), then a per-bundle `ts.transpileModule` inside Rolldown (pass B). The script copies
`@stencil/core` and `@stencil/cli` into `.bench/` (the installed ones are never touched), patches
pass B in the copy's `compiler-*.mjs` for the `customElements` bundle to call stencilrs'
`transpile()` on the source file (failing loudly if Stencil's code no longer matches the anchor),
and builds `stencil.standalone.config.ts` (the `standalone` target only; `tsconfig.bench.json`
leaves out the stories, whose Storybook imports aren't installed here) with each, alternating.
It prints medians of wall time and of Stencil's own "build finished" time. This is a benchmark
patch, never shipped. The lazy (`loader-bundle`) build isn't swapped yet.

stencilrs' output is adapted to what Stencil's standalone transformers emit: `proxyCustomElement`
instead of `defineCustomElement(Class, meta)`, an exported `defineCustomElement(opts)` that also
defines the component's dependencies, and the auto-define call. The class is then a statement,
not a `/*@__PURE__*/` initializer, so a bundler can't tree-shake an unused component as well.

## Making the specs green

The specs were written for the ui-kit's mock renderer (decorators stubbed out, vnodes drawn by
hand into light DOM). Against real compiled components 81 failed with either compiler. Fixes:

- **Harness** (`harness/spec-page.ts`, `vitest.setup.ts`): every component is registered, as in an
  app, so children render for real; components load in `beforeAll` after the spec's `vi.mock`s;
  animation frames run on the real clock so `vi.useFakeTimers()` doesn't freeze rendering; jsdom
  (the ui-kit's original environment) instead of happy-dom.
- **Real DOM, not the mock's**: child components get props as properties (`(el as any).name`, not
  `getAttribute('name')`); `shadow` components are queried through `shadowRoot`; scoped
  components emulate `<slot>` (assert where slotted content lands) and v5 patches their
  `textContent` to the slotted content (`textOf()` reads what they rendered); `<option selected>`
  is a property; `draw2Url`'s attribute is `draw-2-url` (toDashCase puts a dash before digits);
  array props have no attribute (set the property).
- **Stencil v5**: the attribute string `"false"` no longer turns a boolean prop off
  (`setProps(page, { showHeader: false })`).
- **Stale specs**: the component changed and the spec never caught up (task-list bucket keys,
  task-controls' `taskStatusChange` event).
- **Vitest 5**: a mock implementation used with `new` must be a `function`, not an arrow.

## Migration to v5 (what changed)

1. `@Component({ shadow, scoped })` → `encapsulation: { type: 'shadow' | 'scoped' }` (all 136).
2. `: Promise<any>` on 42 `async @Method()`s that had no return type. A full build accepts
   them; Stencil's single-file compiler (`@stencil/unplugin`) rejects them (`../../docs/quirks.md` §1).
3. `stencil.config.ts`: `dist` → `loader-bundle`, `dist-custom-elements` → `standalone`, `extras`
   removed (`enableImportInjection` is the default), `testing` removed, `externalRuntime: false`
   and `serviceWorker: null` dropped (now the defaults). `stencil migrate --dry-run` reports
   nothing left.
4. `tsconfig.json`: TypeScript 6 defaults `strict` to true and deprecates `baseUrl`, so
   `"strict": false` is explicit (the ui-kit was written without strict mode) and `baseUrl` is gone.
5. `firebase` is a declared dependency (the ui-kit relied on the bucket monorepo hoisting it), and
   `package.json` has the distribution fields v5 asks for.
6. `@popcorn245/cards-core` / `floorplan-core` are vendored from the bucket repo (`vendor/`) and
   mapped with tsconfig `paths`.

`import.mjs` did steps 1–2 from the bucket repo once; the rest is by hand. Re-running it
overwrites `src/`, `styles/` and `vendor/`.

## stencilrs modes

The full build type-checks the whole program; Stencil's single-file compiler does not, so for 21
of these components it computes different prop types (an imported `CardPayload` becomes `any`,
and so gets an attribute). stencilrs has both:

- `resolveImports: true` (the Vite plugin's default): follows relative imports and knows lib
  types, matching `stencil build`, as `check-build.mjs` shows.
- `resolveImports: false`: exactly what `transpileSync` produces, as `../../parity` shows.

## Spec harness

`harness/spec-page.ts` replaces the ui-kit's mock `newSpecPage`: it mounts the real compiled
elements, waits for `componentOnReady()`, and `waitForChanges()` lets Stencil's queued render run
(stepping fake frames under `vi.useFakeTimers()`). `vitest.config.ts` picks the compiler from
`COMPILER=stencil|stencilrs`.
