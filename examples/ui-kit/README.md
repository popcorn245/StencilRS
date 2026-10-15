# ui-kit: the old bucket component set on Stencil v5, checked against stencilrs

The bucket ui-kit (136 Stencil 4 components, 107 spec files) migrated to Stencil v5. It builds
with zero errors and zero warnings under `stencil build`, and stencilrs is checked against it.

```sh
npm install
npm run build           # stencil build (v5): loader-bundle, standalone, www, docs-json
node check-build.mjs    # stencilrs metadata vs the full build's, per component and field
npm run test:stencil    # specs on components compiled by Stencil v5 (@stencil/unplugin)
npm test                # specs on components compiled by stencilrs
npm run compare         # tests that differ between the two
node failures.mjs       # failing specs grouped by error
node coverage.mjs       # which files stencilrs compiles vs hands to Stencil
```

## Result (2026-10-14)

| Check | Result |
|---|---|
| `stencil build` (v5.0.0-beta.25, TypeScript 6.0.3) | **0 errors, 0 warnings**, ~12 s |
| stencilrs metadata vs the full build (`check-build.mjs`) | **136 / 136 components identical** (props incl. types, attributes, reflect, defaults; states, events, methods, listeners, watchers, element ref, encapsulation) |
| stencilrs vs Stencil's `transpileSync`, per file (`../../parity`) | **136 / 136 identical** metadata, diagnostics and code |
| Spec suite, Stencil v5 | 793 / 874 |
| Spec suite, stencilrs | 793 / 874, **no test differs** |
| Files stencilrs compiles itself | 136 / 136 (no fallback to Stencil) |

The 81 failing specs fail identically with both compilers: they were written for the ui-kit's
mock renderer (decorators stubbed out, vnodes drawn by hand into light DOM), so they assume
things real components don't do: children a spec never imports, `shadow` components rendering
into light DOM, events named after the property. A few rely on v4 behaviour v5 changed: the
attribute string `"false"` no longer turns a boolean prop off.

## Migration to v5 (what changed)

1. `@Component({ shadow, scoped })` → `encapsulation: { type: 'shadow' | 'scoped' }` (all 136).
2. `: Promise<any>` on 42 `async @Method()`s that had no return type. A full build accepts
   them; Stencil's single-file compiler (`@stencil/unplugin`) rejects them (`../../docs/quirks.md` §1).
3. `stencil.config.ts`: `dist` → `loader-bundle`, `dist-custom-elements` → `standalone`, `extras`
   removed (`enableImportInjection` is the default), `testing` removed, `externalRuntime: false`
   and `serviceWorker: null` dropped (now the defaults). `stencil migrate --dry-run` reports
   nothing left.
4. `tsconfig.json`: TypeScript 6 defaults `strict` to true and deprecates `baseUrl`, so
   `"strict": false` is explicit (the ui-kit was written without strict mode) and `baseUrl` is gone.
5. `firebase` is a declared dependency (the ui-kit relied on the bucket monorepo hoisting it), and
   `package.json` has the distribution fields v5 asks for.
6. `@popcorn245/cards-core` / `floorplan-core` are vendored from the bucket repo (`vendor/`) and
   mapped with tsconfig `paths`.

`import.mjs` did steps 1–2 from the bucket repo once; the rest is by hand. Re-running it
overwrites `src/`, `styles/` and `vendor/`.

## stencilrs modes

The full build type-checks the whole program; Stencil's single-file compiler does not, so for 21
of these components it computes different prop types (an imported `CardPayload` becomes `any`,
and so gets an attribute). stencilrs has both:

- `resolveImports: true` (the Vite plugin's default): follows relative imports and knows lib
  types, matching `stencil build`, as `check-build.mjs` shows.
- `resolveImports: false`: exactly what `transpileSync` produces, as `../../parity` shows.

## Spec harness

`harness/spec-page.ts` replaces the ui-kit's mock `newSpecPage`: it mounts the real compiled
elements, waits for `componentOnReady()`, and `waitForChanges()` lets Stencil's queued render run
(stepping fake frames under `vi.useFakeTimers()`). `vitest.config.ts` picks the compiler from
`COMPILER=stencil|stencilrs`.
