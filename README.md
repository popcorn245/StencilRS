# @popcorn245/stencilrs

[![CI](https://github.com/popcorn245/StencilRS/actions/workflows/ci.yml/badge.svg)](https://github.com/popcorn245/StencilRS/actions/workflows/ci.yml)
[Storybook on GitHub Pages](https://popcorn245.github.io/StencilRS/)

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

**[`examples/ui-kit`](examples/ui-kit/README.md)** is the old bucket component set (136
components) on Stencil v5: `stencil build` is clean, stencilrs matches the full build's
metadata for all 136, and the spec suite gives identical results with either compiler.

**[`examples/starter`](examples/starter/README.md)** is a ready project: dev server with hot
reload, a component generator, tests in happy-dom and in headless Chrome, app and library builds.

**[`storybook/`](storybook/README.md)** shows both component sets, compiled by stencilrs, beside
the full documentation: getting started, writing components, the Vite plugin, the API, testing,
migrating to v5, how the compiler works and was built, parity, benchmarks, quirks and roadmap.

```sh
cd storybook && npm install && npm run storybook   # http://localhost:6007
```

The built Storybook is live on GitHub Pages at **https://popcorn245.github.io/StencilRS/**, and on the tailnet only, at **https://stencilrs.popcorn245.com**. Every
push to `main` runs [`.forgejo/workflows/deploy.yml`](.forgejo/workflows/deploy.yml):
[`scripts/ci.sh`](scripts/ci.sh) builds and tests the compiler, then the components (starter and
ui-kit: tests, then a stencilrs library build), then the Storybook, and the workflow publishes
it. Pull requests run the same build without publishing. Run the CI build locally in the same
image with `docker run --rm -v "$PWD":/src -w /src node:22-bookworm bash scripts/ci.sh`.

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
- Step 2 done: [`parity/`](parity/README.md), 185 fixtures (34 features, 15 inheritance and
  mixins, and the 136 ui-kit components) with golden output from real Stencil v5.
- Step 3, first seam done: `transpile()` produces what Stencil's `transpileSync` emits for
  `@stencil/unplugin` (`componentExport: 'customelement'`): metadata, diagnostics and code.
  **185/185 fixtures identical** to Stencil v5 (code compared after reprinting both through
  oxc's printer). `analyze()` returns metadata only; `normalize()` is the printer. With
  `resolveImports` it also matches a full `stencil build`'s metadata: 136/136 on the ui-kit.
- The ui-kit spec suite: 874/874 green with either compiler.
- Benchmark (`npm run bench`), same 165 files, one process: about **41× faster** per file than
  Stencil v5 warm; a production Vite build of the whole ui-kit is about **4.7× faster**. Numbers:
  the Benchmarks page in Storybook.
- Source maps back to the original TypeScript, through the Vite plugin in dev and build. All
  fixture maps are valid, and 97.7% of mapped identifiers land on the same identifier in the
  source, against 94.3% for Stencil's own maps (`node parity/sourcemaps.mjs`).
- Inheritance and mixins: `extends Base` and `extends Mixin(a, b)`, in the same file or through
  relative imports (one barrel hop), with Stencil's member merging and warnings. The Vite plugin
  serves the files ancestors live in as base-class modules, as @stencil/unplugin does.
- Forms and serializers: `@AttachInternals` (form-associated components, custom states) and
  `@PropSerialize` / `@AttrDeserialize`.
- Not yet: computed member names, const evaluation for decorator arguments, scoped inline
  `styles` (needs `scopeCss`), style modes, JSDoc and full `complexType`, the lazy and SSR
  outputs.

Stencil behaviours copied on purpose (upstream bug candidates): [`docs/quirks.md`](docs/quirks.md).

## Develop

```sh
npm run build:native   # napi build: stencilrs.<platform>.node, which index.js prefers
                       # over the prebuilt @popcorn245/stencilrs-<platform> package
npm test               # cargo test, then node --test
```

## Release

Set `version` in `package.json`, then push a matching tag (`git tag v0.1.0 && git push origin
v0.1.0`). [`.github/workflows/release.yml`](.github/workflows/release.yml) builds the binary for
linux x64/arm64 (glibc 2.17+), macOS x64/arm64 and Windows x64, installs each from the packed
tarballs on its own OS, then publishes the five `@popcorn245/stencilrs-<platform>` packages and
`@popcorn245/stencilrs` (with provenance). It needs an `NPM_TOKEN` repository secret.

## Reference source

A read-only clone of `stenciljs/core` at branch `v5` lives beside this repo in
`../stencil-core-v5`. It is reference material: nothing in it is built or run from here.

## License

[MIT](LICENSE), copyright 2026 Popcorn245. Code ported from Stencil keeps Stencil's MIT notice; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
