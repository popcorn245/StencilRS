# Spike: fold the runtime's `BUILD` flags (`foldRuntimeFlags`)

Question: how much client JS do default-runtime users (Stencil's `@stencil/core` runtime) ship that they do not need, because the Vite
plugin leaves every `BUILD` feature flag on?

**Answer: a lot.** With the flags computed from the project's components and served as constants, the same apps shrink by 10 to 18 KB gzip
(about 55 % of a 30 KB app, 6 % of a 256 KB Ionic bundle). The cause is that the plugin mutates the runtime's `BUILD` *object* at run time
(`__stencilBUILD.x = true`, `runtimeFlags` in `vite.js`), which no bundler can fold. Opt-in prototype: `stencilrs({ foldRuntimeFlags: true })`.

## Why nothing folds today

`@stencil/core/app-data` exports `BUILD`, an object with ~80 flags (all on, except dev/debug ones). The runtime reads `BUILD.x` in
~330 places. `stencil build` writes an `app-data` module whose flags come from all components' metadata (`getBuildFeatures` +
`getStandaloneBuildConditionals` + `updateBuildConditionals` in Stencil's compiler) and bundles with that, so `if (BUILD.slotRelocation)`
dies at build time. The plugin has no such step, and what it does set goes through property writes on a shared object.

Proof that the object route is a dead end: turning a flag off with the existing `buildFlags` option changes the starter's bundle by
**+9 bytes** (`buildFlags: { hydrateClientSide: false }`, 27 822 to 27 831 B gzip). Rolldown does not fold `BUILD.x` on an object literal
even when it is a `const` in another module, so a virtual `app-data` module with the right constants is not enough either.

## What the prototype does

Files: `vite-fold.js` (new), hooks in `vite.js`. Off by default; with the option off the output is byte for byte what it was (checked: the
starter build with the original `vite.js` and with this one, `cmp` identical).

1. `buildStart` (production client build, default runtime only; not dev, not `componentExport: 'ssr'`, not spec-page): scan the source files
   under `foldRuntimeFlags.dirs` (default `src`), and for each file with a Stencil decorator call stencilrs' `transpile` with
   `componentMetadata: 'compilerstatic'`. That is the `COMPILER_META` Stencil's own `ComponentCompilerMeta` (already used for docs / types in
   `vite-docs.js`), with the `hasVdom*`, `htmlTagNames`, `hasMember`, ... fields the flag computation reads. No Rust change.
2. `standaloneFlags(cmps)` = Stencil's `getBuildFeatures` + the standalone-output and `updateBuildConditionals` rules, in JS (default config:
   `lightDomPatches` on, no `signalBacking`). Overrides are applied on top in the order they already have: the runtime's own defaults,
   computed flags, then `runtimeFlags()` (`signals`, `buildFlags`, `hydrateClient`).
3. `resolveId` / `load` serve `@stencil/core/app-data` as `export const BUILD = {...literal flags}` (so user code that imports `BUILD` or
   `Env` still works), and `transform` rewrites the runtime's own reads (`BUILD.x` / `BUILD$1.x`, in `@stencil/core/dist/**`) to the literal,
   which is what lets Rolldown drop the dead branches. A flag the object does not have (`signalBacking`, which only `stencil build`
   writes) reads `void 0`, as it does in Stencil's output. The per-component `__stencilBUILD.x = ...` mutations are not emitted.
4. `buildEnd` warns when a module from `node_modules` (not `@stencil/*`) imports the runtime: a package of components built elsewhere shares
   the runtime but its features were not counted.

`signals` is on when `signals: true` or any scanned file imports `@stencil/core/signals`.
`hydrateClientSide` is **not** turned off: it stays whatever it is without folding (on, or what `buildFlags` / `hydrateClient` say), because
Stencil turns it off only when the project has an SSR output target, which the plugin cannot know. It is the single biggest flag
(table below): clients that do not hydrate server HTML should set `buildFlags: { hydrateClientSide: false }`, as docs/vite-plugin.md already
says. All numbers below show both.

### Whole project, or what the page uses? Trade-off

All components have to be known before the runtime module is final (Rolldown folds while it links, so the flags cannot be learned from the
modules as they arrive, and a runtime module that waits for them would deadlock on the transform queue). Options:

| Approach | Cost | Accuracy |
|---|---|---|
| **Scan at `buildStart` (built)** | one extra `transpile` per decorated file: 0.4 to 0.5 s for the ui-kit (136 components) or Ionic (95), no-op for a small app. A `vite build` of the ui-kit library went from a median 1.17 s to 1.6 s, same box, load average ~2 (noisy; the scan itself is 420 to 490 ms over 5 runs) | The same set `stencil build` uses (all components in the project's source). Over-approximates when the page imports a subset (the flags are on if any component under `dirs` needs them) |
| Two builds (build, read the metadata the transforms saw, build again) | 2x build | Exact for the modules actually bundled |
| `renderChunk` text replacement | cheap | Does not shrink: the dead branches are already compiled in; a string pass cannot remove them without its own minifier |

Scan is the simplest that works and it matches `stencil build`; `dirs` narrows it. An app that imports only a few components of a big
in-repo library can point `dirs` at the ones it uses (the Ionic `app-tabs` numbers below do that). The risk is the other way round: a component the
page defines that is not under `dirs` can lose a feature it needs (the `buildEnd` warning covers the common case, a prebuilt package).

### Validation

* Flags vs Stencil's own: `stencil build` writes `buildFlags` into `dist/collection/collection-manifest.json`. For the ui-kit (136
  components, the real TypeScript checker) the 56 flags that are component-derived are **identical** to `getBuildFeatures` run by
  `vite-fold.js` (`spike/build-flags/compare-flags.mjs`, after `BENCH_OUT_DIR=$PWD/.bench/full npx stencil build --config stencil.bench-full.config.ts` in `examples/ui-kit`). The other 15 in that manifest are config-driven and set by rule. (Ionic's build here writes no collection manifest, so the check is the ui-kit's.)
* Behaviour: `spike/build-flags/smoke.mjs` drives the starter page in Chromium (click every button, form submit, custom events), and
  `ionic-smoke.mjs` an `ion-tabs` page (tab switching, `ion-toggle`, `ion-checkbox`, `ion-input`, `ion-searchbar` in `md` mode), once per build.
  The DOM snapshots (light and shadow DOM, classes, attributes) of the unfolded and folded builds are identical, and there are no page errors:
  starter 6 components (base, fold, fold without hydration), Ionic with all 95 components and with the 34-component tabs subset.
* `test/vite-fold.test.js` (6 tests: flag computation, literal rewriting, the scan, a real build that must shrink and drop the dead code, the
  prebuilt-package warning). Existing `test/vite.test.js` passes (20/20), the starter's `vitest run` passes (29/29).
* Not run: the starter's Vitest **browser** tests (`npm run test:browser`). Those run on the dev server, where folding is off by design; and
  Playwright 1.64.1 wants a Chromium build that is not installed in this container (the smoke scripts launch the installed one by path).

## Results

gzip = `zlib` level 9 of each emitted `.js` chunk, summed (`spike/build-flags/sz.mjs`); bytes are deterministic. Vite 8.4.0, Rolldown
(from Vite 8.4.0), `@stencil/core` 5.0.0-beta.25, minified.

| App | baseline gz (raw) | folded gz (raw) | folded, no hydration gz (raw) | `stencil build` gz (raw) | delta, folded vs baseline | delta, no hydration |
|---|---:|---:|---:|---:|---:|---:|
| starter, 6 components (no signals) | 27.82 KB (81.8) | 12.04 KB (33.0) | **9.59 KB (25.8)** | 10.28 KB (31.6) ¹ | -15.8 KB (-57 %) | -18.2 KB (-66 %) |
| starter, 11 components + signals | 30.01 KB (89.8) | 16.59 KB (48.0) | 14.14 KB (40.8) | not buildable ² | -13.4 KB (-45 %) | -15.9 KB (-53 %) |
| ui-kit library, 136 components (`vite.lib.config.ts`, 7 chunks) | 678.2 KB (2 634) | 666.0 KB (2 593) | 663.3 KB (2 583) | not comparable ³ | -12.3 KB (-1.8 %) | -15.0 KB (-2.2 %) |
| Ionic, all 95 components, one bundle | 256.1 KB (1 244) | 240.5 KB (1 189) | same: its config already sets `hydrateClientSide: false` | not comparable ³ | -15.6 KB (-6.1 %) | |
| Ionic `app-tabs` subset, 34 components | 123.7 KB (533.5) | 108.6 KB (480.8) | same | 137.2 KB (651) ⁴ | -15.1 KB (-12.2 %) | |
| Ionic `app-tabs`, runtime chunk only | 28.1 KB (93.5) | 13.2 KB (42.2) | same | 15.4 KB (44.2) ⁴ | -14.9 KB (-53 %) | |

¹ `stencil build` standalone output of the same 6 components (`examples/starter/stencil.ref.config.ts`, `tsconfig.ref.json`), then bundled into
one chunk by Vite (`ref-app/`) the way an app consumes it. Stencil without `signalBacking`; no SSR target, so its `hydrateClientSide` is off:
compare the "no hydration" column. The folded stencilrs build is 0.7 KB gzip *smaller* than Stencil's; I did not chase why (the JSX emit
differs, and Stencil's `standalone` runtime chunk is built separately), so read it as "the same size within ~10 %", not as a win.
² `stencil build` cannot type-check the signal-bound components (`pop-bound-counter` passes a signal to `class`), so there is no reference.
³ The ui-kit's `stencil build` standalone output is per-component files with third-party code bundled in each (its `runtime.js` alone is 304
KB raw, 59 KB gzip, with shared helpers); Ionic's `dist-stencil/components` likewise. Totals do not compare with a single library bundle.
⁴ Stencil's standalone output of the same 34 Ionic components (`ion-<tag>.js` files) bundled by Vite, `spike/build-flags/ionic-ref.mjs`. Its flags
come from all 94 Ionic components, not the subset, and Stencil's component code and styles differ from stencilrs', so only the runtime chunk
row is like for like (13.2 against 15.4 KB: the subset's flags are fewer than the full project's).

Reading the table: the saving is about the same absolute size (13 to 18 KB gzip) for every app, because it is the runtime that shrinks. It
is a big share of a small app and a small share of a big one. The starter's ~10 KB floor is the runtime for a component set with props,
state, events, one shadow tree and a vdom.

### What each flag costs (starter, 6 components, folded, no hydration = 9.59 KB gzip)

Each group put back on, everything else folded (`spike/build-flags/ablate.mjs`, `group.mjs`). Flags overlap, so individual numbers do not
add up to the group.

| Flag(s) turned back on | + gzip | + raw |
|---|---:|---:|
| `hydrateClientSide` (adopt server-rendered nodes; also forces `updatable`/`member`) | 2 452 B | 7.2 KB |
| slot relocation family: `slotRelocation` 1 886, `patchAll` 1 461, `lightDomPatches` 1 456, `patchInsert` 1 125, `slotDomMutations` 1 120, `patchChildren` 322, `slotChildNodes` 317, `slotTextContent` 288, `patchClone` 183, `slotCloneNode` 179 | 3 245 B together | 11.0 KB |
| `vdomSignals` (pulls in `@preact/signals-core`) | 2 373 B | 7.1 KB |
| `signalBacking` (not in the default object; read as `void 0`) | 2 407 B | 7.4 KB |
| `hostListener` (+ targets) | 262 B | 0.7 KB |
| vdom extras: `vdomFunctional` 181, `vdomRef` 107, `svg` 100, `vdomXlink` 78, `vdomStyle` 64, `vdomPropOrAttrPrefix` 132 | 650 B together | 1.8 KB |
| `mode`, `scoped`, `shadow*` variants | 204 B together | 0.6 KB |
| dev/debug: `isDev` 1 260, `hotModuleReplacement` 1 044, `lazyLoad` 1 100, `profile` 137, `asyncQueue` 136, `lifecycleDOMEvents` 60 | already off by default | |

So the three that matter: **hydration** (2.5 KB), **slot relocation and the light-DOM patches** (3.2 KB; any `<slot>` outside shadow DOM turns the
family on, and Ionic's scoped components do), and **signals** (2.4 KB, only when used). Everything else is under 1 KB each.
In the ui-kit and Ionic almost everything is on already (47 and 50 of 79 flags: slots, listeners, svg, scoped, shadow and the vdom
set are used), which is why their share is small. What Ionic and the ui-kit still turn off: `element`, `formAssociated`, `serializer`,
`deserializer`, `patchAll`/`patchChildren`/`patchClone`/`patchInsert`, `slotCloneNode`, `shadowClonable`, `shadowSerializable`, and (ui-kit)
`hydrateClientSide`, `mode`, `shadowDelegatesFocus`, document/body listener targets.

## Reproduce

```sh
npm ci --prefix examples/starter && cd examples/starter
# baseline / folded / folded without hydration (SIZE_SIGNALS=1 for the signal components)
SIZE_OUT=dist-a npx vite build --config vite.size.config.ts
SIZE_FOLD=1 SIZE_OUT=dist-b npx vite build --config vite.size.config.ts
SIZE_FOLD=1 SIZE_NOHYD=1 SIZE_OUT=dist-c npx vite build --config vite.size.config.ts
node ../../spike/build-flags/sz.mjs dist-b                      # raw + gzip per chunk and total
node ../../spike/build-flags/smoke.mjs $PWD dist-a dist-b dist-c   # Chromium, compares DOM after interactions
node ../../spike/build-flags/ablate.mjs $PWD '{}'               # bytes per flag
# stencil build reference (needs `npm i --no-save --no-package-lock @stencil/cli@5.0.0-beta.25`)
npx stencil build --config stencil.ref.config.ts && npx vite build ref-app --config ref-app/vite.config.js

# ui-kit
cd ../ui-kit && npm ci && npx vite build --config vite.lib.config.ts && npx vite build --config vite.fold.config.ts

# Ionic: fetch + migrate once, then IONIC_FOLD=1 (all components) and IONIC_SUBSET=tabs (the app-tabs components)
cd ../ionic && npm ci && node scripts/fetch.mjs && node scripts/migrate.mjs
node scripts/build.mjs stencilrs                                 # baseline; output in dist-stencilrs/
IONIC_FOLD=1 node scripts/build.mjs stencilrs
IONIC_SUBSET=tabs IONIC_FOLD=1 node scripts/build.mjs stencilrs
node scripts/build.mjs stencil && node ../../spike/build-flags/ionic-ref.mjs $PWD <workdir>
node ../../spike/build-flags/ionic-smoke.mjs $PWD <copy-of-dist-a> <copy-of-dist-b>
```

(`spike/build-flags/flags.mjs <repo> <srcDir>` prints which flags a source folder turns on. The Chromium scripts launch the binary
installed at `/opt/pw-browsers/chromium_headless_shell-1243/...`; change the path elsewhere.)

## What is left

* Dev server: not folded (HMR and the dev flags need the object). A production-only option is fine for the question asked.
* The scan reads every `.ts`/`.tsx` under `dirs` with `transpile` on the main thread (~0.45 s for 100 to 140 components). `transpileMany`
  (parallel, already in the binding) would cut it; the scan result could also be cached by file stamp as the component compile cache does.
* Files stencilrs does not port yet (a `stencilrs:` diagnostic other than a member's `complexType`) make the plugin keep every flag on and
  warn. Falling back to Stencil's compiler for those files' metadata, as `vite-project.js` does for docs, would remove that limit. (The ui-kit
  has 9 files with only `complexType` notices; those do not change flags and are accepted.)
* `config`-driven flags are the defaults (`compat.lightDomPatches`, `taskQueue`, `invisiblePrehydration`, `hydratedFlag`): a `stencil.config`
  that changes them is not read. `buildFlags` overrides any of them.
* Not measured: load/parse time. The saving is bytes of JS; a smaller runtime also parses and runs less, but I did not time it.
* Collection packages compiled by stencilrs (`hydrateClient.collections`) are not scanned; point `dirs` at them or leave the option off.

## Verdict

**Build it** (opt-in first, then consider making it the default for production builds that set `hydrateClientSide: false`).
It is the largest bundle-size win available on the default runtime for small and medium apps, it follows Stencil's own rules and matched
Stencil's computed flags exactly on the ui-kit, and it needs no Rust change.

Effort: **S** for what is here (about 250 lines plus tests); **M** to make it production-grade (scan in parallel and cached, Stencil-compiler
fallback for unported files, read `stencil.config` compat flags, watch-mode rescan when a component file changes, `dirs` ergonomics for
monorepos).

Risks:
* **Correctness depends on the scan covering every component the page runs.** A missed component that needs a dropped feature (slot
  relocation, a host listener target, `formAssociated`) fails at run time, silently. Mitigated by the whole-project default and the
  prebuilt-package warning; not by anything for components registered from a path outside `dirs`.
* **`hydrateClientSide` default.** Left on so folding never changes SSR behaviour; the user has to turn it off to get the biggest win. Turning
  it off by default would match `stencil build` but breaks anyone hydrating server HTML without setting `hydrateClient`.
* **Web-spec deviations: none introduced.** The runtime code paths that remain are Stencil's, and the ones removed are the ones no component
  asked for. (`slotRelocation` off means no slot polyfill for light DOM components, which is correct only when no light DOM component uses `<slot>`;
  the flag computation reads `<slot>` from the JSX of each component and of the local modules and functional components it imports, as Stencil does.)
* Dev/prod divergence: dev runs with all flags, production with the folded set, so a flag the scan misses shows up only in the production build.
  `verbose: true` prints the on/off count; a debug listing of the flags is a small addition.
* Watch rebuilds (`vite build --watch`) recompute the flags on every `buildStart`; the cost is the scan time each time.
