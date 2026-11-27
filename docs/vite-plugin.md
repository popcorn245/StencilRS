# The Vite plugin and @stencil/unplugin

`stencilrs()` (`vite.js`) used to return two plugins: its own, and `@stencil/unplugin`'s
`stencilVite()` for everything stencilrs did not do. Importing `@stencil/unplugin` imports
`@stencil/core/compiler`, which loads TypeScript: about 700 ms before the first file is compiled.
Now it returns one plugin, and `@stencil/unplugin` is imported (`vite-fallback.js`) only when
something needs it. `examples/ui-kit/check-no-typescript.mjs` (run by `scripts/ci.sh`) fails if a
cold `vite build` of the ui-kit loads `typescript`, `@stencil/core`'s compiler or `@stencil/unplugin`.

## What @stencil/unplugin 5.0.0-beta.25 does under Vite, and where it is now

| Hook / feature | In unplugin | Now |
|---|---|---|
| `transform`: components | `transpileSync`, HMR snippet, base-class discovery | stencilrs (`vite.js`) |
| `transform`: build flags | `foldBuildFlags` on every `.ts`/`.tsx` of a production build (not `ssr`) | stencilrs' Rust `foldBuildFlags`: decorated files as before, other files in `vite.js` |
| `transform`: component stylesheets | none (see `resolveId` / `load`) | n/a |
| `transform`: decorated file stencilrs can't compile, or a decorated base class / mixin without `@Component` | `transpileSync` | **fallback**: loads `@stencil/unplugin` and hands the file over unchanged |
| `resolveId`, `?tag=` stylesheets | `\0stencil-css:` ids | stencilrs (`vite-css.js`) |
| `resolveId`, `\0stencil-base:` | base classes found while compiling | stencilrs' own `\0stencilrs-base:` modules; unplugin's, for a file it compiled itself |
| `resolveId`, spec-page | bare `@stencil/core` becomes `@stencil/core/testing` | `vite.js` |
| `resolveId`, `@stencil/unplugin/docs` | the docs virtual module | stencilrs (`vite-project.js`, `vite-docs.js`) |
| `load`, stylesheets | Sass/Less, PostCSS, lightningcss, `scopeCss` | stencilrs (`vite-css.js`); unplugin if a package can't be resolved from here |
| `load`, `\0stencil-base:` | the compiled base class | stencilrs; unplugin for its own |
| `config` | alias for the virtual global stylesheets (`stencil-hydrate`, `stencil-component-globals`, `stencil-css-components`) | the alias, in `vite-fallback.js` (a path; nothing is generated) |
| `generateBundle` | with `dts`, emits `components.d.ts` (vite-types.js) into the output directory | stencilrs |
| `buildStart` | loads `stencil.config.*` (`signalBacking`, `compat`, `hydratedFlag`); with `docs` / `types`, scans the project; writes the virtual global stylesheets, if a stylesheet imports one; `components.d.ts` with `types` | stencilrs for the project scan and `components.d.ts` (it reads `srcDir` and `signalBacking` from `stencil.config.*` with jiti); unplugin, loaded when a stylesheet imports a virtual global stylesheet (a text scan, as unplugin does) |
| `configResolved` | `isDev`, whether to fold flags, the root | both |
| `configureServer` | watches added / deleted files for docs, virtual stylesheets, `types` | stencilrs for docs and `types`; unplugin for the virtual stylesheets, when loaded |
| `handleHotUpdate` | `stencil:hmr` for a changed component or stylesheet; virtual stylesheets; docs; `types` | stencilrs for its components, stylesheets, docs (`stencil:docs-update`) and `types`; then unplugin's, when loaded |
| `transform` (rebuilds) | a watch rebuild runs `transform` for every module again; a component's result is kept by module id and reused while its exact source and every file the compile read (imports followed by `resolveImports`, tsconfigs, reported by `transpile` as `deps`) are unchanged | n/a |
| `watchChange` | nothing under Vite | n/a |
| `optimizeDeps`, `define`, `ssr`, core / runtime aliases, app-data | not set by unplugin | n/a (the app-data module is the runtime's) |
| `transformInclude` (`include` / `exclude`) | a file filter | stencilrs (`createFileFilter`, `@rollup/pluginutils`' semantics) |

When unplugin loads late (the first fallback in the middle of a build), the hooks that already ran
(`config`, `configResolved`, `configureServer`, `buildStart`) are replayed on it first, and its
`transform` skips every file stencilrs compiled.

## A client that hydrates server-rendered html (`hydrateClient`)

`renderToString` / `hydrateDocument` of the hydrate app (`buildHydrate`, `@popcorn245/stencilrs/ssr`) write html the browser can show before any
script runs: `s-id` / `c-id` markers on the elements, `<!--r.N-->` and `<!--o.N-->` comments, `s-sn` on slotted nodes, `sty-id` styles. The client
runtime adopts those nodes instead of rendering again only when it was built with `BUILD.hydrateClientSide`. `stencil build` turns that on when the
project has a hydrate (`ssr`) output target, and a Vite build leaves the runtime's default (on); a client-only library turns it off with
`buildFlags: { hydrateClientSide: false }`, which is what the Ionic harness's `vite.config.ts` does for its single module.

```ts
stencilrs({ hydrateClient: true });
stencilrs({ hydrateClient: { split: true, manifest: 'components.json', dir: 'components', tags: {}, collections: ['ionicons'], islands: true } });
```

| Option | Default | Meaning |
|---|---|---|
| `hydrateClient` | `false` | `false`: nothing changes (the default output is byte for byte what it was; `test/vite-hydrate-client.test.js` compares it, and the Ionic build was compared before and after, `diff -r` on the whole output folder). `true`, or an object: sets `BUILD.hydrateClientSide = true` in every component module (it wins over `buildFlags`), and emits per-component modules and a manifest in a production build |
| `split` | `true` | every component file is also an entry of its own, `<dir>/<tag>.js`, which defines the tag when it is evaluated. The shared code (runtime, helpers) becomes chunks the modules import. `false`: the flag only, one bundle |
| `manifest` | `'components.json'` | the asset that lists the modules: `{ version: 1, tags: { "ion-button": "components/ion-button.js" }, imports: { "components/ion-button.js": ["runtime-AbC123.js", ...] } }`. `imports` is the static closure of chunks of this build (for `modulepreload`), paths relative to the output directory. `false`: none |
| `dir` | `'components'` | the folder of the modules, under the output directory |
| `tags` | `{}` | `{ tag: file }`: a custom element the project does not compile, whose module (a file that defines it) is emitted and listed like a component |
| `islands` | `false` | also emits the islands client (`islands-client.js`, `@popcorn245/stencilrs/islands`, about 1.5 KB gzipped) as `islands.js`: it reads the page's `<script type="application/json" id="stencil-islands">` (`stencilEngine`'s `islands.client`) and loads and hydrates the islands by their `client` directive, from this build's modules and manifest ([docs/islands.md](https://github.com/popcorn245/StencilRS/blob/next/docs/islands.md#client-directives-islandsclient)) |
| `collections` | `[]` | packages built by `stencil build` whose components are compiled by stencilrs as the project's own (the same `readCollections` as `buildHydrate`'s `collections`), emitted and listed like the others. Needed for `ionicons`: its `ion-icon` ships compiled with a runtime of its own (`ionicons/components/index.js`, hydration compiled out), so server-rendered icons would be rendered again |

`split` and the manifest apply to `vite build` only, not to the dev server or `mode: 'spec-page'`, and only to a component stencilrs compiled
itself (a file left to Stencil's compiler through `@stencil/unplugin` stays in the entry's bundle and is not listed). Your own entry, if you have one,
still imports every component; a loader that wants only some tags does not load it. Anything that has to run before the first tag is defined (Ionic's
global script) is an entry of your own (`lib.entry: { ionic, init }`), loaded first.

### Loading the modules

A component module defines its tag when it is evaluated, and the browser upgrades the elements already in the page at that moment. A parent that
sets props on children in `componentWillLoad` (`ion-tabs` sets `active` on its `ion-tab`s) then runs on a child that is not defined yet; the value is
an own property of the element that the child's constructor (`this.active = false`) overwrites when it is upgraded. Stencil's lazy loader never meets this because it registers all its tags in one
go. So a loader should import the modules first, with `customElements.define` held back, and define every tag in one synchronous pass
(`examples/ionic/spike/islands/hydrating-client.mjs` has the 10 lines; `test/vite-hydrate-client.test.js` has them too). With Ionic's page of kitchen-sink,
loading the same modules in parallel without this left the first `ion-tab` hidden and its button unselected, the only difference to Stencil's own client.

The islands client does exactly this per activation (the shell and the `load` islands in one pass at boot, later one island at a time), and gates `connectedCallback` per instance so a tag used by a
static and a hydrated island behaves per host. `components.json`'s `imports` is what the engine turns into `modulepreload` links for the modules loaded at boot.

### What was checked

Ionic (`examples/ionic`): `IONIC_HYDRATE_CLIENT=1 vite build` writes `init.js` (the global script), `components/*.js` (96 tags, `ion-icon` from the ionicons collection)
and `components.json`; `npm run build:hydrate` renders `list-50` and `kitchen-sink` (DSD); `node spike/islands/hydrating-client.mjs <page> dsd` loads the page in Chromium with only
the modules the page uses and reports adoption (every server node still connected), clicks (`ion-toggle`, `ion-checkbox`, `ion-button`), console errors, and whether the DOM after hydration equals
the one Stencil's own client (`stencil build --dev` with an `ssr` target, the spike's) produces. Known and not ours: @stencil/core 5.0.0-beta.25's client
runtime throws `Cannot read properties of undefined (reading 'length')` (and once `'nodeType'`) in `patch` while hydrating childless elements, on Stencil's own client too; hydration continues.

## Smaller production bundles (`foldRuntimeFlags`)

Stencil's client runtime reads about 80 `BUILD` feature flags in some 330 places (`if (BUILD.slotRelocation) ...`). `stencil build` computes the flags
from the project's components and bundles with them as constants, so a feature no component uses is not in the output. A Vite build used to leave them
all on and let each component module set the few it needs at run time (`BUILD.x = ...`), which no bundler can fold.

`foldRuntimeFlags` does what `stencil build` does: at `buildStart` of a production client build it reads the project's components (stencilrs'
`componentMetadata: 'compilerstatic'`, the metadata `docs` and `types` already use), computes the flags with Stencil's own rules (`getBuildFeatures`,
the standalone-output and `updateBuildConditionals` rules), serves them as constants from `@stencil/core/app-data` and in the runtime's own reads, and
the bundler drops the dead branches. A component module no longer writes to `BUILD`. **It is on by default** (`FOLD_RUNTIME_FLAGS_DEFAULT` in
`vite-fold.js`), for production builds of the default runtime (`runtime: 'stencil'`); not the dev server, Vitest, `componentExport: 'ssr'`, `mode:
'spec-page'`, a Vite `build.ssr` bundle, or a build whose `@stencil/core` is external (the consumer's runtime then needs the components' own writes).

```ts
stencilrs();                                      // on
stencilrs({ foldRuntimeFlags: false });           // off: the previous output, byte for byte
stencilrs({ foldRuntimeFlags: { dirs: ['src', 'packages/ui/src'] } }); // folders (relative to the Vite root) to scan; default ['src']
```

What is scanned: every source file under `dirs`, and every local module they, the Vite entries and `index.html` import, whether by a relative path or
through what the bundler resolves (an alias, a workspace package linked into `node_modules`), and the `hydrateClient.collections` sources. The result
is cached per file by `<mtime>:<size>` stamps (the stamps of the modules a component imports too), so a rebuild reads again only what changed. The
files stencilrs does not port yet (`stencilrs:` diagnostics other than a member's `complexType`, several components in one file) are read by Stencil's
compiler (`transpileSync`, loaded only then); a `<slot>` or `<svg>` in a local module a component imports counts for it, as Stencil's single-file
metadata cannot see it.

A flag is **never dropped on a guess**. When the component set is uncertain, every flag stays on, exactly as with `foldRuntimeFlags: false`, and the
build prints one warning naming the files:

* a file that neither stencilrs nor Stencil's compiler can read (its features are unknown);
* a package of prebuilt Stencil components that shares this runtime (its modules import `@stencil/core`: `@ionic/core/components`, a collection
  built by `stencil build`). A package that bundles a runtime of its own (`ionicons`' `ion-icon`) is not one;
* at the end of the build, a module that uses the runtime and was never scanned (reached by `import.meta.glob`, say): the output is made already, so
  this one only warns, naming it. Add its folder to `dirs`.

Flags you pass win: `buildFlags` (`{ hydrateClientSide: false }`, `{ slotRelocation: true }`; what follows from a flag follows from your value, so
`slotRelocation: true` brings the light-DOM patches) and `hydrateClient` (`hydrateClientSide` on) apply on top of the computed ones. `signals: true`, or
any scanned file importing `@stencil/core/signals`, turns `vdomSignals` on.

`hydrateClientSide` is **not** turned off by the fold: it stays what it is without folding (on), because Stencil turns it off only when the project has
an SSR output target, which the plugin cannot know. It is the biggest single flag (2.5 KB gzip of the starter's 10): a client that does not hydrate
server html should set `buildFlags: { hydrateClientSide: false }`.

`vite build --watch` rescans on every rebuild (the cache makes that ~15 ms for 136 components) and watches every scanned file, so adding a `<slot>` or a
`formAssociated` component changes the flags of the next bundle (a new file that nothing imports yet does not start a rebuild; the one that imports it does). The config flags `stencil.config` can change (`compat.lightDomPatches`, `taskQueue`,
`invisiblePrehydration`, `hydratedFlag`) are the defaults; `buildFlags` overrides any of them. `verbose: true` prints the component count, the scan
time and how many flags are on.

Measured (Vite 8.4.0, minified, gzip level 9, `@stencil/core` 5.0.0-beta.25; `spike/build-flags/sz.mjs`, details in [the spike](spike-build-flags.md)):

| Build | unfolded | folded (default) | folded and `hydrateClientSide: false` |
|---|---:|---:|---:|
| starter (11 components, signals) | 29.87 KB | 16.44 KB (-45 %) | 14.00 KB (-53 %) |
| starter, `signals: false` (the signal components still import it) | 27.68 KB | 14.24 KB (-49 %) | 11.82 KB (-57 %) |
| ui-kit library, 136 components | 678.2 KB | 666.0 KB (-1.8 %) | 663.3 KB (-2.2 %) |
| Ionic core, 95 components, one module | 256.1 KB | 240.5 KB (-6.1 %) | the same (its config already sets it) |
| Ionic `app-tabs`, 34 components | 123.7 KB | 108.6 KB (-12.2 %) | the same |
| Ionic `app-tabs`, runtime chunk | 28.1 KB | 13.2 KB (-53 %) | the same |

The saving is the runtime, 13 to 18 KB gzip whatever the app: most of a small app, a few percent of a big one. The scan costs about 0.2 s cold for 136
components (parallel, `transpileMany`) and 15 ms warm; see the spike for the build-time numbers.

`test/vite-fold.test.js` (the flag computation, the scan and its cache, the fallbacks and the warnings, features that must survive, opt-out, watch),
`npm --prefix examples/starter run check:fold` (the starter's production build, folded and not, in Chromium: the DOM after the same clicks, input,
events and form submit is the same) and `npm --prefix examples/ui-kit run check:fold-flags` (the 56 component-derived flags of the ui-kit's 136
components against the ones `stencil build` writes into `collection-manifest.json`) guard it.

## Folders the dev server does not watch (`watchIgnore`)

Vite's file watcher (chokidar) opens one `fs.watch` per file under the project root, about 0.9 ms
each on Windows, on the main thread, while the first requests wait. A Stencil project that has been
built keeps thousands of files next to its source: the build output and caches. In `serve`, the
plugin adds `server.watch.ignored` for these folders directly under the Vite root (the folder and
everything in it):

| Folder | What writes it |
|---|---|
| `.stencil/` | Stencil's build cache |
| `www/` | the `www` output (`stencil build`, `--serve`) |
| `dist/` | the `dist` output: lazy bundles, `collection/`, `types/` |
| `loader/` | the `dist` output's `loader` |
| `hydrate/` | the `dist-hydrate-script` output |

Source lives in `src/`, so none of these hold any. Nothing is excluded from being served: a file in
these folders is still served on request, it just does not trigger HMR or a reload when it changes.
Vite concatenates the list with your own `server.watch.ignored` (a string, a function or an array)
and its own defaults (`.git`, `node_modules`, `test-results`); `server.watch: null` is respected.

```ts
stencilrs({ watchIgnore: false }); // watch everything, as before
stencilrs({ watchIgnore: ['www', 'dist', 'components'] }); // replace the list (folders under the root)
```

## First crawl after the page (`deferWatch`)

The watcher's first crawl of the project root (one `readdir` and `stat` per entry: 811 on the Ionic
example) runs on Node's main thread while the first request is being served. In `serve`, the
plugin hides the root's files from that crawl and adds the root again once the page has loaded:
200 ms after the last in-flight request finished, or 5 s after the server starts if no request
comes (middleware mode, a page nobody opened). On the Ionic example (Vite 8.4.0) the first module
arrives about 130 ms earlier. The config file's dependencies, the `.env` files and `publicDir`
are watched from the start, and `server.watch: null` is left alone.

A file saved before the root is added back is not reported until its next save: the late crawl
does not emit events for files that already exist. That window is the first page load.

```ts
stencilrs({ deferWatch: false }); // watch the whole root from the start, as before
stencilrs({ deferWatch: { idle: 500, cap: 10_000 } }); // the two times, in ms
```

## Component CSS options (`css`)

`stencilrs({ css: { targets, minify, sass, cache } })`:

| Option | Default | Meaning |
|---|---|---|
| `targets` | Stencil's `autoprefixCss` targets (`last 2 Chrome versions`, ..., `iOS >= 16`, `> 0.5%`, `not dead`), resolved with `browserslist` when it is installed | the browsers lightningcss prefixes and lowers for: a browserslist query (string or array), lightningcss' targets object, or `false` for none |
| `minify` | `'whitespace'` in a build, `false` in dev | `true` is lightningcss' own minify (shortens values: `bold` to `700`, `none` to `0 0`, `translate3d(x, 0, 0)` to `translate(x)`); `'whitespace'` keeps the values and drops the whitespace, as `stencil build` ships them |
| `sass` | `{}` | options for Sass' `compileString` / `compileStringAsync` (`silenceDeprecations`, `loadPaths`, `quietDeps`, `logger`, ...); `url` and `syntax` are the plugin's. With `sass-embedded`, `functions` and `importers` may be async |
| `cache` | `true` | a stylesheet's output is reused while it and every file Sass loaded for it (`loadedUrls`) have the same content hash, so `vite build --watch` recompiles only what an edit touched (Ionic: 3.0 s to 0.4 s per rebuild). `true` also keeps the Sass step in `node_modules/.cache/stencilrs/sass`, keyed by file content, Sass version and options, and checked against its dependencies' hashes on every read (a file's hash is remembered by mtime and size, and looked at once per build); `'memory'` skips the disk; `false` turns it off. Sass options with `functions`, `importers` or `logger` bypass the cache. A new file that would shadow an already-resolved import is not noticed until the stylesheet itself changes |

The defaults give the CSS `stencil build` writes with `autoprefixCss: true` (the Ionic check compares 94 to 95 of
96 stylesheets as identical text). @stencil/unplugin runs lightningcss with no targets and `minify: true`;
`css: { targets: false, minify: true }` reproduces that byte for byte (the ui-kit's `compare:css` does).
### Sass: `sass-embedded` (optional, installed by the project)

When `sass-embedded` resolves from the project, component Sass is compiled with it: one compiler process, with up to
`os.availableParallelism()` stylesheets in flight at once, so Rolldown's concurrent `load` calls overlap (Ionic's 154
stylesheets, truly cold build: 4.25 s to 2.4 s in the 4-core container, output byte-identical). Without it the plugin uses
`sass`, synchronously and one at a time, as before; a project with neither compiles no Sass here. If `sass-embedded` is
installed but does not load (no binary for the platform), `sass` is used. The cache key uses Sass' version, not the package, so
switching between the two keeps the cache.

The compiler process is stopped when a build ends (`closeBundle`) and when the dev server closes; `vite build --watch` keeps it
for the next rebuilds and stops it with the watcher.

The plugin never calls Vite's `preprocessCSS`, so Vite's Sass worker pool is not started by component styles.

## `docs`, `types`, `include`, `exclude`

All four are done by stencilrs, from the metadata it computes (the `COMPILER_META` of `componentMetadata: 'compilerstatic'`, and
`analyze` for the class's JSDoc), without TypeScript, Stencil's compiler or `@stencil/unplugin`:

| Option | What stencilrs does |
|---|---|
| `signals` (default false) | `stencilrs({ signals: true })` enables TC39 signals ([signals.md](https://github.com/popcorn245/StencilRS/blob/main/docs/signals.md)): `@popcorn245/stencilrs/signals` and its `signal-polyfill` (shipped with stencilrs, or the project's own copy) are bundled once, and `signals.js` is imported by every component module so template signal binding works. Off, importing `/signals` fails the build |
| `include` / `exclude` | the file filter of `transformInclude` (`vite-project.js`): a file that does not pass is not compiled, and not scanned for docs or types. Defaults as unplugin's: `[/\.tsx?$/]`, `['node_modules/**']` |
| `docs` | `import cem from '@stencil/unplugin/docs'` is the Custom Elements Manifest of the project's components, from ports of Stencil's `cmpMetaToDocsComponent` and `generateManifest`, with the style docs (`@prop --x`, documented custom properties in `:host`, `@property`) of each stylesheet (Sass and Less compiled when installed, postcss for the auto-detection). It is rebuilt when a component or stylesheet changes in the dev server (`stencil:docs-update`) |
| `types` | `<srcDir>/components.d.ts`, from a port of Stencil's `generateComponentTypesFile`, written at `buildStart` when its content changed and kept up to date in the dev server. `srcDir` and `signalBacking` come from `stencil.config.*` (loaded with jiti, as unplugin does) or `stencilConfig` |

Output is byte for byte what a `stencil build` writes (`docs-json`'s per component data and `components.d.ts`) for every component
stencilrs compiles, with two exceptions that are @stencil/unplugin's own: its single-file `transpileSync` can't follow an import, where stencilrs
does (`resolveImports`, on by default; `resolveImports: false` is unplugin's single-file reading); and unplugin adds the `@default` and `@readonly`
tags to a prop only after its docs are made, where `stencil build` has them in the docs. stencilrs follows `stencil build`.

A file stencilrs does not port yet (it reports a `stencilrs:` diagnostic) takes its metadata from Stencil's compiler, for that file only:
TypeScript loads when the first such file is scanned, and the metadata is what unplugin's single-file reading gives. A project with CSS-only
components (`@component` in a stylesheet), a `stencil.config` that can't be loaded (no jiti), or stylesheets with custom properties and no
postcss, is left to `@stencil/unplugin`, loaded at `buildStart`.

## Loading it on purpose

`@stencil/unplugin` loads at `buildStart` when a stylesheet imports a virtual global stylesheet, or when the project has something
`docs` / `types` can't do (above). A decorated base class or mixin without `@Component`
loads it too, because stencilrs leaves those to Stencil's compiler when they are not reached as
an ancestor of a component (they are then compiled by stencilrs, as a `\0stencilrs-base:` module).
