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
- A method's `references` list first the names of the return type node the checker builds from the
  type, then those of the whole declaration. A name the printed type lost (an unresolved import in
  a union with `null` is `any`, an alias that merged into a union, `Array<T>` printed `T[]`) is met
  only later, in the walk of the declaration, so `Promise<A | null>` is `Promise, <parameters>, A`.
  An object or function type keeps the annotations it was written with (the node builder reuses
  them, an index signature excepted), so a member's `A | null` still names `A` there. A written
  object or function type that cannot be matched to its printed one (members the checker lists in
  another order, two of one shape naming different things) is left to Stencil. The comparisons of
  the parity harness compare the order of the keys of `references`. Props and events read the
  written declaration; a type argument that is a plain reference is added right after its parent,
  before the references inside the arguments (`Map<X<C>, A>` is `Map, X, A, C`).
- In single-file mode there is no lib, `Array` is an empty generic type, and every array type is
  the checker's one empty object type. So `string[] | number[]` is one member, `{}`, and it comes
  before every type the program makes (`[A, B] | C[]` is `{} | [A, B]`). Fixture:
  `features/array-unions.tsx`.
- `void` does not absorb `undefined` in a union that is written. `reduceVoidUndefined` only runs
  under subtype reduction, which the union of inferred return expressions gets; a union written as
  a type node, an alias, a type argument and the `undefined` an optional prop or parameter adds
  all use literal reduction and keep both (`string | undefined | void`, `undefined | void`). Every
  union stencilrs builds is literal (the inferred returns it ports are never unions of `void` and
  `undefined`, anything else falls back), so `union_of` keeps both. An optional parameter whose
  type is `void` or a union with `void` and no `undefined` prints the type, not the written node,
  in the signature (`y?: string | void | undefined`, `y?: V | undefined`): the added `undefined`
  does not strip back off, because `void` has the facts of `undefined`. A method's `Promise<void>`
  inferred from `if (c) return undefined; return this.voidFn()` is the subtype case (`undefined |
  void` is `void`) and stays with Stencil. Fixtures: `features/void-undefined.tsx`,
  `build/src/components/void-undefined.tsx`, `build-stable/src/components/void-undefined.tsx`.

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
  and a path that falls off the end adds `undefined`: both stay with Stencil. So does a
  `this.field` that is optional (`number | undefined`), or that something in the method could
  narrow: `if (!this.ready) throw ...; return this.ready` returns `true`, not `boolean`, so the
  field counts only when the method mentions it once and uses `this` in no other way than
  `this.name`. The inferred
  type is a node of its own, so `references` starts with `Promise` and then names what `T` names.
  Also ported: `return <expr> as T` (or `<T>expr`) as the only `return`, for `T` an array, an
  element type the build generates, an interface with nothing but properties, or a `Promise` of
  one of those or of a primitive (`as HTMLIonAccordionElement[]`: the type is `T` whatever
  `<expr>` is). `async` awaits what is returned, so `T` has to be known to have no `then`:
  `x as Later` is a `Promise<number>` when `Later` has a `then`, and `x as Promise<Promise<T>>` a
  `Promise<T>`. Those, any other named type, `as const`, a literal type, `x as unknown as T` and
  a union stay with Stencil. And a local `const r = await
  this.m(...)` where `m` is a method of the same class that is neither generic nor overloaded and
  is declared `Promise<X>`. Then `return r` is `boolean` when `X` is `boolean` and `r` is mentioned
  only in `if (r) { ... }` blocks that contain no `return`, `throw`, `break`, `continue` nor a call
  other than `this.m()` of a method not declared `never` (`if (!ok) return false; return ok` is `boolean`, and `if (ok) throw ...; return ok` is `false`:
  any other mention keeps the fallback). And `return r.p` is `string` when `X` is
  a union of `true`, `false` and interfaces that have nothing but properties (declared once, no
  `extends`, no type parameters), exactly one has `p`, it is not optional and written `string`,
  `r` is mentioned only as `r.p`, `r === true` or `typeof r === '...'` (those only remove
  members of the union, so wherever `r.p` type-checks `r` is that one interface), and `r.p` is
  written once (`if (r.p === '/home') return r.p` returns the literal `"/home"`). Returns of `string`
  and booleans combine to `string | boolean` when the booleans are `boolean` or both literals
  (`string | true` keeps the literal and stays with Stencil). `stableTypeOrdering` makes no
  difference to these (checked with real Stencil both ways). Fixtures:
  `build/src/components/inferred-returns.tsx` and `inferred-calls.tsx`, which also hold the
  near-misses that stay with Stencil. Ionic: `getAccordions` and `canTransition` match; `push`'s return does too (its
  parameters are the union-order case below).
- **A union the checker orders by when it first met its members**, printed whole: a method
  parameter or return type is `string | Function | HTMLElement | null` for
  `Function | HTMLElement | string | null`, because each member's type id decides, and ids depend on
  which files the program checked first (literal types and lib interfaces exist before the file
  that mentions them). Props are unaffected: Stencil sorts their parts as text. Ionic:
  `present(event?: MouseEvent | TouchEvent | PointerEvent | CustomEvent)`, `setRoot(root: ComponentRef)`.
  This is TypeScript's default order, and the only one that depends on the program. TypeScript 6
  (which Stencil 5 runs on) has the compiler option `stableTypeOrdering`; with it the checker sorts
  union members with `compareTypes` (`typescript.js`, with `compareTypeNames`, `compareSymbols`,
  `compareTypeLists`, `compareTupleTypes`): by type flags (`string`, `number`, string literals, number
  literals, `true`/`false`, enum members, `object`, type parameters, object types, unions, intersections),
  then by name (an alias's name, or the interface, class or type parameter's), then by declaration
  position, literal value or type arguments. That order depends on the types alone, and it is the
  only order TypeScript 7 has. stencilrs reads `stableTypeOrdering` from the governing tsconfig the
  way it reads `strict` (following `extends`), in build-accurate mode only, and then orders every union
  with the same comparator (`union_order.rs`) instead of reporting the member. `undefined` and `null`
  still print last and `false | true` is still `boolean`. The two orders differ in a handful of
  places (Ionic: `CustomEvent<any> | MouseEvent | PointerEvent | TouchEvent` against
  `CustomEvent<any> | PointerEvent | MouseEvent | TouchEvent`, a `Promise<X> | X` return, the
  `SpinnerTypes` literals), so a project must choose, and stencilrs follows its choice. Where the
  comparator needs something the model does not have, the member still reports `stencilrs:`: two
  type literals or function types (ordered by where they are written), two types of one name that
  are not known to be one symbol, two enums, tuples with optional or rest elements and arrays or
  tuples declared inside a type alias (their nodes are compared), unions the checker keeps an
  origin for, and intersections without an alias. Fixture: `build-stable/` (its own tsconfig, snapshots
  in `snapshots-build-stable/`); `build/` is the option off and stays as it was.
- **Types the build generates** (`HTMLIonTabElement`, `HTMLIonPopoverElement`): they come from
  `src/components.d.ts`, which Stencil writes. With `resolveImports`, `HTML<Pascal>Element` is
  printed as written and referenced as `global` when a `@Component` under the `src` folder next to
  the governing tsconfig has the tag it stands for (`ion-tab`); that file becomes a dependency of
  the result. Names of one word or with digits or acronyms (`HTMLHRElement`), and the lib's own
  multi-word interfaces, are not read. A tag nothing declares stays unported: a build fails on
  it (`Cannot find name`). Two element types in one union (`HTMLIonTabElement | HTMLElement`) fall
  under the type-id ordering above.
- **An intersection with a union** is distributed as the checker does (`A & (B | C)` is
  `A & B | A & C`, the cross product made last union fastest, aliases inside it expanded and
  flattened: `{ date: string } & DatetimeHighlightStyle` is three `{ date } & { ...opt } & { x }`
  members). A union with a literal, `null`, `undefined`, `any` or `{}` member, a generic one, or a
  product over 256 members is still left to Stencil, since the checker collapses those. A distributed
  union printed on its own (not as an array's element, which Stencil sorts as text) is ordered by type
  id, which stencilrs cannot know, so it still falls back. Ionic: ion-datetime `highlightedDates`
  now matches. Fixture: `build/src/components/intersection-unions.tsx`.
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
  parameter, and lib namespaces other than `Intl`, and `Intl` interfaces outside lib.es5 (`PluralRulesOptions` and later).
- `Intl.DateTimeFormatOptions` (and `NumberFormatOptions`, `CollatorOptions`, the `Intl` interfaces of
  lib.es5) is ported: the checker prints the interface
  without the `Intl.` qualifier. A prop typed `Alias | undefined` where the alias is a union of
  object types is also ported: `resolveType` reads the flattened members, so the alias is not
  a nested union. Ionic: ion-datetime `formatOptions`. Fixture: `build/src/components/intl.tsx`.

A member with `stencilrs:` here is also what `docs` and `types` of the Vite plugin look at: a file whose
metadata reports one gets its metadata (`docs`, `components.d.ts`) from Stencil's compiler, for that file only
(`docs/vite-plugin.md`).

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
