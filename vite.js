// Vite plugin: Stencil v5 components compiled by stencilrs.
//
//   import stencilrs from '@popcorn245/stencilrs/vite';
//   export default defineConfig({ plugins: [stencilrs()] });
//
// stencilrs replaces the one step @stencil/unplugin spends its time in: `transpileSync` on
// each component file. Everything else (CSS modules and preprocessors, the runtime, build
// flags, docs, global stylesheets) is still @stencil/unplugin, which is added after this plugin.
//
// A file that uses something stencilrs has not ported yet (serializers, @AttachInternals, …)
// is left to @stencil/unplugin, which compiles it with Stencil's own compiler. Pass
// `{ fallback: false }` to make that an error instead.
//
// Inheritance works as in @stencil/unplugin: a component's ancestors (`extends Base`,
// `extends Mixin(a, b)`) are read for their members, and the files they live in are served as
// virtual modules compiled with `transformAsBaseClass`, so a base class extends `HTMLElement`.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { foldBuildFlags, transpileSync } from '@stencil/core/compiler';
import { stencilVite } from '@stencil/unplugin';

import { buildId, transpile } from './index.js';

const DECORATORS_RE = /(@Component|@Prop|@State|@Event|@Method|@Watch|@Listen)\s*[(\s]/;
const IMPORTS_H_RE = /import\s+\{[^}]*\bh\b[^}]*\}\s+from\s+['"]@stencil\/core['"]/;
const SIGNALS_IMPORT_RE = /from\s+['"]@stencil\/core\/signals['"]/;
const APP_DATA_ID = '@stencil/core/app-data';
const BASE_PREFIX = '\0stencilrs-base:';

/** @stencil/unplugin's `resolveSpecifier`, which stencilrs' ancestor walk mirrors. */
const resolveSpecifier = (specifier, importer) => {
  const base = resolve(dirname(importer), specifier);
  const candidates = [base, ...['.tsx', '.ts', '.js'].map((ext) => base + ext)];
  if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.ts', base.slice(0, -3) + '.tsx');
  const found = candidates.find((c) => existsSync(c) && statSync(c).isFile());
  return found ? found.replaceAll('\\', '/') : null;
};

/** tsconfig `jsx`, or @stencil/unplugin's heuristic: classic `h` when the file imports it. */
const jsxFor = (code, tsconfigJsx) => {
  if (tsconfigJsx?.jsx === 'react') return { jsx: 'classic' };
  if (tsconfigJsx?.jsx === 'react-jsx' || tsconfigJsx?.jsx === 'react-jsxdev') {
    return { jsx: 'automatic', jsxImportSource: tsconfigJsx.jsxImportSource ?? '@stencil/core' };
  }
  return IMPORTS_H_RE.test(code) ? { jsx: 'classic' } : { jsx: 'automatic', jsxImportSource: '@stencil/core' };
};

const readTsconfigJsx = (root) => {
  const path = join(root, 'tsconfig.json');
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const co = JSON.parse(raw).compilerOptions ?? {};
    return co.jsx ? { jsx: String(co.jsx).toLowerCase(), jsxImportSource: co.jsxImportSource } : null;
  } catch {
    return null;
  }
};

/** @stencil/unplugin's Vite HMR client snippet (transform.ts `buildHmrSnippet`). */
const hmrSnippet = (tagName, className) => {
  const tag = JSON.stringify(tagName);
  return (
    `\n${className}.__stencil_module__ = import.meta.url;` +
    `\nif (import.meta.hot && !import.meta.url.includes('s-hmr=')) {` +
    `\n  import.meta.hot.accept(() => {});` +
    `\n  import.meta.hot.on('stencil:hmr', function({ tagName }) {` +
    `\n    if (tagName === ${tag}) {` +
    `\n      var v = Date.now().toString(36);` +
    `\n      document.querySelectorAll(${tag}).forEach(function(el) { el['s-hmr'] && el['s-hmr'](v); });` +
    `\n    }` +
    `\n  });` +
    `\n}`
  );
};

/**
 * @param {import('@stencil/unplugin').StencilPluginOptions & { fallback?: boolean, verbose?: boolean, resolveImports?: boolean }} [options]
 *   resolveImports (default true): component metadata as a full `stencil build` computes it,
 *   following relative imports for prop types and defaults. false: exactly what Stencil's
 *   single-file transpileSync (and so @stencil/unplugin) produces.
 */
export function stencilrs(options = {}) {
  const { fallback = true, verbose = false, resolveImports = true, ...stencilOptions } = options;
  let isDev = stencilOptions.dev ?? false;
  let root = process.cwd();
  let tsconfigJsx = null;
  const fileToTag = new Map();
  const counts = { stencilrs: 0, stencil: 0 };
  // Files stencilrs compiled: @stencil/unplugin must not transform its output again.
  const handled = new Set();
  // Files ancestor classes were read from, served as base-class virtual modules.
  const baseClasses = new Set();

  /** @type {import('vite').Plugin} */
  const plugin = {
    name: '@popcorn245/stencilrs',
    // Before @stencil/unplugin and before Vite's own TSX transform.
    enforce: 'pre',

    // Vitest's fs module cache keys on source and config, not on this binary: add it.
    configureVitest({ defineCacheKeyGenerator }) {
      defineCacheKeyGenerator?.(() => `stencilrs:${buildId}`);
    },

    configResolved(config) {
      isDev = stencilOptions.dev ?? config.command === 'serve';
      root = config.root;
      tsconfigJsx = readTsconfigJsx(root);
    },

    transform(code, id, transformOpts) {
      const file = id.split('?')[0].replaceAll('\\', '/');
      if (!/\.tsx?$/.test(file) || file.endsWith('.d.ts')) return null;
      if (file.includes('/node_modules/')) return null;
      if (!DECORATORS_RE.test(code)) return null;

      // As @stencil/unplugin does for production client builds: fold `Build.isBrowser` /
      // `Build.isServer` so server-only code is tree-shaken.
      if (!isDev && !transformOpts?.ssr && code.includes('Build')) {
        code = foldBuildFlags(code, file, { isBrowser: true, isServer: false }) ?? code;
      }

      const result = transpile(code, { file, resolveImports, ...jsxFor(code, tsconfigJsx) });

      const unported = result.diagnostics.filter((d) => d.message.startsWith('stencilrs:'));
      if (unported.length) {
        const why = [...new Set(unported.map((d) => d.message.replace(/^stencilrs: /, '')))].join(' ');
        if (!fallback) this.error(`[stencilrs] ${file}: ${why}`);
        counts.stencil++;
        if (verbose) this.info?.(`[stencilrs] ${file}: using Stencil's compiler (${why})`);
        return null; // @stencil/unplugin compiles it
      }
      const errors = result.diagnostics.filter((d) => d.level === 'error');
      if (errors.length) this.error(`[stencilrs] transpile error in ${file}:\n${errors.map((d) => d.message).join('\n')}`);
      for (const d of result.diagnostics) this.warn(`[stencilrs] ${file}: ${d.message}`);

      // Base classes and mixins without @Component: Stencil's compiler handles those.
      if (!result.components.length) return null;
      counts.stencilrs++;
      handled.add(file);
      for (const base of result.baseClasses) {
        baseClasses.add(base);
        this.addWatchFile(base); // the component's inherited members come from it
      }

      const { tagName, componentClassName } = result.components[0];
      fileToTag.set(file, tagName);

      const overrides = {
        ...(SIGNALS_IMPORT_RE.test(code) ? { vdomSignals: true } : {}),
        ...(isDev ? { hotModuleReplacement: true, isDev: true } : {}),
      };
      const mutations = Object.entries(overrides)
        .map(([k, v]) => `__stencilBUILD.${k}=${v};`)
        .join('');
      let out = mutations ? `import{BUILD as __stencilBUILD}from"${APP_DATA_ID}";\n${mutations}\n${result.code}` : result.code;
      // Positions in the map are relative to the transpiled code: shift past the two lines put
      // in front. Lines appended below need nothing. (Like @stencil/unplugin, a map of a
      // flag-folded file points into the folded text, which differs only within those lines.)
      const map = result.map ? JSON.parse(result.map) : null;
      if (map && mutations) map.mappings = `;;${map.mappings}`;
      // customelement output drops the class's `export`; consumers import it by name.
      if (!new RegExp(`^export\\s+(const|\\{[^}]*\\b${componentClassName}\\b)`, 'm').test(out)) {
        out += `\nexport { ${componentClassName} };`;
      }
      if (isDev) out += hmrSnippet(tagName, componentClassName);
      return { code: out, map };
    },

    // An import of a file an ancestor lives in gets its base-class compilation instead
    // (@stencil/unplugin's `\0stencil-base:` modules). Components are compiled before their
    // imports resolve, so the set is filled in time.
    resolveId(id, importer) {
      if (!baseClasses.size || !importer) return null;
      const from = importer.startsWith(BASE_PREFIX) ? importer.slice(BASE_PREFIX.length) : importer.split('?')[0];
      const abs = resolveSpecifier(id, from);
      return abs && baseClasses.has(abs) ? BASE_PREFIX + abs : null;
    },

    load(id) {
      if (!id.startsWith(BASE_PREFIX)) return null;
      const file = id.slice(BASE_PREFIX.length);
      this.addWatchFile(file);
      const code = readFileSync(file, 'utf8');
      const result = transpile(code, { file, resolveImports, transformAsBaseClass: true, ...jsxFor(code, tsconfigJsx) });
      if (result.diagnostics.some((d) => d.message.startsWith('stencilrs:'))) {
        if (!fallback) this.error(`[stencilrs] ${file}: ${result.diagnostics.map((d) => d.message).join(' ')}`);
        // As @stencil/unplugin's `transpileBaseClass`.
        const st = transpileSync(code, { file, componentExport: 'customelement', styleImportData: 'queryparams', transformAsBaseClass: true });
        return { code: st.code, map: st.map ?? null };
      }
      const errors = result.diagnostics.filter((d) => d.level === 'error');
      if (errors.length) this.error(`[stencilrs] transpile error in ${file}:\n${errors.map((d) => d.message).join('\n')}`);
      return { code: result.code, map: result.map ? JSON.parse(result.map) : null };
    },

    handleHotUpdate({ file, server }) {
      const tagName = fileToTag.get(file.replaceAll('\\', '/'));
      if (!tagName) return undefined;
      server.ws.send({ type: 'custom', event: 'stencil:hmr', data: { tagName } });
      return [];
    },

    buildEnd() {
      if (verbose && counts.stencilrs + counts.stencil > 0) {
        this.info?.(`[stencilrs] compiled ${counts.stencilrs} component file(s); ${counts.stencil} left to Stencil's compiler`);
      }
    },
  };

  const stencil = [stencilVite(stencilOptions)].flat();
  for (const p of stencil) skipHandled(p, handled);
  return [plugin, ...stencil];
}

/** Make @stencil/unplugin's `transform` leave files stencilrs already compiled alone. */
function skipHandled(p, handled) {
  const hook = p.transform;
  if (!hook) return;
  const fn = typeof hook === 'function' ? hook : hook.handler;
  const wrapped = function (code, id, ...rest) {
    if (id.startsWith(BASE_PREFIX) || handled.has(id.split('?')[0].replaceAll('\\', '/'))) return null;
    return fn.call(this, code, id, ...rest);
  };
  p.transform = typeof hook === 'function' ? wrapped : { ...hook, handler: wrapped };
}

export default stencilrs;
