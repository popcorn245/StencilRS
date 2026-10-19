# Contributing

Issues and pull requests are welcome. The open work is on the
[issue tracker](https://github.com/popcorn245/StencilRS/issues); each issue says what "done" means.

## Setup

Rust (stable) and Node 22.

```sh
npm install
npm run build:native   # the native binding, as stencilrs.<platform>.node
npm test               # cargo test, then node --test
```

## The rule: same output as Stencil v5

stencilrs is judged against real Stencil v5, not against itself. [`parity/`](parity/README.md)
holds golden output from Stencil v5 for 185 fixtures; a change is right when they still match:

```sh
npm --prefix parity ci
npm run parity              # metadata, diagnostics and code, fixture by fixture
npm run parity:sourcemaps   # source map validity and accuracy
```

Porting a new Stencil feature? Add a fixture under `parity/fixtures/`, snapshot it with real
Stencil (`npm run parity:snapshot`), then make stencilrs match. If Stencil does something that
looks like a bug, match it anyway and note it in [`docs/quirks.md`](docs/quirks.md).

## Before a pull request

```sh
bash scripts/ci.sh   # what CI runs: compiler, parity, both example projects, Storybook
```

Keep a pull request to one change, say what it fixes and how you checked it. Touching the native
binding also runs [`release.yml`](.github/workflows/release.yml), which builds and installs it on
every supported platform.

## Where things are

| Path | What |
|---|---|
| `crates/stencilrs_transform` | The compiler: analysis, prop typing, code generation. |
| `crates/stencilrs_napi` | The Node binding (napi-rs). |
| `index.js`, `vite.js` | The JS API and the Vite plugin. |
| `parity/` | Golden output from Stencil v5 and the comparison harness. |
| `examples/` | The starter project and a 136-component library used as a real-world check. |
| `storybook/` | The docs site and component stories. |
| `docs/` | Design notes: the pipeline map, the transformer catalogue, quirks. |

By contributing you agree your work is released under the [MIT license](LICENSE).
