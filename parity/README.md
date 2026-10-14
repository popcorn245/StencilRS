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
- `fixtures/ui-kit/`: the old bucket's 136 Stencil 4 components, migrated to v5 by
  `import-ui-kit.mjs` (only `shadow` / `scoped` → `encapsulation` was needed). Re-import with
  `node import-ui-kit.mjs <path to bucket>/packages/ui-kit/src`.

## Mode

Fixtures are compiled with `transpileSync` exactly as `@stencil/unplugin` calls it
(`componentExport: 'customelement'`, `styleImportData: 'queryparams'`, classic `h` JSX when
the file imports `h`, the automatic runtime otherwise). See `snapshots/manifest.json`.

Each fixture gets `snapshots/<suite>/<name>.js` (emitted code) and `.json` (component
metadata, diagnostics, imports).

## What is compared

- **Metadata**: Stencil's `ComponentCompilerMeta` projected to the fields stencilrs produces
  (`fromStencil` in `compare.mjs`; the list grows with the port).
- **Diagnostics**: level and full message text, order-independent.
- **Code**: not yet; stencilrs has no codegen.

Known Stencil quirks stencilrs copies on purpose: [`../docs/quirks.md`](../docs/quirks.md).
