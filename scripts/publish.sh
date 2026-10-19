#!/usr/bin/env bash
# semantic-release's publish step: the five platform packages, then the root package that
# depends on them. Anything already on npm at this version is skipped, so a run that failed
# halfway can simply be re-run.
set -euo pipefail

publish() {
  local spec
  spec=$(node -p "const p = require('./$1/package.json'); p.name + '@' + p.version")
  if npm view "$spec" version >/dev/null 2>&1; then
    echo "$spec already published"
    return
  fi
  npm publish "./$1" --provenance --access public
}

for dir in npm/*/; do publish "${dir%/}"; done
publish .
