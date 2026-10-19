import { existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

// The binary for this platform: a local `npm run build:native` first, then the prebuilt package
// npm installed as an optional dependency.
const platform = {
  'linux-x64': 'linux-x64-gnu',
  'linux-arm64': 'linux-arm64-gnu',
  'darwin-x64': 'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'win32-x64': 'win32-x64-msvc',
}[`${process.platform}-${process.arch}`];

const nativePath = (() => {
  const local = fileURLToPath(new URL(`./stencilrs.${platform}.node`, import.meta.url));
  if (platform && existsSync(local)) return local;
  try {
    return require.resolve(`@popcorn245/stencilrs-${platform}`);
  } catch {
    throw new Error(
      `stencilrs has no prebuilt binary for ${process.platform}-${process.arch}` +
        (platform ? ` (is @popcorn245/stencilrs-${platform} installed? npm skips it with --no-optional)` : '') +
        '. Build it from source with Rust: npm run build:native',
    );
  }
})();
const native = require(nativePath);

/** Changes whenever the native binary does: for build caches keyed on plugin output. */
export const buildId = (() => {
  const s = statSync(nativePath);
  return `${s.size}-${Math.round(s.mtimeMs)}`;
})();

/**
 * Read the Stencil components in one module.
 * @param {string} source module source (TS/TSX)
 * @param {string} fileName used to pick the parser (`.ts`, `.tsx`) and resolve relative imports
 * @param {{ resolveImports?: boolean }} [options] build-accurate: follow imports like `stencil build`
 * @returns {{ components: object[], diagnostics: object[] }}
 */
export const analyze = (source, fileName, options = {}) => native.analyze(source, fileName, options.resolveImports ?? false);

/**
 * Generate the customelement module (what Stencil's transpileSync emits for @stencil/unplugin).
 * @param {string} source module source (TS/TSX)
 * @param {{ file: string, coreImportPath?: string, jsx?: 'classic' | 'automatic', jsxImportSource?: string, resolveImports?: boolean }} options
 * @returns {{ code: string, components: object[], diagnostics: object[] }}
 */
export const transpile = (source, options) => native.transpile(source, options);

/** Reprint JavaScript through one printer, comments dropped, to compare outputs. */
export const normalize = (code) => native.normalize(code);
