#!/usr/bin/env bash
# The CI build, in order: the compiler, parity with Stencil v5, the components, the Storybook.
# The Forgejo workflow (.forgejo/workflows/deploy.yml) runs this, and so can you, in the same
# image:
#
#   docker run --rm -v "$PWD":/src -w /src node:22-bookworm bash scripts/ci.sh
#
# Output: storybook/dist (the static Storybook the workflow publishes).
set -euo pipefail

step() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

# Vitest's browser mode and the ui-kit's server-render smoke test need Playwright's package, never
# its browser downloads, in CI: the smoke test's browser step skips itself when it finds no Chromium.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export CARGO_TERM_COLOR=always

step "Rust toolchain"
if ! command -v cargo >/dev/null 2>&1; then
  [ -f "$HOME/.cargo/env" ] || curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable
  . "$HOME/.cargo/env"
fi
rustc --version
node --version

step "Compiler: the native binding, then its tests"
npm ci
npm run build:native
npm test

step "Parity with Stencil v5: output on every fixture, source maps, then scoped CSS"
npm --prefix parity ci
npm run parity
npm run parity:sourcemaps
npm run parity:scope-css

step "Components: starter (tests in happy-dom, then the library build)"
npm --prefix examples/starter ci
npm --prefix examples/starter test
npm --prefix examples/starter run build:lib

step "Components: ui-kit (the spec suite on stencilrs, then the library build)"
npm --prefix examples/ui-kit ci
npm --prefix examples/ui-kit test
npm --prefix examples/ui-kit run build:stencilrs

step "Server rendering: ui-kit hydrate app from stencilrs, Node + happy-dom + Chromium (skipped when none)"
npm --prefix examples/ui-kit run test:ssr

step "Storybook"
npm --prefix storybook ci
npm --prefix storybook run build

step "Done: storybook/dist"
du -sh storybook/dist
