# SSR profile: what is left after the fast serializer (issue #130)

Measured on the stencilrs Ionic hydrate app (`examples/ionic`, `npm run build:hydrate`, Ionic 9.0.12 migrated to Stencil 5),
pages `list-50` and `kitchen-sink` of `ssr-pages.mjs`, both shadow modes (`declarative-shadow-dom`, `scoped`),
`prettyHtml: false`. All figures are from the 4-core build container (Node 22), so they are indicative, and the run-to-run
noise there is about +-5% on a single combination: read differences below that as noise.

Reproduce:

```sh
cd examples/ionic
node --cpu-prof --cpu-prof-dir=/tmp/p ssr-bench/profile.mjs dist/hydrate-stencilrs/index.js list-50 dsd 60   # also: scoped, kitchen-sink
node ssr-bench/profile.mjs --summarize /tmp/p/<name>.cpuprofile 40                                           # self time, top 40
node --trace-gc ssr-bench/profile.mjs dist/hydrate-stencilrs/index.js list-50 dsd 40                         # GC log
SSR_RUNTIME_PATCHES=false IONIC_HYDRATE_OUT_DIR=/tmp/h/none node scripts/build-hydrate.mjs                    # a variant without the patches
node ssr-bench/variants.mjs --rounds 7 none=/tmp/h/none/index.js all=dist/hydrate-stencilrs/index.js         # A/B, byte-identity checked
```

## Ranked profile (before the patches of this issue)

Share of CPU time over 60 warm renders, `--cpu-prof`; "incl." is the time under the function (a sample counts once per area,
so areas overlap: attribute lookups are also under the selector engine and under the components' own code).

| rank | area | list-50 dsd | list-50 scoped | kitchen-sink dsd | kitchen-sink scoped |
|---:|---|---:|---:|---:|---:|
| 1 | CSS rewrite on first use of each component per render (`scopeCss`, `expandPartSelectors`; incl.) | 0.0% | 8.0% | 0.0% | **31.5%** |
| 2 | mock-doc selector engine (`closest`, `matches`, `querySelector[All]`; incl.) | 13.0% | 11.2% | 12.6% | 10.4% |
| 3 | GC (self; mostly scavenges that copy the live DOM, see below) | 15.8% | 12.4% | 10.7% | 9.1% |
| 4 | mock-doc attribute lookups (`getNamedItem[NS]`, `getAttribute[NS]`, `setAttribute[NS]`, `hasAttribute`; incl.) | 9.4% | 10.0% | 6.7% | 3.9% |
| 5 | `renderVdom` / `patch` (Stencil's runtime) | 14.7% | 18.4% | 16.7% | 12.9% |
| 6 | component `render` (Ionic's code) | 12.1% | 11.7% | 8.1% | 5.6% |
| 7 | `attachStyles` / `addStyle` (style element creation; the DSD output is mostly these) | 6.1% | 3.3% | 8.8% | 7.0% |
| 8 | serializer (`serializeDocumentToString`; already the single-pass one) | 5.8% | 3.7% | 4.3% | 1.9% |
| 9 | `insertVdomAnnotations` (hydration ids) | 4.8% | 4.2% | 3.1% | 1.9% |
| 10 | `proxyHostElement` + `reWireGetterSetter` (per element and per instance member wiring) | 5.7% | 4.7% | 5.6% | 3.7% |
| 11 | parse of the input HTML (parse5 into mock-doc) | 2.7% | 2.6% | 2.6% | 2.1% |
| 12 | new `MockWindow` + `MockDocument` | 2.9% | 2.7% | 2.8% | 2.1% |
| 13 | `ssrFactory` / `hydrateAppClosure` / `registerComponents` (the runtime is rebuilt per render) | 1.7% | 1.2% | 2.0% | 1.1% |
| 14 | tree walks (`getElementsByTagName`, `children` getters) | 0.8% | 1.2% | 1.5% | 1.6% |

Notes on the individual findings:

- **CSS rewrite.** Stencil scopes a component's CSS the first time the component is used *in a render*, and the whole
  runtime closure (including its `styles` map) is rebuilt per render, so the same string went through `scopeCss`
  (a chain of regex passes over the whole stylesheet) on every request. In `scoped` mode every component takes that path, in DSD
  only components that need scoped CSS anyway (closed shadow roots). Pure function of (style text, scope id).
- **Selector engine.** nwsapi is instantiated per `MockDocument` (so per render) and `closest()` / `matches()` / a
  `querySelector` from a new context re-parse the selector string every call; Ionic's `hostContext` calls `closest` per
  component. Parsing (6 regexes plus string normalisation) was 3.6% by itself.
- **Attribute lookups.** `MockAttributeMap` is behind a `Proxy`; a method such as `getNamedItem` reads `this.caseInsensitive`,
  `this.getNamedItemNS` and `this.__items`, each a trap call, then `find`s over an array with a closure and a
  `getNamespaceURI` call per attribute.
- **GC.** `--trace-gc` shows about 70 scavenges per 40 renders of list-50 DSD at 3-5 ms each, with most of the young generation
  surviving (e.g. `75.8 -> 66.5 MB`): the live DOM, the host refs and the 1 MB of style text are copied while the render is
  in flight, so GC time follows allocation volume of long-lived render state, not garbage. The allocation sources are the
  per-render runtime closure (`ssrFactory`, class and descriptor setup in `proxyHostElement`), mock-doc nodes and attribute
  objects, and the `Array.from(childNodes)` / `children` arrays the annotation and patch walks create. A larger young
  generation (`--max-semi-space-size=32` or `64`) was within noise on both pages (list-50 dsd 30.6-36.4 ms default vs
  33.6-38.9 / 37.5-40.9), so it is not recommended here.

## Changes (all default on, byte-identical, each with an opt-out)

`ssr-patches.js`, applied by `buildHydrate` to the text of the runner and the ssr factory at bundle time, the same guarded
approach as the serializer swap: every patch names the snippets it replaces and how often they must occur, throws naming
itself if Stencil's code moved, and the plugin fails the build when an enabled patch found no module. Opt out with
`buildHydrate({ runtimePatches: { cssCache: false } })` (or `false` for none; the Ionic build script reads
`SSR_RUNTIME_PATCHES=false|name,name`). Unit tests: `test/ssr-patches.test.js` (differential against the unpatched runner, and
one guard test per patch).

| patch | what it does |
|---|---|
| `cssCache` | memoizes `scopeCss` / `expandPartSelectors` across renders, keyed by (style text, scope id); module scope, so it survives the per-render runtime |
| `selectorCache` | memoizes nwsapi's `parse` of a selector string (a fresh array per hit, nwsapi edits it in place), capped at 4096 entries |
| `attributes` | element attribute methods reach the map behind the Proxy once per element (cached by identity of `attributes`, so replacing `attributes` is honoured); lookups are a plain loop |
| `elementChildren` | `children`, `childElementCount`, `firstElementChild` and the tree walks of `getElementsByTagName` / `getElementsByClassName` loop over `childNodes` instead of `filter` closures and an array per node |

### Per-change measurements

Warm median ms/render, 7 interleaved rounds x 30 renders (`ssr-bench/variants.mjs`), one process per run, same machine and
Node for every column; each patch column has only that patch on, `all` has all four, `none` is Stencil's runtime as it is.
Every variant is checked byte-identical to `none` before timing. Percentages are against `none`.

| combination | none | cssCache | selectorCache | attributes | elementChildren | all |
|---|---:|---:|---:|---:|---:|---:|
| list-50 / dsd | 37.8 | 37.4 (-1.0%) | 35.0 (-7.4%) | 35.9 (-5.0%) | 35.2 (-6.8%) | **31.8 (-15.8%)** |
| kitchen-sink / dsd | 22.2 | 23.5 (+5.9%, noise: no CSS rewrite runs here; a 9-round rerun gave +2.6%) | 22.6 (+1.9%) | 21.6 (-2.5%) | 22.4 (+1.0%) | **21.6 (-2.5%)** |
| list-50 / scoped | 39.8 | 38.0 (-4.4%) | 40.1 (+0.9%) | 36.0 (-9.6%) | 40.5 (+1.7%) | **31.2 (-21.5%)** |
| kitchen-sink / scoped | 42.1 | 24.9 (-40.9%) | 41.2 (-2.1%) | 38.0 (-9.8%) | 41.1 (-2.5%) | **21.4 (-49.1%)** |

`cssCache` is the one large win (scoped mode, and any page with many distinct components); `attributes`, `selectorCache` and
`elementChildren` each give a few percent that is at the edge of the noise on one combination but adds up in `all`, and the
profile after the patches agrees (attribute lookups 9.4% -> 3.0% incl., selector engine 13.0% -> 7.2% on list-50 dsd).
The numbers of the three rows, before and after, are in the PR description.

## Runtime features derived from the components (issue #142)

`buildHydrate` used to hand the runtime every feature on (`BUILD` = the runtime's defaults under Stencil's ssr overrides).
`stencil build` derives them per app (`getBuildFeatures` + `updateBuildConditionals` + `getSsrBuildConditionals`).
`ssr-features.js` ports that and reads the facts from stencilrs' own `componentMetadata: 'compilerstatic'`
(`COMPILER_META`), also for the collection components. `buildHydrate({ features: 'all' })` keeps the old behaviour;
`buildConditionals` still overrides either.

Compared with the `BUILD` of Stencil 5's own `ssr` build of Ionic (`dist/hydrate-stencil/index.js`, factory copy): every
flag is equal. The only keys that differ are three the runtime's defaults carry and Stencil's object lacks
(`staticHydrationStyles`, `initializeNextTick`, `asyncQueue`, all `false` here, `undefined` there: same behaviour). Flags that go
off for Ionic: `element` (Stencil's metadata pass never sets it), `formAssociated`, `serializer`, `deserializer`, `patchAll`,
`patchChildren`, `patchClone`, `patchInsert`, `shadowClonable`, `shadowSerializable`; all vdom flags stay on (Ionic uses
them all).

Differences from Stencil, both conservative (a flag may be on where Stencil has it off, never the reverse): Stencil ORs in the
vdom facts and tag names of every module a component imports (`updateComponentBuildConditionals`); stencilrs reads facts per
class, so a local module that renders JSX turns all vdom flags, `slot` and `svg` on for its importer. And the Ionic `BUILD`
is not constant-folded by either build (it is a runtime object in both), so a flag only skips a branch at run time.

Measured (container, 4 cores shared with other jobs, Node 22): byte-identical output on every page and mode
(`check:ssr`, `bench-ssr.mjs` equality, ui-kit `test:ssr`, `node --test test/ssr-*.test.js`). Per render, 15 interleaved
rounds x 30 renders (`ssr-bench/variants.mjs`, `fragment` is not in its table), with the same build twice as a noise
control: `all` 30.2 / 20.3 / 30.1 / 20.4 ms, `all2` (identical file) +7.7% / -0.1% / +4.7% / +4.0%, `derive` -3.2% / +1.6% /
-9.2% / +1.7% (list-50 dsd, kitchen-sink dsd, list-50 scoped, kitchen-sink scoped). The identical build differs from itself by
as much as the derived one differs from it: no measurable per-render gain. Bundle: 2,370,915 -> 2,372,417 bytes (+1.5 KB, the
longer `BUILD` literal). It is kept for parity with `stencil build` (and for apps whose components lack features such as
shadow DOM, where the runtime's branches differ), not for speed.

## Evaluated, not done

- **Cache the parsed input and clone it (Express templates).** Measured on the patched runner, 200 iterations: parse of the
  `list-50` page into a `MockWindow` is 0.85 ms (kitchen-sink 0.30 ms); `documentElement.cloneNode(true)` of an already parsed
  one is 2.4 ms (0.90 ms). The clone is 2.8-3x *slower* than reparsing (mock-doc's `cloneNode` goes through `createElement`
  validation and `cloneAttributes` per node, parse5 is tight), and parse is only 2-3% of a render, so there is nothing to win.
  Not implemented.
- **Reuse a window / the component registry across renders.** Not safe, and not byte-identical in general. `ssrFactory(win, ...)`
  rebuilds the runtime with the window as its `globalThis` (bound timers, `document`, `plt`, the `styles` map, host refs,
  `modeResolver` snapshots, patched `document.createElement`). A reused runtime would skip re-adding style elements to the new
  document (its `styles` map says they exist)and keep listeners and `hostRef`s of the previous page alive; a reused window would carry the previous page's DOM, `document.cookie`,
  event listeners and nwsapi caches into the next request. Stencil destroys the window after each render
  (`destroyWindow: true`) for that reason. The share that is actually per-render setup (rows 11-13) is about 6-7% in total and
  would need the runtime split from the window, a change to how Stencil wraps the factory, not a text patch. The part of it
  that is a pure function of constants was taken instead (`cssCache`, `selectorCache`).
- **nwsapi's compiled selector functions across renders.** `compile` builds each lambda with `Function(...)(Snapshot)` per
  nwsapi instance (about 1.2% for `compile`, 1% `Resolver`, 1% `collect`); the lambdas close over the instance's helpers, so
  they cannot be shared without reworking nwsapi's instance model.
- **Larger young generation** for the scavenge cost: within noise (see GC above).

## What is left (next layer)

After the patches, on list-50 dsd: GC ~16%, `renderVdom`/`patch` ~15% and component `render` ~9% (Stencil's and Ionic's own
code), serializer ~8% (`walk`), selector engine ~7% (`closest` from `hostContext`: the per-render nwsapi instance and lambda
compile, `collect`), `proxyHostElement` + `reWireGetterSetter` ~6% (`Object.defineProperty` per member per element), annotations
~4%, parse + window ~7%. The next candidates are the per-element member wiring (one shared descriptor per component
instead of per element) and the annotation walks (`Array.from(childNodes)` per node), both in Stencil's runtime proper rather
than mock-doc.
