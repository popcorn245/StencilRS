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
| `resolveId`, `@stencil/unplugin/docs` | the docs virtual module | `docs: true`: unplugin, loaded up front |
| `load`, stylesheets | Sass/Less, PostCSS, lightningcss, `scopeCss` | stencilrs (`vite-css.js`); unplugin if a package can't be resolved from here |
| `load`, `\0stencil-base:` | the compiled base class | stencilrs; unplugin for its own |
| `config` | alias for the virtual global stylesheets (`stencil-hydrate`, `stencil-component-globals`, `stencil-css-components`) | the alias, in `vite-fallback.js` (a path; nothing is generated) |
| `generateBundle` | with `dts`, emits `components.d.ts` (vite-types.js) into the output directory | stencilrs |
| `buildStart` | loads `stencil.config.*` (`signalBacking`, `compat`, `hydratedFlag`); with `docs` / `types`, scans the project; writes the virtual global stylesheets, if a stylesheet imports one; `components.d.ts` with `types` | unplugin, loaded up front when `docs`, `types`, `include`, `exclude` is set or a stylesheet imports a virtual global stylesheet (a text scan, as unplugin does) |
| `configResolved` | `isDev`, whether to fold flags, the root | both |
| `configureServer` | watches added / deleted files for docs, virtual stylesheets, `types` | unplugin, when loaded |
| `handleHotUpdate` | `stencil:hmr` for a changed component or stylesheet; virtual stylesheets; docs; `types` | stencilrs for its components and stylesheets; then unplugin's, when loaded |
| `transform` (rebuilds) | a watch rebuild runs `transform` for every module again; a component's result is kept by module id and reused while its exact source and every file the compile read (imports followed by `resolveImports`, tsconfigs, reported by `transpile` as `deps`) are unchanged | n/a |
| `watchChange` | nothing under Vite | n/a |
| `optimizeDeps`, `define`, `ssr`, core / runtime aliases, app-data | not set by unplugin | n/a (the app-data module is the runtime's) |
| `transformInclude` (`include` / `exclude`) | a file filter | unplugin, loaded up front when either is set |

When unplugin loads late (the first fallback in the middle of a build), the hooks that already ran
(`config`, `configResolved`, `configureServer`, `buildStart`) are replayed on it first, and its
`transform` skips every file stencilrs compiled.

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

## Loading it on purpose

Pass `docs`, `types`, `include` or `exclude`, or import a virtual global stylesheet, and
`@stencil/unplugin` loads at `buildStart`. A decorated base class or mixin without `@Component`
loads it too, because stencilrs leaves those to Stencil's compiler when they are not reached as
an ancestor of a component (they are then compiled by stencilrs, as a `\0stencilrs-base:` module).
