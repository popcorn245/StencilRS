// Copies the built cdylib to stencilrs.node beside index.js.
// Stand-in until the package is published with @napi-rs/cli per-platform binaries.
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const profile = process.argv[2] ?? 'release';
const lib = {
  win32: 'stencilrs_napi.dll',
  darwin: 'libstencilrs_napi.dylib',
  linux: 'libstencilrs_napi.so',
}[process.platform];

copyFileSync(`${root}target/${profile}/${lib}`, `${root}stencilrs.node`);
console.log(`stencilrs.node <- target/${profile}/${lib}`);
