# Stencil v5 quirks stencilrs reproduces

stencilrs aims for identical output to Stencil v5 (5.0.0-beta.25), so these behaviours are
copied on purpose. Each one is a candidate upstream issue. Found by the parity harness
(`parity/`), which compiles fixtures with `transpileSync` the way `@stencil/unplugin` does.

## 1. Unannotated `async @Method()` is an error in single-file mode

`@Method() async open() {}` with no return annotation fails with
"External @Method() open() must return a Promise." The single-file program has no lib, so
`Promise` is unresolved and the inferred return type prints as `any`
(`method-decorator.ts:82-97`, `isTypePromise` at `:138`). Only a written `: Promise<...>`
passes. `return Promise.resolve(x)` fails the same way.

`@stencil/unplugin` throws on any error diagnostic (`unplugin/src/transform.ts:178-184`), so
these components cannot be compiled through the Vite/Rolldown plugin at all. In the old
bucket ui-kit, 40 methods in 14 components hit this. A full `stencil build` (with lib) accepts them.

## 2. `@Prop({ attribute: null })` is ignored

`objectLiteralToObjectMap` (`transform-utils.ts:295-388`) converts strings, templates,
`true`/`false`, arrays, objects and identifiers, but `null` is a `NullKeyword`, not an
identifier, so it falls through to the raw AST node. `getAttributeName` then never sees
`null` and dash-cases the name. Numbers and `as` expressions in decorator options are kept
as AST nodes for the same reason (so `reflect: 1 as any` is ignored too).

## 3. The v4 `shadow` / `scoped` error is shown once per process

`checkForDeprecatedApi` (`component-decorator.ts:159-197`) guards its error with a
module-level `hasShownDeprecatedApiError`. After the first file, later files with `shadow:` or
`scoped:` are still rejected (no component metadata) but report no diagnostic. stencilrs
reports it for every file.

## 4. `hasElement` is never set

`ComponentCompilerMeta.hasElement` is initialised `false` (`static-to-meta/component.ts:174`)
and nothing sets it, so the build conditional it feeds (`app-core/app-data.ts:33`) is always
off. Not yet relevant to stencilrs (no build conditionals), recorded for later.

## 5. Watch-mode change detection (not reproduced, not yet confirmed)

`computeVersion` in `transpile/incremental-compiler.ts:46-51` versions a file as
`length-firstChar-lastChar`. An edit that keeps all three (`10` → `20`) probably isn't
re-emitted in watch mode. See `docs/pipeline.md`.

## Single-file type inference

Not bugs, but worth knowing when reading parity results: in single-file mode every imported
or global name is unresolved, so `@Prop() x: Date`, `@Prop() x = importedConst` and
`@Prop() x = someCall()` are all typed `any` (attribute kept). An array literal's type prints
as `{}` because the lib's `Array` is missing.
