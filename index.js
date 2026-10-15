import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const nativePath = fileURLToPath(new URL('./stencilrs.node', import.meta.url));
const native = createRequire(import.meta.url)(nativePath);

/** Changes whenever the native binary does: for build caches keyed on plugin output. */
export const buildId = (() => {
  const s = statSync(nativePath);
  return `${s.size}-${Math.round(s.mtimeMs)}`;
})();

/**
 * Read the Stencil components in one module.
 * @param {string} source module source (TS/TSX)
 * @param {string} fileName used to pick the parser (`.ts`, `.tsx`)
 * @returns {{ components: object[], diagnostics: object[] }}
 */
export const analyze = (source, fileName) => native.analyze(source, fileName);

/**
 * Generate the customelement module (what Stencil's transpileSync emits for @stencil/unplugin).
 * @param {string} source module source (TS/TSX)
 * @param {{ file: string, coreImportPath?: string, jsx?: 'classic' | 'automatic', jsxImportSource?: string }} options
 * @returns {{ code: string, components: object[], diagnostics: object[] }}
 */
export const transpile = (source, options) => native.transpile(source, options);

/** Reprint JavaScript through one printer, comments dropped, to compare outputs. */
export const normalize = (code) => native.normalize(code);
