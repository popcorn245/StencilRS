# Stencil v5 compile pipeline

Mapped from `stenciljs/core` branch `v5` (5.0.0-beta.25, commit `8edd9838`) on 2026-10-14. Paths are
relative to `packages/` in `../stencil-core-v5`. TypeScript is pinned `>5.0.0 <7.0.0`
(`pnpm-workspace.yaml:14`); tsgo is still only an idea (`V5_PLANNING.md:44`).

## The shape of a build

A full build is two TypeScript passes with Rolldown between them, and the plugin path is a third:

| Pass | Where | Checker? | What it does |
|---|---|---|---|
| **A** | `core/src/compiler/transpile/run-program.ts:48-227` | **yes** | One `BuilderProgram.emit()` with `before: [convertDecoratorsToStatic, performAutomaticKeyInsertion]`. The emit callback extracts metadata from the *transformed* AST and keeps the JS in memory (`compilerCtx.moduleMap`). |
| **B** | `core/src/compiler/bundle/typescript-plugin.ts:69-104` (Rolldown `transform` hook) | no | `ts.transpileModule` on every module, **once per bundle** (lazy, lazy-external, standalone, ssr, workers), with that output target's transformers. |
| **Single file** | `core/src/compiler/transpile/transpile-module.ts` (`transpileSync`, used by `@stencil/unplugin`) | blind (`noLib`, `noResolve`) | Every transformer in one emit: `before` decorators/keys/core imports, `after` static-to-meta plus native or lazy. |

## Entry points

- **`stencil build`**: `cli/src/run.ts:130` → `cli/src/task-build.ts:57` → `core/src/compiler/compiler.ts:21-45`
  (in-memory fs, patches `ts.sys` at `:43`) → `build/full-build.ts:59` → `transpile/create-build-program.ts:94-126`
  (`ts.createWatchProgram` with no-op watchers) → `build/build.ts:61` Pass A, `:85` type validation, `:109` output targets (Pass B).
  - On a cold build with no `components.d.ts`, `run-program.ts:258-261` writes it and asks for a rebuild, so
    **two whole TS programs** are built (`build.ts:94-98`, `full-build.ts:43-56`).
- **Watch / dev**: `cli/src/task-watch.ts:21` → `build/watch-build.ts:32` with an `IncrementalCompiler`
  (`transpile/incremental-compiler.ts`, `.tsbuildinfo` restore at `:195-209`), driven by @parcel/watcher.
- **`@stencil/unplugin`**: `unplugin/src/plugin.ts:499-534` `transform` hook (`enforce: 'pre'` under Vite)
  → `unplugin/src/transform.ts:155` `transpileSync(code, { componentExport: 'customelement', resolveImport, … })`.
  Project scan (`project-scan.ts:201,234,291`) calls `transpile()` per file for docs and types.

## Pass A details

- Forced options (`transpile/ts-config.ts:21-63`): `experimentalDecorators`, `module: ESNext`,
  `moduleResolution: Bundler`, `incremental`, `declaration` only when a `types` target exists. Default
  tsconfig uses `jsx: react-jsx`, `jsxImportSource: @stencil/core`.
- `afterDeclarations: [rewriteAliasedDTSImportPaths]` when `transformAliasedImportPaths` is on.
- Emit callback (`run-program.ts:95-130`): `.js` goes to `updateModule` (memory only); `.d.ts` goes through the
  text-based `updateStencilTypesImports` into each `types` output dir.
- Metadata (`transformers/static-to-meta/parse-static.ts:80-184`) is read from the static getters the
  decorators pass created, then the emitted JS is **re-parsed** as JS (`:174-182`).
- Semantic diagnostics run on every source file in full builds (`run-program.ts:265-279`).

## Rolldown

`bundle/bundle-output.ts:22-38` → `rolldown(getRolldownOptions())` (`:72-186`). Stencil's plugins in order:

| Plugin | Hooks | Notes |
|---|---|---|
| `stencil-signals-side-effects` (inline) | resolveId, load | stubs `@preact/signals-core` when unused |
| `coreResolvePlugin` | resolveId, load | `@stencil/core` → client or SSR runtime |
| `appDataPlugin` | resolveId, load, transform | global scripts go through `ts.transpileModule` again (`:124-129`) |
| `buildConditionalsPlugin` | transform | oxc; `BUILD.x` to literals |
| `lazyComponentPlugin`, `loaderPlugin`, `userIndexPlugin` | resolveId, load | virtual entries |
| **`typescriptPlugin`** | load, transform | **Pass A JS enters here** (`load` returns `staticSourceFileText`); `transform` runs Pass B |
| `buildFlagsPlugin` | transform | folds `Build.isBrowser` via `ts.createSourceFile` |
| `extFormatPlugin`, `extTransformsPlugin` | transform | text/url imports; CSS → ESM |
| `workerPlugin` | transform, resolveId, load | nested Rolldown build |
| `serverPlugin`, `pluginHelper`, `fileLoadPlugin` | resolveId, load | SSR ids, in-memory fs |

Pass B transformer sets (none take a checker; they read `moduleMap` metadata):

- **lazy** (`output-targets/dist-lazy/lazy-output.ts:187-216`): `updateStencilCoreImports`, alias rewrite?, `addTagTransform`?, `lazyComponentTransform`, `removeCollectionImports`
- **ssr** (`output-targets/ssr/bundle-ssr-factory.ts:80-94`): as lazy, with `ssrComponentTransform`
- **standalone** (`output-targets/standalone/index.ts:431-449`): `addDefineCustomElementFunctions`, `updateStencilCoreImports`, …, `nativeComponentTransform`, `proxyCustomElement`, `removeCollectionImports`

The guard `if (mod?.cmps)` (`typescript-plugin.ts:73`) is always true (an array), so **every** module is
re-transpiled, not only components. Results are cached per `bundleId:path`.

Other TS re-parses: collection target alias rewrite (`output-targets/collection/index.ts:75-83`),
`html/inline-esm-import.ts:147`, `transformers/collection/parse-collection-components.ts:40`.

## What the TypeChecker supplies

Nothing in `types/` (components.d.ts) or `docs/` calls the checker directly. Both consume metadata
captured in Pass A (`complexType.original / resolved / references`, method `signature`). Exception:
`supplementalPublicTypes` builds a fresh program for the type library (`transformers/type-library.ts:79-90`).

Inside the Pass A transformers, the checker supplies:

- **Prop type kind** (`string | number | boolean | any | unknown`) via `getTypeAtLocation`
  (`decorators-to-static/prop-decorator.ts:120-122`). **This changes runtime behaviour** (attribute coercion,
  `reflect` eligibility), so getting an aliased union wrong is a bug, not a docs gap.
- `complexType` (`typeToString`, `resolveType`, `typeToTypeNode` for inferred types) and type
  references (`getSymbolAtLocation`, `getAliasedSymbol`, `getTypeOfSymbolAtLocation`; `transform-utils.ts:700-1039`).
- Method signatures and return types (`method-decorator.ts:67-114`); event detail types (`event-decorator.ts:73,120`).
- JSDoc via symbols (`serializeSymbol`).
- Constant and enum values in decorator arguments (`decorator-utils.ts:55-152`, `prop-decorator.ts:577-647`).
- Module export validation (`getExportsOfModule`, `component-decorator.ts:305-312`).
- VDOM attribute literal types, functional-component alias resolution, attachInternals.
- Cross-file inheritance: throwaway `noLib` programs per parent file (`class-extension/compiler-ctx-merge.ts:49-79`).
  The single-file path uses a checker-free `resolveImport` strategy instead (`class-extension/resolve-import-merge.ts`).

## Caching

- `CompilerCtx` holds `moduleMap`, `changedModules`, `transpileCache` (Pass B) and `cssTransformCache`.
- `rolldownCache*` fields exist but are never filled or passed to `rolldown()`: **Rolldown rebuilds from scratch every time.**
- The disk `Cache` is used only for minify and CSS optimize results, not transpile.
- **Likely watch bug (read in the code, not reproduced):** `computeVersion` in `incremental-compiler.ts:46-51`
  is `length-firstChar-lastChar`, and `invalidateFile` keeps the version cache on purpose (`:101-103`). A fresh
  SourceFile gets the same `sf.version` the builder already saw, so an edit that keeps the length and the first
  and last characters (`10` → `20`, `'red'` → `'tan'`) should look unchanged to the TS builder and not re-emit.
  Worth a repro and an upstream issue.

## CSS and minification

- CSS runs in `extTransformsPlugin` → `style/transform-stylesheet.ts` → worker `transformCssToEsm`.
  Scoping is Stencil's JS `scopeCss`; only autoprefixing is Lightning CSS (`optimize/autoprefixer.ts:45-71`);
  minify is Stencil's own JS CSS serializer (`optimize/minify-css.ts`). Not the bottleneck.
- JS minify defaults to **oxc** (`config/validate-config.ts:162`, `minifySync` from `rolldown/utils`), terser optional.

## Where the time goes

1. Single-threaded JS TS program creation and a full semantic check on cold builds, plus a second program
   when `components.d.ts` is missing.
2. Pass A transform and print of every file.
3. Pass B parse, transform and print of every module once per bundle.
4. Extra parses: the JS re-parse after Pass A, inheritance mini-programs, collection rewrite, Rolldown's own parse.
5. No Rolldown cache between rebuilds.

## Seams for stencilrs, lowest risk first

1. **`transpileSync` (the unplugin contract).** One function:
   `transpileSync(code, opts) → { code, map, data: ComponentCompilerMeta[], imports, diagnostics }`.
   Already isolated-modules with a blind checker, so oxc can reach parity without losing type information.
   Key insertion must run before the JSX transform. Inheritance follows the `resolveImport` model.
2. **Pass B.** Replace `ts.transpileModule` in `typescriptPlugin.transform` with
   `stencilrs.transformOutput(js, moduleMeta, { kind: lazy | native | ssr, … })`. No checker needed.
   Also port `foldBuildFlags`, global scripts, collection rewrite, `inline-esm-import`, collection parsing.
3. **Pass A.** Rust parses `.ts/.tsx`, emits JS into `moduleMap` and produces `ComponentCompilerMeta` directly.
   Metadata exists before type checking, so `components.d.ts` can be written first and the second program
   disappears. Checker-dependent metadata becomes two tiers:
   - **syntactic in Rust**: annotations, literal initializers, same-file aliases and enums, import references
     via oxc semantic + oxc_resolver;
   - **enrichment queries**: a batch of `(file, position, query)` answered by a TS service (TS 5/6 now,
     the TS 7.1 API later, batched per build, not per node).

## What still needs TypeScript

- **Semantic diagnostics**: `tsgo --noEmit` as a parallel subprocess. Works with TS 7.0 today.
- **`.d.ts` for the `types` target**: `tsgo --emitDeclarationOnly` plus a Rust post-process for alias
  rewriting, or oxc isolated declarations when the project opts in. Watch TS4094 mixin handling
  (`run-program.ts:162-181`).
- **Type enrichment and the docs type library**: a checker query API. TS 7.0 has none from JS.

Public contracts typed against TS that need a compatibility story: `@stencil/core/compiler` re-exports `ts`
(`compiler/index.ts:33`), `sys.setupCompiler({ ts })`, `BundleOptions.customBeforeTransformers`.
