# stencilrs

[![CI](https://github.com/popcorn245/StencilRS/actions/workflows/ci.yml/badge.svg)](https://github.com/popcorn245/StencilRS/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@popcorn245/stencilrs)](https://www.npmjs.com/package/@popcorn245/stencilrs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**[Stencil v5](https://github.com/stenciljs/core/tree/v5) components, compiled by Rust.**

stencilrs replaces the slow part of the Stencil compiler: the TypeScript transform layer that turns
a component file (`@Component`, `@Prop`, `@State`, JSX…) into a working custom element. It is a
Rust port on [oxc](https://oxc.rs), runs as a Vite 8 plugin, and produces **the same output as
Stencil v5**: about **40× faster per file** and **4.7× faster** for a production Vite build.

You write components exactly as you would for Stencil v5. stencilrs compiles them, and Stencil's
own runtime (`@stencil/core`) runs them in the browser.

**Docs and live components:** [popcorn245.github.io/StencilRS](https://popcorn245.github.io/StencilRS/)

## Install

```sh
npm install --save-dev @popcorn245/stencilrs vite@8 \
  @stencil/core@5.0.0-beta.25 @stencil/unplugin@5.0.0-beta.25
```

Node 22 or newer. Prebuilt binaries ship for Linux x64/arm64 (glibc 2.17+), macOS x64/arm64 and
Windows x64; no Rust toolchain needed. Other platforms can [build from source](#develop).

## Use it with Vite

```ts
// vite.config.ts
import stencilrs from '@popcorn245/stencilrs/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [stencilrs()] });
```

```json
// tsconfig.json (the parts that matter)
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@stencil/core"
  }
}
```

Import a component module anywhere and its custom element is registered:

```ts
import './components/my-counter/my-counter';
```

The plugin compiles component files with stencilrs and leaves the rest to `@stencil/unplugin`
(CSS, the runtime, build flags). A file that uses something stencilrs hasn't ported yet falls back
to Stencil's own compiler, so a project never breaks for want of a feature.

For a ready project (dev server, component generator, tests in happy-dom and headless Chrome, app
and library builds) copy [`examples/starter`](examples/starter/README.md).

## Status

| Check | Result |
|---|---|
| Same output as Stencil v5's per-file compiler, 207 fixtures | **207/207**: metadata, diagnostics and code |
| Same metadata as a full `stencil build`, 136-component library | **136/136** |
| That library's spec suite (874 tests) | **874/874** with either compiler |
| Per-file compile, 165 files | **68 ms** vs 2.8 s (41×) |
| Production `vite build` of the library | **0.82 s** vs 3.9 s (4.7×) |

Supported: every Stencil decorator (`@Component`, `@Prop`, `@State`, `@Event`, `@Method`,
`@Watch`, `@Element`, `@Listen`, `@AttachInternals`, `@PropSerialize`, `@AttrDeserialize`),
JSX, `styleUrl(s)` and inline `styles`, shadow and scoped encapsulation, inheritance and mixins,
form-associated components, constants as decorator arguments and computed member names
(`@Watch(KEYS.open)`, enums, `resolveVar()`, `@Prop() [NAME]`), and source maps back to the
original TypeScript.

Not yet (these fall back to Stencil, or are tracked as issues):

- inline `styles` on scoped components ([#1](https://github.com/popcorn245/StencilRS/issues/1)),
  `globalStyle` ([#3](https://github.com/popcorn245/StencilRS/issues/3))
- the lazy-loading and SSR outputs ([#5](https://github.com/popcorn245/StencilRS/issues/5),
  [#6](https://github.com/popcorn245/StencilRS/issues/6)) and `newSpecPage`
  ([#7](https://github.com/popcorn245/StencilRS/issues/7)); stencilrs emits the custom-element
  output Vite, Vitest and Storybook use
- JSDoc text and full `complexType` for docs output
  ([#8](https://github.com/popcorn245/StencilRS/issues/8))

## How it works

Stencil v5 already bundles with Rolldown and handles CSS with Lightning CSS. What remained slow is
its TypeScript-compiler-API transform layer (about 13.7k lines). stencilrs ports that layer to Rust
and exposes it to Node through napi-rs; everything else, including the browser runtime, is
Stencil's own.

| Layer | Stencil v5 | stencilrs |
|---|---|---|
| Decorator, JSX and component transforms | TypeScript `CustomTransformers` | Rust on oxc |
| Bundling | Rolldown | Rolldown (unchanged) |
| CSS | Lightning CSS | Lightning CSS (unchanged) |
| Browser runtime | `@stencil/core` | `@stencil/core` (unchanged) |

Parity is held by golden output: [`parity/`](parity/README.md) compiles a corpus with real
Stencil v5 and compares stencilrs against it on every change. Where Stencil has a quirk,
stencilrs copies it on purpose ([`docs/quirks.md`](docs/quirks.md)). Design notes:
[`docs/transformers.md`](docs/transformers.md), [`docs/pipeline.md`](docs/pipeline.md).

## JavaScript API

```js
import { analyze, transpile } from '@popcorn245/stencilrs';

analyze(source, 'my-cmp.tsx');                // { components, diagnostics }
transpile(source, { file: 'my-cmp.tsx' });    // { code, map, components, diagnostics }
```

The full reference is in the [docs](https://popcorn245.github.io/StencilRS/).

## Develop

Needs Rust (stable) and Node 22.

```sh
git clone https://github.com/popcorn245/StencilRS.git && cd StencilRS
npm install
npm run build:native   # builds stencilrs.<platform>.node, which index.js prefers over the prebuilt one
npm test               # cargo test, then node --test
npm run parity         # compare against Stencil v5's golden output (npm --prefix parity ci first)
bash scripts/ci.sh     # everything CI runs: compiler, parity, both example projects, Storybook
```

[CONTRIBUTING.md](CONTRIBUTING.md) covers how changes are checked and what a good pull request
looks like.

## Release

Releases are automatic. Pull requests are squash-merged and their titles are
[conventional commits](https://www.conventionalcommits.org) (checked on every PR): on each merge to
`main`, [semantic-release](https://semantic-release.gitbook.io) reads the commits since the last tag
and picks the version (`fix:` patch, `feat:` minor, `BREAKING CHANGE:` major; `docs:`, `chore:`
and the like release nothing). [`release.yml`](.github/workflows/release.yml) then builds every
platform, installs each from its packed tarball on its own OS, publishes the five
`@popcorn245/stencilrs-<platform>` packages and `@popcorn245/stencilrs` with provenance, and
writes the tag and the GitHub Release. It needs the `NPM_TOKEN` secret.

## License

[MIT](LICENSE). Code ported from Stencil keeps Stencil's MIT notice; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
