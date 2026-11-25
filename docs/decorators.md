# Decorators that are not Stencil's

stencilrs applies every decorator that is not Stencil's own, as TypeScript's legacy
(`experimentalDecorators`) emit does, so a component using a third-party decorator behaves the same
under stencilrs and under Stencil's compiler. `@Signal()` (see [signals.md](signals.md)) is one
such decorator and has no special case.

Stencil's own are the member decorators the compiler consumes (`@Prop`, `@State`, `@Event`,
`@Listen`, `@Method`, `@Watch`, `@Element`, `@AttachInternals`, `@PropSerialize`,
`@AttrDeserialize`) and `@Component`. Anything else is applied.

## What each decorator becomes

The decorators of a member run last to first, like TypeScript's `__decorate`. A module that has a
decorator of its own gets one small helper, `__rs_decorate`, with TypeScript's semantics: a value a
decorator returns replaces the property descriptor (or the class).

| Decorated | Emitted |
| --- | --- |
| instance field | `this["x"] = init;` in the constructor (whatever `useDefineForClassFields` says, so a class field cannot shadow an accessor the decorator defines), then `__rs_decorate([Dec()], Cmp.prototype, "x", void 0)` after the class |
| method, getter, setter | `__rs_decorate([Dec()], Cmp.prototype, "m", null)`: the helper reads the property descriptor, runs the decorators, and defines what comes back. A getter and its setter are one property |
| static member | the same, on the constructor (`Cmp`) instead of the prototype. A static field keeps its initializer |
| class (other than `@Component`) | `Cmp = __rs_decorate([Dec()], Cmp);` a returned value replaces the class |

## Order (the contract)

1. Member decorators are applied to the prototype or the constructor, in source order of the
   members.
2. Class decorators other than `@Component` are applied.
3. The tag is registered (`customElements.define`, `defineCustomElement`, `proxyCustomElement`,
   `__rs_define`, or the lazy loader's registration). Nothing is registered before steps 1 and 2,
   so an element already in the page (server-rendered) upgrades with the decorated accessors in
   place.
4. For each instance, the constructor runs the field initializers as assignments, so they go
   through a decorator's setter, before `connectedCallback`.

This holds for every output: Stencil's runtime (`customelement`, `module`, lazy, and the `ssr`
hydrate output) and the stencilrs runtime. In the lazy and hydrate outputs the decorated class is
the instance class handed to `registerInstance`, and it is decorated at module load, before any
instance exists.

## Limits

- A custom decorator on a `@Prop()` or `@State()` field is an error. Stencil defines its own
  accessor for those members, which the decorator's would replace.
- Third-party decorators are not compile-time: they never feed `components.d.ts`, docs, the custom
  elements manifest or the member flags.
- Decorators on private (`#x`) members and on `accessor` fields are not lowered.
- Decorators on a class that is not a component are left as written.
