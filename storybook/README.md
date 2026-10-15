# stencilrs Storybook

One Storybook for the whole repository, with three sections in the sidebar:

| Section | What it holds |
|---|---|
| **Docs** | The documentation (`docs/*.mdx`): introduction, getting started, writing components, the Vite plugin, the API, testing, migrating to Stencil v5, how it works, how it was built, parity, benchmarks, quirks, roadmap, and reference pages. |
| **UI Kit** | The stories of [`examples/ui-kit`](../examples/ui-kit/README.md), the 136-component set on Stencil v5. |
| **Starter** | The stories of [`examples/starter`](../examples/starter/README.md). |

Every component is compiled by stencilrs through its Vite plugin (Stencil's compiler only as the
per-file fallback). The Controls panel is fed by `generated/custom-elements.json`, which
`scripts/custom-elements.mjs` writes from stencilrs' own `analyze()` metadata.

## Run it

Build the native binary at the repository root first (`npm run build:native`), then:

```sh
npm install
npm run storybook   # dev server on http://localhost:6007
npm run storybook:tailnet   # same, on every interface: http://<machine>.<tailnet>.ts.net:6007
npm run build       # static Storybook in dist/
```

Both commands regenerate the custom-elements manifest first (`npm run manifest`).

## Layout

```
.storybook/main.ts          stories from the three folders, stencilrs plugin, ui-kit aliases, static dirs
.storybook/preview.ts       ui-kit global styles, registers every component, theme toolbar, sort order
.storybook/preview-head.html  ionicons (pop-icon wraps <ion-icon>)
docs/                       the MDX pages; docs/data/benchmarks.json feeds the Benchmarks page
scripts/custom-elements.mjs the manifest generator
```

## Adding to it

- **A docs page:** add `docs/<Name>.mdx` with `<Meta title="..." />`; set its place in
  `storySort` in `.storybook/preview.ts`.
- **A component story:** add `<tag>.stories.ts` next to the component in either example
  (`npm run new <tag>` in the starter writes one for you). Storybook picks it up on its own.
- **New benchmark numbers:** run `npm run bench` at the root and `node bench-build.mjs` in
  `examples/ui-kit`, then update `docs/data/benchmarks.json`.
