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
these components cannot be compiled through the Vite/Rolldown plugin at all. In the
ui-kit, 40 methods in 14 components hit this. A full `stencil build` (with lib) accepts them.

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

## 5. Members whose name starts with `_` vanish from the runtime metadata

`convertValueToLiteral` (`transform-utils.ts:156`) drops object keys that start with `_`, which
is how compiler-internal fields such as `complexType._astNode` stay out of the output. The
runtime metadata passed to `__stencil_defineCustomElement` is printed with the same helper, so
`@State() _filters` (or a `_`-prefixed prop, method, or watched prop) disappears from it and is
not reactive in the customelement / standalone output. Two ui-kit components hit
this (`filter-bar`, `note-list`). The member is still in the compiler metadata (`data`).

## 6. Plain components call `__stencil_transformTag` without importing it

A component with no members, styles, lifecycle methods, listeners or JSX is "plain"
(`setComponentBuildConditionals`). `define-custom-element.ts` then emits
`customElements.define(__stencil_transformTag("tag"), Cls)` but returns before
`addCoreRuntimeApi(..., transformTag)`, so the module references an undeclared
`__stencil_transformTag` and throws when loaded. Fixture: `parity/fixtures/features/plain.tsx`.

## 7. Watch-mode change detection (not reproduced, not yet confirmed)

`computeVersion` in `transpile/incremental-compiler.ts:46-51` versions a file as
`length-firstChar-lastChar`. An edit that keeps all three (`10` → `20`) probably isn't
re-emitted in watch mode. See `docs/pipeline.md`.

## 8. An inherited `@Element()` is `undefined`

`mergeExtendedClassMetaWithResolveImport` merges a base class's props, states, methods,
events, listeners and watchers, but not its `elementRef`. The base class, compiled with
`transformAsBaseClass`, keeps `el` as a plain class field, and the component gets no
`get el() { return this; }`, so `this.el` in either class is `undefined` at runtime (checked
with a component extending a base that declares `@Element() el` and reads `this.el`).
Declaring `@Element()` on the component itself works. Fixture:
`parity/fixtures/inheritance/bases/base-props.ts` with `cmp-extends-import.tsx`.

## 9. `Mixin` is recognised by name only

`getExtendsClassNames` checks `expr.expression.getText() === 'Mixin'`, so
`import { Mixin as compose } from '@stencil/core'` compiles but inherits nothing from the
mixins. Likewise an aliased parent (`import { Base as B }` with `extends B`) is looked up as
`B` in the parent's module, where it doesn't exist, and Stencil warns.

## 10. With `resolveImport`, serializers are dropped (not reproduced)

`mergeExtendedClassMetaWithResolveImport` (`resolve-import-merge.ts`) returns
`serializers: []` and `deserializers: []`, constants, and `parseStaticComponentMeta` uses them
for every component whenever a `resolveImport` callback is passed, which `@stencil/unplugin`
always does. So under unplugin `@PropSerialize` / `@AttrDeserialize` methods are compiled but
never wired: no `static get serializers()`, nothing in the runtime meta (checked with
`transpileSync` on `parity/fixtures/features/serializers.tsx`, with and without
`resolveImport`). A full `stencil build` keeps them (`compiler-ctx-merge.ts` merges them).

stencilrs keeps them, as the full build does, own and inherited. This is the one place it
departs from `transpileSync`-with-`resolveImport`, on purpose: the features suite compiles
without the callback, where Stencil keeps them too.

## 11. `scopeCss` quirks

The scoped-CSS shim (`src/utils/shadow-css.ts`), reproduced by `scope_css.rs` and checked by
`parity/scope-css.mjs`:

- The `@supports selector(...)` guard in `createSupportsRuleRe` never fires (the selector must
  follow the `@` directly, so the lookahead never sees `supports`); the placeholders in
  `insertPolyfillHostInCssText` are what protect those conditions. `:host:host` scopes only
  the first `:host`, because the regex consumes the character before each match.
- Original selectors are put back with string `replace`, so `$'`, `` $` `` and `$&` in them
  are expanded: with the runtime's `commentOriginalSelector`, `a[href$='x']` splices the rest
  of the stylesheet into the output. The compiler passes `false`, and still hits this through
  `@supports selector(...)` conditions and `::slotted` selectors.
- A literal `__ph-N__` in a selector becomes `undefined`, as does a literal `%BLOCK%` in a
  rule's body (or Stencil throws, inside a scopable at-rule).

## Single-file type inference

Not bugs, but worth knowing when reading parity results: in single-file mode every imported
or global name is unresolved, so `@Prop() x: Date`, `@Prop() x = importedConst` and
`@Prop() x = someCall()` are all typed `any` (attribute kept). An array literal's type prints
as `{}` because the lib's `Array` is missing.
