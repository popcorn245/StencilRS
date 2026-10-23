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
| `buildStart` | loads `stencil.config.*` (`signalBacking`, `compat`, `hydratedFlag`); with `docs` / `types`, scans the project; writes the virtual global stylesheets, if a stylesheet imports one; `components.d.ts` with `types` | unplugin, loaded up front when `docs`, `types`, `include`, `exclude` is set or a stylesheet imports a virtual global stylesheet (a text scan, as unplugin does) |
| `configResolved` | `isDev`, whether to fold flags, the root | both |
| `configureServer` | watches added / deleted files for docs, virtual stylesheets, `types` | unplugin, when loaded |
| `handleHotUpdate` | `stencil:hmr` for a changed component or stylesheet; virtual stylesheets; docs; `types` | stencilrs for its components and stylesheets; then unplugin's, when loaded |
| `watchChange` | nothing under Vite | n/a |
| `optimizeDeps`, `define`, `ssr`, core / runtime aliases, app-data | not set by unplugin | n/a (the app-data module is the runtime's) |
| `transformInclude` (`include` / `exclude`) | a file filter | unplugin, loaded up front when either is set |

When unplugin loads late (the first fallback in the middle of a build), the hooks that already ran
(`config`, `configResolved`, `configureServer`, `buildStart`) are replayed on it first, and its
`transform` skips every file stencilrs compiled.

## Loading it on purpose

Pass `docs`, `types`, `include` or `exclude`, or import a virtual global stylesheet, and
`@stencil/unplugin` loads at `buildStart`. A decorated base class or mixin without `@Component`
loads it too, because stencilrs leaves those to Stencil's compiler when they are not reached as
an ancestor of a component (they are then compiled by stencilrs, as a `\0stencilrs-base:` module).
