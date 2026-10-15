# ui-kit harness: the old bucket's specs on real compiled components

The bucket ui-kit (136 Stencil components, 107 spec files, 869 tests) run twice: once with
Stencil v5's own compiler (`@stencil/unplugin`) and once with stencilrs, then compared test by
test.

```sh
npm install
npm run import          # copy + migrate the ui-kit from ../../../bucket (git-ignored)
npm run test:stencil    # baseline: Stencil v5 transpileSync → results/stencil.json
npm test                # stencilrs                         → results/stencilrs.json
npm run compare         # tests that differ between the two
node failures.mjs       # failing tests grouped by error
node coverage.mjs       # which files stencilrs compiles vs hands to Stencil
```

## Result (2026-10-14)

| | tests passing |
|---|---|
| Stencil v5 (5.0.0-beta.25) | 788 / 869 |
| stencilrs | 788 / 869 |

**No test differs between the two compilers.** stencilrs compiles all 136 component files
itself (no fallback). The 81 tests that fail fail identically with both, so they are about the
specs or Stencil v5, not stencilrs:

- The specs were written for a mock renderer (decorators stubbed out, vnodes drawn by hand into
  light DOM). Real components behave differently in places: children a spec never imports stay
  unregistered, `shadow` components render into a shadow root, events use their real names.
- Stencil v5 no longer treats the attribute string `"false"` as `false` for boolean props
  (`showHeader="false"`, `fullscreen="false"`, …): a real migration item for these components.
- `firebase/auth` is not installed here; happy-dom lacks some browser APIs (camera, `ElementInternals`).

## How it works

- `import.mjs` copies `packages/ui-kit/src` (no stories or e2e files) and the internal
  `cards-core` / `floorplan-core` packages, and migrates components to v5:
  `shadow`/`scoped` → `encapsulation`, and `: Promise<any>` on unannotated `async @Method()`s
  (42 of them; v5 rejects those when compiling one file, see `../../docs/quirks.md`).
- `harness/spec-page.ts` replaces the ui-kit's mock `newSpecPage`: it mounts the real elements,
  waits for `componentOnReady()`, and `waitForChanges()` lets Stencil's queued render run. It
  keeps working under `vi.useFakeTimers()` by stepping fake frames.
- `vitest.config.ts` picks the compiler from `COMPILER=stencil|stencilrs`.
