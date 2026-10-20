// Stencil v5's compiler, as the parity harness calls it.
//
// `transpileSync` reaches the native and lazy transforms (`componentExport`) but never the SSR one:
// Stencil only runs `ssrComponentTransform` from the ssr output target (hydrate), as a Rolldown
// pass over modules `transpileModule` has already converted. So for `ssr` the same emit is run
// with `ssrComponentTransform` in the slot `lazyComponentTransform` has: the compiler chunk is
// copied next to the original with that one branch added, so every import still resolves.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { transpileSync } from '@stencil/core/compiler';

const BRANCH = 'else transformers.after.push(lazyComponentTransform(compilerCtx, transformOpts, buildCtx));';
const SSR_BRANCH =
  'else if (transformOpts.coreImportPath === STENCIL_INTERNAL_SSR_PLATFORM_ID) transformers.after.push(ssrComponentTransform(compilerCtx, transformOpts, buildCtx));\n\t' +
  BRANCH;

/** Stencil's `transpileSync` with the ssr transform reachable: pass `coreImportPath: '@stencil/core/runtime/server'`. */
const loadSsr = async () => {
  const dist = join(dirname(fileURLToPath(import.meta.resolve('@stencil/core/compiler'))), '..');
  const chunk = readdirSync(dist).find((f) => /^compiler-[\w-]+\.mjs$/.test(f) && f !== 'compiler-parity-ssr.mjs');
  const source = readFileSync(join(dist, chunk), 'utf8');
  if (!source.includes(BRANCH)) throw new Error('transpileModule not found in the @stencil/core compiler chunk; has its layout changed?');
  const patched = join(dist, 'compiler-parity-ssr.mjs');
  const text = source.replace(BRANCH, SSR_BRANCH).replace('\nexport {', '\nexport { transpileSync as __ssrTranspileSync,');
  if (!existsSync(patched) || readFileSync(patched, 'utf8') !== text) writeFileSync(patched, text);
  return (await import(pathToFileURL(patched).href)).__ssrTranspileSync;
};
const ssrSync = await loadSsr();

/** `transpileSync`, or its ssr variant when the options carry Stencil's server runtime as `coreImportPath`. */
export const stencilTranspile = (code, options) =>
  options.coreImportPath === '@stencil/core/runtime/server' ? ssrSync(code, options) : transpileSync(code, options);
