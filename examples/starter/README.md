# stencilrs starter

Stencil v5 components, compiled by stencilrs through Vite 8 (Rolldown). Write components the
Stencil way (`@Component`, `@Prop`, `@State`, `@Event`, `@Method`, `@Watch`, `@Listen`,
`@Element`, JSX, `styleUrl`); stencilrs turns each file into a self-registering custom element.

## First time

```sh
cd ../..
npm install
npm run build:native    # needs Rust (cargo); builds stencilrs.node
cd examples/starter
npm install
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with the demo page (`index.html`). Edit a component and it hot-reloads in place, keeping its state. |
| `npm run new pop-card` | Scaffold `src/components/pop-card/` (component, CSS, test, Storybook story) and register it. |
| `npm test` | Tests in happy-dom (fast, no browser). |
| `npm run test:browser` | The same tests in headless Chrome (the Chrome installed on this machine). |
| `npm run build` | Production build of the demo page into `dist/`. |
| `npm run build:lib` | `dist/lib/components.js`: one ES module that registers every component, to use elsewhere. |

## Layout

```
src/
  components/<tag>/<tag>.tsx   the component
  components/<tag>/<tag>.css   its styles (styleUrl)
  components/<tag>/<tag>.test.ts
  index.ts                     exports every component (library entry; main.ts imports it)
  main.ts                      demo page script
  test-utils.ts                mount() and flush() for tests
```

## Testing notes

- `mount(html)` renders and waits for `componentOnReady()`. After changing a prop or state,
  `await flush()` lets Stencil's batched re-render run.
- happy-dom has no `ElementInternals`, so `@AttachInternals` components need
  `npm run test:browser`.

## What compiles with stencilrs

Everything above, including inheritance (`pop-press-button` extends `src/shared/pressable.ts`)
and mixins (`pop-tone-chip` extends `Mixin(withTone)` from `src/shared/with-tone.ts`). A file
that uses something stencilrs hasn't ported yet (`@AttachInternals`, `@PropSerialize` /
`@AttrDeserialize`, per-mode styles, inline `styles` on scoped components) is compiled by
Stencil's own compiler instead, automatically.
`stencilrs({ verbose: true })` (set in `vite.config.ts`) logs how many files each compiler handled.
