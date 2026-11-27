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
| `idBase` | not a speed patch: the `idBase` render option (hydration ids from a per-render counter instead of the process-wide one); byte-identical while unset (A/B: within noise of the same hydrate app without it) |
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

## Allocation patches tried for #182 and dropped

The "next layer" candidates below were implemented as guarded patches in the same model (one opt-out each) and measured; none
earned its place, so none was merged. They are recorded here so they are not tried again blind.

- `hostAccessors`: `proxyHostElement` shares one accessor descriptor per (component, member) and reads `Object.entries(cmpMeta.$members$)`
  once per component, instead of two closures and an object per member per element.
- `instanceAccessors`: `reWireGetterSetter` shares the re-wrapped accessor per (prototype, member) instead of a prototype-chain walk
  and two closures per member per instance.
- `annotationWalk`: `parseVNodeAnnotations` takes one snapshot of the children (plus shadow root) instead of two `Array.from` copies and
  a spread, and `insertVNodeAnnotations` finds the parent's `s-sr` comment by looping instead of copying every sibling list once per host.

All three were byte-identical to the unpatched runner on every page and both shadow modes (`variants.mjs` check).

Allocation, which is deterministic (`--trace-gc`, 65 renders, pre-GC size minus the previous post-GC size, summed; two runs of the
same build agree within about 1%). MB allocated; `old4` is the four patches above, `new3` those plus the three tried here, and
the last three columns are `new3` with one of the new patches left out (leave-one-out, so the difference to `new3` is that patch):

| combination | none | old4 | new3 | new3 - hostAccessors | new3 - instanceAccessors | new3 - annotationWalk |
|---|---:|---:|---:|---:|---:|---:|
| list-50 / dsd | 1409 | 1209 | 1161 (-4.0% vs old4) | 1150 | 1214 | 1180 |
| list-50 / scoped | 1542 | 1081 | 996 (-7.9%) | 1018 | 1061 | 1012 |
| kitchen-sink / dsd | 640 | 576 | 554 (-3.8%) | 562 | 577 | 572 |
| kitchen-sink / scoped | 1587 | 561 | 544 (-3.1%) | 559 | 569 | 553 |

Together the three take 3-8% off the allocation volume. `instanceAccessors` is the largest share (20-50 MB), `annotationWalk` next
(9-19 MB), `hostAccessors` between -11 and +22 MB, i.e. nothing measurable (a descriptor per member is only created for the props
of the hosts a page has, and the rest of what `proxyHostElement` allocates stays).

Time did not follow. In-process interleaved A/B (every variant renders in turn in one process, order alternating, 80-120 renders
per combination; `old4` appears twice as an identical control): the control copy differs from `old4` by up to +-8% on a single
combination on this shared 4-vCPU container, and `new3` against `old4` ranges from -14% to +3% across runs of the same build pair
(the first runs, at load 5, showed -8 to -14%; the quieter reruns -2 to +2% on kitchen-sink and -3 to +1% on list-50). GC time summed
over the 65 renders did not move beyond its own noise (list-50 dsd: 307 ms `old4`, 323 ms `new3`; list-50 scoped 293 -> 272 ms;
kitchen-sink dsd 178 -> 212 ms; kitchen-sink scoped 175 -> 178 ms), and the number of collections only fell by 1 to 5 of 50-96. The
scavenges cost what they cost because they copy the live DOM and style text of the render in flight, not because of the garbage
those descriptors and arrays make, so the 3-8% fewer allocated bytes did not turn into a measurable wall-clock change. Conclusion:
within noise, not merged (more code that has to track Stencil's text for no demonstrated gain).

## What is left (next layer)

After the patches, on list-50 dsd: GC ~16%, `renderVdom`/`patch` ~15% and component `render` ~9% (Stencil's and Ionic's own
code), serializer ~8% (`walk`), selector engine ~7% (`closest` from `hostContext`: the per-render nwsapi instance and lambda
compile, `collect`), `proxyHostElement` + `reWireGetterSetter` ~6% (`Object.defineProperty` per member per element), annotations
~4%, parse + window ~7%. The per-element member wiring and the annotation walks were tried and are within noise (see above); what is left is Stencil's
own render work and the live-state scavenges, which a text patch does not remove.
