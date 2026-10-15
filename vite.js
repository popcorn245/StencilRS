// Vite plugin: Stencil v5 components compiled by stencilrs.
//
//   import stencilrs from '@popcorn245/stencilrs/vite';
//   export default defineConfig({ plugins: [stencilrs()] });
//
// stencilrs replaces the one step @stencil/unplugin spends its time in: `transpileSync` on
// each component file. Everything else (CSS modules and preprocessors, the runtime, build
// flags, docs, global stylesheets) is still @stencil/unplugin, which is added after this plugin.
//
// A file that uses something stencilrs has not ported yet (inheritance, serializers,
// @AttachInternals, …) is left to @stencil/unplugin, which compiles it with Stencil's own
// compiler. Pass `{ fallback: false }` to make that an error instead.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { foldBuildFlags } from '@stencil/core/compiler';
import { stencilVite } from '@stencil/unplugin';

import { buildId, transpile } from './index.js';

const DECORATORS_RE = /(@Component|@Prop|@State|@Event|@Method|@Watch|@Listen)\s*[(\s]/;
const IMPORTS_H_RE = /import\s+\{[^}]*\bh\b[^}]*\}\s+from\s+['"]@stencil\/core['"]/;
const SIGNALS_IMPORT_RE = /from\s+['"]@stencil\/core\/signals['"]/;
const APP_DATA_ID = '@stencil/core/app-data';

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
 * @param {import('@stencil/unplugin').StencilPluginOptions & { fallback?: boolean, verbose?: boolean }} [options]
 */
export function stencilrs(options = {}) {
  const { fallback = true, verbose = false, ...stencilOptions } = options;
  let isDev = stencilOptions.dev ?? false;
  let root = process.cwd();
  let tsconfigJsx = null;
  const fileToTag = new Map();
  const counts = { stencilrs: 0, stencil: 0 };
  // Files stencilrs compiled: @stencil/unplugin must not transform its output again.
  const handled = new Set();

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

      const result = transpile(code, { file, ...jsxFor(code, tsconfigJsx) });

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
      // customelement output drops the class's `export`; consumers import it by name.
      if (!new RegExp(`^export\\s+(const|\\{[^}]*\\b${componentClassName}\\b)`, 'm').test(out)) {
        out += `\nexport { ${componentClassName} };`;
      }
      if (isDev) out += hmrSnippet(tagName, componentClassName);
      return { code: out, map: null };
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
    if (handled.has(id.split('?')[0].replaceAll('\\', '/'))) return null;
    return fn.call(this, code, id, ...rest);
  };
  p.transform = typeof hook === 'function' ? wrapped : { ...hook, handler: wrapped };
}

export default stencilrs;
