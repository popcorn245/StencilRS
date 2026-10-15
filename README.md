# @popcorn245/stencilrs

Stencil's component authoring, compiled by Rust.

stencilrs keeps the parts of [Stencil v5](https://github.com/stenciljs/core/tree/v5) that are already
modern (Rolldown bundling, Lightning CSS, the signals runtime, the v5 output targets) and replaces
the part that is still slow: the TypeScript-compiler-API transform layer
(`packages/core/src/compiler/transformers`, about 13.7k lines). In its place is a Rust crate on
[oxc](https://oxc.rs), exposed to Node through napi-rs. TypeScript 7 (tsgo) only type-checks.

| Layer | Stencil v5 | stencilrs |
|---|---|---|
| Decorator / JSX / component transforms | TypeScript `CustomTransformers` | Rust on oxc |
| Type checking | JS TypeScript (`>5 <7`) | tsgo, in parallel with the build |
| `.d.ts` | TypeScript emit | oxc isolated declarations, tsgo as fallback |
| `components.d.ts`, docs, `custom-elements.json` | TypeChecker | Rust metadata from written annotations; tsgo API after TS 7.1 |
| Bundling | Rolldown | Rolldown (unchanged) |
| CSS | Lightning CSS | Lightning CSS (unchanged) |
| Browser runtime | `@stencil/core/runtime` | reused as-is |

Authors write the same components as Stencil v5 (`@Component`, `@Prop`, `@State`, `@Event`,
`@Method`, `@Watch`, `@Element`, `@Listen`, `@AttachInternals`); stencilrs aims for byte-identical
output against v5.

## Use it

```ts
// vite.config.ts (Vite 8)
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [stencilrs()] });
```

Peer dependencies: `@stencil/core` and `@stencil/unplugin` (both `5.0.0-beta.25`) and Vite 8.
The plugin compiles component files with stencilrs and leaves everything else to
`@stencil/unplugin` (CSS modules and preprocessors, the runtime, build flags). Files using a
feature stencilrs hasn't ported fall back to Stencil's compiler automatically.

**[`examples/starter`](examples/starter/README.md)** is a ready project: dev server with hot
reload, a component generator, tests in happy-dom and in headless Chrome, app and library builds.

## Plan

1. **Study** – catalogue every v5 transformer: input shape, emitted code, and whether it needs
   the type checker (`docs/transformers.md`, `docs/pipeline.md`).
2. **Parity fixtures** – compile a component corpus with real Stencil v5 and snapshot the output.
   These snapshots are the test suite the Rust port has to match.
3. **Rust crate, first seam: `transpileSync`** – the one-function contract `@stencil/unplugin`
   calls (`code, opts → code, map, ComponentCompilerMeta[], imports, diagnostics`). It already runs
   with a blind type checker, so oxc can match it exactly. Order: decorator extraction straight to
   meta (with a syntactic prop-type classifier, falling back to `any`), component analysis, key
   insertion, component-native codegen, the standalone wrappers. See `docs/transformers.md` §5.
4. **Second seam: Pass B** – replace the `ts.transpileModule` that Stencil's Rolldown plugin runs on
   every module once per bundle; those transforms never use the checker. Then Pass A (the full-build
   emit), with type-only metadata answered by a batched TS query service. tsgo `--noEmit` runs
   alongside for diagnostics. See `docs/pipeline.md`.
5. **Benchmark** – cold and warm builds, Stencil v5 against stencilrs.

## Status

- Step 1 done: [`docs/transformers.md`](docs/transformers.md), [`docs/pipeline.md`](docs/pipeline.md).
- Step 2 done: [`parity/`](parity/README.md), 164 fixtures (27 features + the old bucket ui-kit)
  with golden output from real Stencil v5.
- Step 3, first seam done: `transpile()` produces what Stencil's `transpileSync` emits for
  `@stencil/unplugin` (`componentExport: 'customelement'`): metadata, diagnostics and code.
  **164/164 fixtures identical** to Stencil v5 (code compared after reprinting both through
  oxc's printer). `analyze()` returns metadata only; `normalize()` is the printer.
- Benchmark (`npm run bench`), same 164 files, one process: Stencil v5 ~2.3 s warm, stencilrs
  ~55 ms, about **40× faster** (70× cold). Stencil also writes source maps; stencilrs doesn't yet.
- Not yet: source maps, computed member names, const evaluation for decorator arguments,
  serializers, `@AttachInternals`, inheritance and mixins, scoped inline `styles` (needs
  `scopeCss`), style modes, JSDoc and full `complexType`, the lazy and SSR outputs.

Stencil behaviours copied on purpose (upstream bug candidates): [`docs/quirks.md`](docs/quirks.md).

## Develop

```sh
npm run build:native   # cargo build --release, copies the binary to stencilrs.node
npm test               # cargo test, then node --test
```

## Reference source

A read-only clone of `stenciljs/core` at branch `v5` lives beside this repo in
`../stencil-core-v5`. It is reference material: nothing in it is built or run from here.

## License

Not chosen yet. Code ported from Stencil keeps Stencil's MIT notice; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
