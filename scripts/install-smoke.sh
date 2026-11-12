#!/bin/sh
# Install the packed tarballs in $1 into an empty project in $2, the way a user would, and load
# the binary. POSIX sh so it also runs in node:22-alpine, which has no bash.
set -eu
pkgs=$1
app=$2
mkdir -p "$app"
cd "$app"
npm init -y >/dev/null
npm install --legacy-peer-deps --no-audit --no-fund "$pkgs"/*.tgz
node --input-type=module -e "
  import { analyze } from '@popcorn245/stencilrs';
  const { components } = analyze(
    \"import { Component } from '@stencil/core'; @Component({ tag: 'cmp-a' }) export class A {}\",
    'a.tsx',
  );
  if (components[0]?.tagName !== 'cmp-a') throw new Error(JSON.stringify(components));
  console.log('loaded on', process.platform, process.arch);
"
