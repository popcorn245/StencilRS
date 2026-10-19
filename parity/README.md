# Parity harness: Stencil v5 vs stencilrs

Real Stencil v5 compiles every fixture and its output is committed as the golden snapshot.
stencilrs runs on the same fixtures and must match.

```sh
npm install                 # @stencil/core@5.0.0-beta.25, pinned
npm run snapshot            # rewrite snapshots/ from Stencil v5
npm run compare             # stencilrs against snapshots/  (--verbose for every diff)
node errors.mjs [suite]     # Stencil's error diagnostics per fixture
```

Build the native binding first (`npm run build:native` at the repo root).

## Fixtures

- `fixtures/features/`: one Stencil feature per file, including the diagnostics.
- `fixtures/ui-kit/`: a production library's 136 Stencil 4 components, migrated to v5 by
  `import-ui-kit.mjs` (only `shadow` / `scoped` → `encapsulation` was needed). Re-import with
  `node import-ui-kit.mjs <path to bucket>/packages/ui-kit/src`.
- `fixtures/inheritance/`: components that extend a class or `Mixin(...)` (imported, same-file,
  chained, through a barrel, overriding, unresolvable), and under `bases/` the files their
  ancestors live in. These compile as @stencil/unplugin runs them: components under their
  absolute path with a `resolveImport` callback (unplugin's `makeResolver`), and `bases/` files
  with `transformAsBaseClass`. Snapshots write the fixtures folder as `FIXTURES`.

## Modes

Fixtures are compiled with `transpileSync` exactly as `@stencil/unplugin` calls it
(`componentExport: 'customelement'`, `styleImportData: 'queryparams'`, classic `h` JSX when
the file imports `h`, the automatic runtime otherwise). See `snapshots/manifest.json`.

The same fixtures are compiled again for the other outputs, each with its own snapshot folder
and `--mode` flag (`node snapshot.mjs --mode lazy`, `node compare.mjs --mode lazy`):

| `--mode` | `componentExport` | Folder | Output |
|---|---|---|---|
| `customelement` (default) | `'customelement'` | `snapshots/` | `defineCustomElement`, the Vite / Vitest / Storybook shape |
| `module` | `'module'` | `snapshots-module/` | the class stays exported, registered with `proxyCustomElement` |
| `lazy` | `null` (`transpileSync` only reaches it with an explicit `null`) | `snapshots-lazy/` | the lazy-loading `loader-bundle` shape, `registerInstance(this, hostRef)` |
| `ssr` | stencilrs `'ssr'`; Stencil: `null` with `coreImportPath: '@stencil/core/runtime/server'` | `snapshots-ssr/` | the hydrate (server-side rendering) shape: `export class`, static `style` and `cmpMeta` |
| `specpage` | `null`, plus `componentMetadata: 'compilerstatic'`, `coreImportPath: '@stencil/core/testing'`, `style: null` | `snapshots-specpage/` | @stencil/unplugin's `spec-page` mode: lazy output with `static get COMPILER_META()`, for `newSpecPage` |

`ssr` is not reachable through `transpileSync`: Stencil only runs `ssrComponentTransform` from its `ssr` output target. `stencil.mjs` copies Stencil's compiler chunk with that transform in the slot `lazyComponentTransform` has in `transpileModule`, so the fixtures go through the same emit (decorators, metadata) as the other modes.

`npm run parity` and `npm run parity:sourcemaps` run all five. `fallbacks` in `lib.mjs` lists what
a mode does not port: stencilrs must report a `stencilrs:` error for those fixtures (the cue to
compile with Stencil), and they are counted apart. Today that is lazy and ssr output of decorated base
classes and mixins, which keep their static meta getters and so need the full `complexType`.
`specpage` falls back on the same files.

`specpage` compares `COMPILER_META` as an evaluated object, apart from the code around it. Not
compared yet, on either side: `docs`, `complexType.resolved` / `references` and a method's whole
`complexType` (`projectMeta` in `compare.mjs`). They need the type checker and are issue #8's;
until then stencilrs writes empty docs and the type as written. Everything else in the
metadata (build flags, vdom facts, styles, member lists) is compared exactly.

Each fixture gets `snapshots/<suite>/<name>.js` (emitted code) and `.json` (component
metadata, diagnostics, imports).

## What is compared

- **Metadata**: Stencil's `ComponentCompilerMeta` projected to the fields stencilrs produces
  (`fromStencil` in `compare.mjs`; the list grows with the port).
- **Diagnostics**: level and full message text, order-independent.
- **Code**: for fixtures Stencil compiles without errors, both outputs are reprinted through
  oxc's printer with comments dropped (`normalize()`), then compared exactly. Formatting
  (TypeScript's indentation, quotes, blank lines) is not compared; every token is.

## Scoped CSS

```sh
node scope-css.mjs [--verbose] [--fuzz N]
```

Stencil's `scopeCss` (the scoped-CSS shim) and stencilrs' Rust port run on the same input and
must agree byte for byte, with both the compiler's and the runtime's flags. Stencil does not
export `scopeCss`, so its `shadow-css.ts` region is lifted from the runtime bundle. The input is
every case in Stencil's own spec (`scope-css/stencil-spec.json`, recorded from
`src/utils/test/scope-css.spec.ts`), every stylesheet in the repo, and N generated stylesheets
(5000 by default, seeded) built from the selectors the shim treats specially.

## Benchmark

```sh
node bench.mjs [rounds]     # Stencil v5 transpileSync vs stencilrs transpile, same files
```

Cold (first pass) and warm (median, best) times for each, single-threaded, one process.
Both compilers are timed with source maps (as `@stencil/unplugin` runs Stencil) and without.

## Source maps

```sh
node sourcemaps.mjs [--verbose] [--misses]
```

The two printers lay code out differently, so maps aren't compared byte for byte. Each
stencilrs map is checked for validity (version 3, one source, the original embedded as
`sourcesContent`, every mapping inside it), and both compilers' maps are scored the same way:
of the mapped positions where the output starts with an identifier, how many point at that same
identifier in the source. It fails if a stencilrs map is invalid or scores below Stencil's.
`--misses` tallies what stencilrs got wrong.

stencilrs builds its map in two steps: oxc's printer maps the output to the edited TypeScript,
and the edits map that back to the original. Identifiers an edit kept (`export class X` →
`const X = class`) keep their place; code an edit wrote (constructor, `createEvent` calls,
static getters, `key`s) stays unmapped, as TypeScript leaves synthesized code.

Known Stencil quirks stencilrs copies on purpose: [`../docs/quirks.md`](../docs/quirks.md).
