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
