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
 * @param {{ resolveImports?: boolean, complexTypes?: boolean }} [options] resolveImports: build-accurate,
 *   follow imports like `stencil build`. complexTypes: report a prop, event or method whose
 *   `complexType` (`resolved`, `references`) cannot be computed as not ported (an error starting
 *   with `stencilrs:`); that member's `resolved` and `references` are then empty.
 * @returns {{ components: object[], diagnostics: object[] }}
 */
export const analyze = (source, fileName, options = {}) =>
  native.analyze(source, fileName, options.resolveImports ?? false, options.complexTypes ?? false);

/**
 * Generate a component module, what Stencil's transpileSync emits.
 *
 * `componentExport` picks the output, as in Stencil: `'customelement'` (default, what
 * @stencil/unplugin uses), `'module'` (the class stays exported and is registered with
 * `proxyCustomElement`) or `'lazy'` (the lazy-loading `loader-bundle` shape; Stencil spells it
 * `null`, which is accepted too) or `'ssr'` (Stencil's hydrate / server-side rendering shape: the class stays
 * exported, with static `style` and `cmpMeta`; `coreImportPath` defaults to `@stencil/core/runtime/server`).
 * Decorated base classes and mixins are not ported for `'lazy'` and `'ssr'`:
 * those files report an error starting with `stencilrs:`, the signal to compile with Stencil.
 *
 * `componentMetadata: 'compilerstatic'` adds the compiler's metadata to each class as
 * `static get COMPILER_META()`, which `newSpecPage` registers components from. With
 * `componentExport: null`, `coreImportPath: '@stencil/core/testing'` and `style: null` it is
 * what @stencil/unplugin's `spec-page` mode compiles. The metadata carries the JSDoc and the
 * `complexType` of members; with `complexTypes` (on by default here) a type stencilrs cannot
 * resolve without the type checker is an error starting `stencilrs:`, the cue to use Stencil.
 * `style: null` leaves styles out (Stencil's option; the default `'static'` keeps them).
 * @param {string} source module source (TS/TSX)
 * @param {{ file: string, componentExport?: 'customelement' | 'module' | 'lazy' | 'ssr' | null, componentMetadata?: 'compilerstatic' | null, style?: 'static' | null, coreImportPath?: string, jsx?: 'classic' | 'automatic', jsxImportSource?: string, resolveImports?: boolean, complexTypes?: boolean, sourceMap?: boolean, transformAsBaseClass?: boolean }} options
 * @returns {{ code: string, map: string | null, components: object[], diagnostics: object[], baseClasses: string[] }}
 */
export const transpile = (source, options) => {
  const { style, componentMetadata, ...rest } = options;
  return native.transpile(source, {
    ...rest,
    ...(options.componentExport === null ? { componentExport: 'lazy' } : {}),
    ...(componentMetadata ? { componentMetadata, complexTypes: options.complexTypes ?? true } : {}),
    ...(style === null ? { emitStyles: false } : {}),
  });
};

/** Reprint JavaScript through one printer, comments dropped, to compare outputs. */
export const normalize = (code) => native.normalize(code);

/**
 * Stencil's `scopeCss`: CSS rewritten for a `scoped` component.
 * @param {string} css
 * @param {string} scopeId `sc-<tag>`, plus `-<mode>` for a named mode
 * @param {boolean} [commentOriginalSelector] what the runtime passes; the compiler passes false
 * @returns {string}
 */
export const scopeCss = (css, scopeId, commentOriginalSelector = false) => native.scopeCss(css, scopeId, commentOriginalSelector);

/**
 * Stencil's `foldBuildFlags`: replace `Build.<flag>` reads, where `Build` is a named import from
 * `@stencil/core`, with the boolean literals in `flags`, so a bundler can drop the gated branches.
 * Each replacement is padded to the original length, so a source map for `code` stays valid.
 * Flags left out of `flags` are not folded.
 * @param {string} code JS or TS source
 * @param {string} fileName picks the parser (`.tsx`, `.ts`, `.jsx`, else JavaScript)
 * @param {Record<string, boolean>} flags e.g. `{ isBrowser: true, isServer: false }`
 * @returns {string | null} the folded code, or null if nothing was folded
 */
export const foldBuildFlags = (code, fileName, flags) => native.foldBuildFlags(code, fileName, flags);
