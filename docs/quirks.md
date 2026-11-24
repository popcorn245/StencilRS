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

## 11. A numeric `@Watch()` argument watches `"[object Object]"`

`getDecoratorParameter` takes an identifier's value from its literal type, numbers included:
`@Watch(SEVEN)` with `const SEVEN = 7` gives the number `7` as the prop name. The watchers
static getter then builds its key with `convertValueToLiteral`, which turns the number into a
`NumericLiteral` node, and the node lands in the object as a key: `"[object Object]"`. Every
numeric watch shares that key and none of them fires. A negative number fails earlier, in
TypeScript's `createNumericLiteral` assertion ("Negative numbers should be created in
combination with createPrefixUnaryExpression"), and `@Listen(NUM)` throws
`listenText.split is not a function`; either way the whole file fails to compile. Fixtures:
`parity/fixtures/features/watch-const-number.tsx`, `diag-watch-negative.tsx`,
`diag-listen-number.tsx`.

## 12. An unresolvable computed `@Prop()` name is used as written

`tsPropDeclName` takes a computed name's value from its literal type; when there isn't one
(`let KEY = 'value'`, an import in single-file mode), it falls back to `getText()` of the name,
brackets included. `@Prop() [KEY]: string` becomes a prop named `[KEY]` with the attribute
`[-k-e-y]`. Fixture: `parity/fixtures/features/computed-names-raw.tsx`.

## 13. Computed names on other members are never resolved

Only `@Prop`, `@State`, `@AttachInternals` and the serializers resolve a computed name.
`@Method`, `@Watch` and `@Listen` handlers keep the text (`@Method() async [NAME]()` registers a
method called `[NAME]`, and fails the single-file return check of quirk 1). `@Event() [EV]`
and `@Element() [EL]` produce invalid JavaScript: `this.[EV] = __stencil_createEvent(...)` in
the constructor. stencilrs keeps the names as Stencil does but doesn't copy that output.
Fixture: `parity/fixtures/features/diag-computed-method.tsx`.

## 14. A thrown error replaces every other diagnostic

When a decorator argument can't be read (`invalid decorator argument: X`, the `resolveVar()`
errors), Stencil throws instead of reporting. `transpileSync` catches it and returns the
source unchanged, no components, and that one message with its stack trace: every diagnostic
gathered before it is lost.

## 15. `scopeCss` quirks

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

## 16. An alias written without type arguments prints as its type parameters

`parseDocsType` (`transform-utils.ts`) takes a type with an `aliasSymbol` apart through
`aliasTypeArguments`. For a generic alias that is **imported** and written without arguments
(`import type { ComponentProps } from './interface'`, `@Prop() props: ComponentProps`, with
`type ComponentProps<T = null> = { [key: string]: any }`), `getTypeFromTypeAliasReference` gives
the instantiation an empty `aliasTypeArguments` list. `parseDocsType` then reads the *declared*
type, whose alias arguments are the type parameters themselves, and `resolved` is `T`
(`T | undefined` when optional), not the object type. Written with arguments it is the arguments
(`ComponentProps<string>` resolves to `string`). Ionic's `ComponentProps` is used this way by
nav, nav-link, popover and modal. Fixture: `parity/fixtures/build/src/components/nav-link.tsx`.

## 17. `keyof` carries no alias, and generic types fill in their defaults

- `type SpinnerTypes = keyof typeof spinners` is a union built by `getIndexType`, which does not
  give it the alias: a method taking `SpinnerTypes` prints the keys
  (`which: "bubbles" | "circles"`), not the name. Fixture: `build/src/components/spinner.tsx`.
- `Detail` written for `interface Detail<T = any>` prints as `Detail<any>` everywhere the checker
  prints it (`resolved`, a method's `return`), but as `Detail` in the signature, which reuses the
  annotation. Same for the lib's `CustomEvent` (`CustomEvent<any>`). Fixture: `build/src/components/extras.tsx`.
- A method's own type parameters are printed in front of the signature as written
  (`<T extends 'b' | 'a' = 'b'>(pick?: T) => ...`, quotes aside), not in the checker's order.
- An `async @Method()` with no return annotation, in a full program, has the inferred return type
  `Promise<void>` and Stencil reads its references from that type node: `references` starts with
  `Promise`. (In single-file mode `Promise` does not resolve and there is none, quirk 1.)

## 18. What `complexType` still leaves to Stencil

stencilrs reproduces `complexType` from the syntax. These cases need the type checker, so
`analyze` / `transpile` report `stencilrs: the type of ... is not ported yet` for the member and
the caller compiles with Stencil. None can be reproduced without the whole program, and
`parity/build.mjs` checks that the ones it can reproduce match a real build:

- **A return type inferred from the body**, beyond the shapes below. Ported: every `return` (the
  last statement must be one) is a boolean literal, a `this.field` of type `number`, `string` or
  `boolean` (annotated, or initialised by a non-`readonly` literal), `Promise.resolve(<one of those>)`
  or `new Promise<T>(...)` with `T` a type the model prints; `async` wraps the result in a `Promise`
  unless it already is one, and all the returns must print the same. A number or string literal
  counts only when it is the only `return` (two different ones keep their literal types, `1 | 2`),
  and a path that falls off the end adds `undefined`: both stay with Stencil. The inferred
  type is a node of its own, so `references` starts with `Promise` and then names what `T` names.
  Fixture: `build/src/components/inferred-returns.tsx`. Left: `getAccordions` (`Array.from(...) as
  HTMLIonAccordionElement[]`, a type the build generates) and ion-router `canTransition`
  (`canProceed.redirect` after a `typeof` narrowing).
- **A union the checker orders by when it first met its members**, printed whole: a method
  parameter or return type is `string | Function | HTMLElement | null` for
  `Function | HTMLElement | string | null`, because each member's type id decides, and ids depend on
  which files the program checked first (literal types and lib interfaces exist before the file
  that mentions them). Props are unaffected: Stencil sorts their parts as text. Ionic:
  `present(event?: MouseEvent | TouchEvent | PointerEvent | CustomEvent)`, `setRoot(root: ComponentRef)`.
- **Types the build generates** (`HTMLIonTabElement`, `HTMLIonPopoverElement`): they come from
  `src/components.d.ts`, which Stencil writes, so the source tree does not have them.
- **An intersection with a union** (`{ date: string } & DatetimeHighlightStyle` where the style is
  a union): the checker distributes it into a new union with synthesized members.
- **`typeof` written in a prop's annotation** (`@Prop() x: keyof typeof y`): Stencil adds the
  classes and enums such a query names to `references`, which is not modelled. The same `keyof
  typeof y` behind a local `type` alias works.
- **A prop typed from a call**, when the callee is not an alias of string literals declared in a
  relatively imported module (`@Prop({ mutable: true }) mode = getIonMode(this)` where
  `getIonMode = (ref?: any): Mode`, `type Mode = 'ios' | 'md'`). That one is ported: Stencil prints
  the alias expanded (`"ios" | "md"`, also as `original`) and adds `Mode` to `references` by the
  name alone, so it is `global` unless the component's own file imports or declares `Mode`. The
  alias is evaluated in the module that declares the function (`ModuleSummary::rets`). Any other
  inferred type that is not one word is still reported. Fixture: `build/src/components/inferred-returns.tsx`.
- `readonly` arrays and tuples, `unique symbol`, `keyof` of an interface, a lib type or a type
  parameter, and lib namespaces (`Intl.DateTimeFormatOptions`).

## Props typed from their initializer (build-accurate mode)

With `resolveImports`, a prop with no annotation is typed the way the checker infers it, as far as
the syntax shows it: a literal, a same-file or relatively imported `const`, `this.field` (the
field's annotation, or the type of its initializer; a `readonly` field keeps its literal type),
`this.method()` and `instance.method()` with a declared return type (`export const config = new
Config()` imported from another file, then `config.getNumber(...)`), a function or arrow function
with a declared return type, and a value imported from a package's declaration file
(`import { chevronDown } from 'ionicons/icons'`, whose `.d.ts` says `export declare var
chevronDown: string`). The package is found in the nearest `node_modules` by its `exports`
`types` entry, `types` / `typings`, or the file itself. Only values are read from a package, its
types stay unresolved. What stays with Stencil's compiler: a function with no declared return type
(its return type is inferred from the body), a member read off anything but `this` or an imported
instance, a getter read through `this`, and a package declaration that is not a plain
`declare const|var|function`. Those are typed `any` (runtime flag 8), as in single-file mode.

## Single-file type inference

Not bugs, but worth knowing when reading parity results: in single-file mode every imported
or global name is unresolved, so `@Prop() x: Date`, `@Prop() x = importedConst` and
`@Prop() x = someCall()` are all typed `any` (attribute kept). An array literal's type prints
as `{}` because the lib's `Array` is missing.
