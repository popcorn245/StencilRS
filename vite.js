// Vite plugin: Stencil v5 components compiled by stencilrs.
//
//   import stencilrs from '@popcorn245/stencilrs/vite';
//   export default defineConfig({ plugins: [stencilrs()] });
//
// stencilrs replaces the two steps @stencil/unplugin spends its time in: `transpileSync` on
// each component file, and the component stylesheets (Sass/Less, PostCSS, lightningcss, then
// the Rust `scopeCss`; see vite-css.js), and folds `Build.isBrowser` / `Build.isServer`. Neither
// `@stencil/unplugin` nor `@stencil/core/compiler` (which loads TypeScript, ~700 ms) is imported
// until something needs it (vite-fallback.js): a file that uses something stencilrs has not
// ported yet (serializers, @AttachInternals, …) is compiled by Stencil's own compiler through
// @stencil/unplugin. So are `docs`, `types`, `include` / `exclude`, and the virtual global
// stylesheets (`@import 'stencil-hydrate'`). Pass `{ fallback: false }` to make a file that
// needs the fallback an error instead. What @stencil/unplugin does, and where it went, is in
// docs/vite-plugin.md.
//
// `componentExport: 'ssr'` compiles the components for Stencil's hydrate (server-side rendering)
// runtime instead, `export class` with a static `cmpMeta` (see the ui-kit's `ssr-smoke.mjs`).
// `stencilrs({ dts: true })` writes `components.d.ts` beside the build output (element interfaces,
// `HTMLElementTagNameMap`, typed custom events, JSX `IntrinsicElements`), what `stencil build`'s
// `types` output is for a library; see vite-types.js. (`types` is @stencil/unplugin's own option.)
// The default, `'customelement'`, is the Vite / Vitest / Storybook shape.
//
// `stencilrs({ mode: 'spec-page' })` (or `stencilrsSpecPage()`) is @stencil/unplugin's spec-page
// mode: components compile for Stencil's `newSpecPage` (lazy output with `COMPILER_META`, the
// core from `@stencil/core/testing`), for Vitest. See `docs/pipeline.md`.
//
// Inheritance works as in @stencil/unplugin: a component's ancestors (`extends Base`,
// `extends Mixin(a, b)`) are read for their members, and the files they live in are served as
// virtual modules compiled with `transformAsBaseClass`, so a base class extends `HTMLElement`.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { buildId, foldBuildFlags, transpile, transpileAsync } from './index.js';
import { generateTypes } from './vite-types.js';
import { createTypecheck, formatFailure } from './vite-typecheck.js';
import { STENCIL_CSS_PREFIX, createCssPipeline, parseStencilCssId, resolveStencilCss } from './vite-css.js';
import { STYLE_FILE_RE, createFallback, mentionsVirtualGlobalImport, scanStyleFiles, scanStyleFilesAsync, virtualGlobalAlias } from './vite-fallback.js';

const DECORATORS_RE = /(@Component|@Prop|@State|@Event|@Method|@Watch|@Listen)\s*[(\s]/;
// A decorator that starts a line or statement: not the `@Component` in a doc comment.
const REAL_DECORATOR_RE = /(?:^|[;{}])[ \t]*@(?:Component|Prop|State|Event|Method|Watch|Listen|Element)\b/m;
const IMPORTS_H_RE = /import\s+\{[^}]*\bh\b[^}]*\}\s+from\s+['"]@stencil\/core['"]/;
const SIGNALS_IMPORT_RE = /from\s+['"]@stencil\/core\/signals['"]/;
const APP_DATA_ID = '@stencil/core/app-data';
const BASE_PREFIX = '\0stencilrs-base:';
const STENCIL_BASE_URL = 'new URL(".", import.meta.url)';
const STENCIL_DIST_RE = /\/node_modules\/@stencil\/core\/dist\/.+\.m?js$/;
// What the compiled components import their runtime from (the `h`, `Host`, ... of every component file).
const RUNTIME_ID = '@stencil/core/runtime/client/standalone';
// Folders at the project root that `stencil build` writes build output and caches into (`www`, `dist`,
// `loader`, `hydrate`, `.stencil`) and Vitest's cache and attachments (`.vitest`). Never source: Stencil's source lives in `src/`. The dev server's file
// watcher (chokidar) opens one `fs.watch` per file under the root, ~0.9 ms each on Windows, and a project
// that has been built holds thousands of them: skipped, see `watchIgnore`.
const DEFAULT_WATCH_IGNORE = ['.stencil', 'www', 'dist', 'loader', 'hydrate', '.vitest'];

/**
 * A `server.watch.ignored` matcher for the given folders directly under `root`: true for the folder and
 * everything below it. A function, not a glob, so that characters in the root path (`(`, `[`, `\\` on
 * Windows) need no escaping. Vite adds it to the user's own `ignored` and to its defaults.
 */
export function watchIgnoreMatcher(root, folders) {
  const base = resolve(root).replaceAll('\\', '/').replace(/\/+$/, '');
  const dirs = folders.map((f) => `${base}/${String(f).replaceAll('\\', '/').replace(/^\.?\/+|\/+$/g, '')}`);
  return (path) => {
    const p = String(path).replaceAll('\\', '/');
    return dirs.some((d) => p === d || p.startsWith(`${d}/`));
  };
}

/** @stencil/unplugin's `resolveSpecifier`, which stencilrs' ancestor walk mirrors. */
const resolveSpecifier = (specifier, importer) => {
  const base = resolve(dirname(importer), specifier);
  const candidates = [base, ...['.tsx', '.ts', '.js'].map((ext) => base + ext)];
  if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.ts', base.slice(0, -3) + '.tsx');
  const found = candidates.find((c) => existsSync(c) && statSync(c).isFile());
  return found ? found.replaceAll('\\', '/') : null;
};

/**
 * Whether every file a transpile read (`result.deps`: imported modules and tsconfigs, each with the
 * `<mtime ns>:<size>` stamp the native side saw, or null for a file that was absent) is as it was.
 * `stamps` memoises the stat calls of one build.
 */
const depsFresh = (deps, stamps) =>
  deps.every(([path, was]) => {
    let now = stamps.get(path);
    if (now === undefined) {
      const st = statSync(path, { bigint: true, throwIfNoEntry: false });
      now = st?.isFile() ? `${st.mtimeNs}:${st.size}` : null;
      stamps.set(path, now);
    }
    return now === was;
  });

/** tsconfig `jsx`, or @stencil/unplugin's heuristic: classic `h` when the file imports it. */
const jsxFor = (code, tsconfigJsx) => {
  if (tsconfigJsx?.jsx === 'react') return { jsx: 'classic' };
  if (tsconfigJsx?.jsx === 'react-jsx' || tsconfigJsx?.jsx === 'react-jsxdev') {
    return { jsx: 'automatic', jsxImportSource: tsconfigJsx.jsxImportSource ?? '@stencil/core' };
  }
  return IMPORTS_H_RE.test(code) ? { jsx: 'classic' } : { jsx: 'automatic', jsxImportSource: '@stencil/core' };
};

const readTsconfigOptions = (root) => {
  const path = join(root, 'tsconfig.json');
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(raw).compilerOptions ?? {};
  } catch {
    return {};
  }
};

const readTsconfigJsx = (root) => {
  const co = readTsconfigOptions(root);
  return co.jsx ? { jsx: String(co.jsx).toLowerCase(), jsxImportSource: co.jsxImportSource } : null;
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

/** What @stencil/unplugin's `mode: 'spec-page'` passes to `transpileSync` (transformStencil). */
const SPEC_PAGE_OPTIONS = {
  componentExport: null,
  componentMetadata: 'compilerstatic',
  coreImportPath: '@stencil/core/testing',
  style: null,
};

/**
 * @param {import('@stencil/unplugin').StencilPluginOptions & { buildFlags?: Record<string, boolean>, fallback?: boolean, watchIgnore?: false | string[], verbose?: boolean, css?: { targets?: string | string[] | Record<string, number> | false, minify?: boolean | 'whitespace', sass?: Record<string, unknown>, cache?: boolean | 'memory' }, dts?: boolean | { fileName?: string }, typecheck?: boolean | { tsconfig?: string, bin?: 'tsgo' | 'tsc' | 'tsrs' | 'tsc-rs' }, resolveImports?: boolean, componentExport?: 'customelement' | 'ssr' }} [options]
 *   dts (default false): emit `components.d.ts` with the build output. `true`, or `{ fileName }`,
 *   a path inside the output directory (default `components.d.ts`).
 *   typecheck (default false): run `tsgo` (else `tsc`) `--noEmit` against the project's tsconfig in a child process, beside the
 *   build; a type error fails the build. In dev and watch it runs in the background and logs. See vite-typecheck.js and the README.
 *   buildFlags: overrides for the runtime's `BUILD` flags, which `stencil build` computes from the project and a
 *   Vite build leaves at their defaults (all features on, `hydrateClientSide` too). A client-only library
 *   sets `{ hydrateClientSide: false }`, as `stencil build` does without a hydrate output target.
 *   css: the component stylesheet pipeline (vite-css.js). `targets`: the browsers lightningcss lowers for and
 *   prefixes: a browserslist query (string or array), lightningcss' targets object, or false for none; the default
 *   is what `stencil build`'s `autoprefixCss` targets. `minify`: true (lightningcss' own: shortens values), 'whitespace' (default in a build: what
 *   `stencil build` ships, values as authored), false (default in dev).
 *   `sass`: options for Sass' `compileString` (`silenceDeprecations`, `loadPaths`, `quietDeps`, ...).
 *   `cache` (default true): a stylesheet's result is reused while it and every file Sass loaded for it are unchanged (content hashes),
 *   so a watch rebuild recompiles only what an edit touched; the Sass step is also kept in node_modules/.cache/stencilrs. 'memory': no disk; false: none.
 *   resolveImports (default true): component metadata as a full `stencil build` computes it,
 *   following relative imports for prop types and defaults. false: exactly what Stencil's
 *   single-file transpileSync (and so @stencil/unplugin) produces.
 */
export function stencilrs(options = {}) {
  const { fallback = true, watchIgnore = DEFAULT_WATCH_IGNORE, verbose = false, dts = false, resolveImports = true, componentExport = 'customelement', buildFlags = {}, css: cssOptions = {}, typecheck = false, ...stencilOptions } = options;
  if (componentExport !== 'customelement' && componentExport !== 'ssr') {
    throw new Error(`[stencilrs] componentExport must be 'customelement' or 'ssr', got ${JSON.stringify(componentExport)}`);
  }
  const ssr = componentExport === 'ssr';
  const dtsFileName = dts ? (typeof dts === 'object' && dts.fileName) || 'components.d.ts' : null;
  // Component source files seen by this build, for the declaration file.
  const dtsSources = new Map();
  const specPage = stencilOptions.mode === 'spec-page';
  // Options that need @stencil/unplugin's project scan, or its file filter: it is loaded up
  // front, and compiles every TypeScript file we don't (as it did before it was lazy).
  const needsUnplugin = !!(stencilOptions.docs || stencilOptions.types || stencilOptions.include || stencilOptions.exclude);
  let foldFlags = !specPage;
  let isDev = stencilOptions.dev ?? false;
  let root = process.cwd();
  let tsconfigJsx = null;
  // A tsconfig with `useDefineForClassFields: false` (Stencil projects set it, so that a @Prop default is a
  // plain assignment) is honoured as Stencil does: stencilrs emits the initializers as constructor
  // assignments after `__registerHost()`. Left as class fields, Vite's own TypeScript transform (which
  // reads the same tsconfig) would move them into the constructor ahead of it, and no prop would keep
  // its default.
  let useDefineForClassFields = true;
  const fileToTag = new Map();
  // A watch rebuild runs `transform` for every module again, changed or not (Rolldown and Rollup both do).
  // What a component compiled to is kept, keyed by module id, and reused while the module's exact source and
  // every file the compile read (`resolveImports`: imported modules, tsconfigs) are unchanged. Only clean results
  // are kept (no diagnostics, not the fallback), so a reused one has nothing to replay but the result.
  const memo = new Map();
  // `fs.stat` results of the current build, for `depsFresh`.
  let stamps = new Map();
  const runtimeByDir = new Map();
  let buildStamps = false; // a dev server has no build boundary to reset them at
  // Per build (reset in `buildStart`): compiled now, reused from the memo, left to Stencil's compiler.
  const counts = { stencilrs: 0, reused: 0, stencil: 0 };
  // The project's stylesheets and whether each mentions a virtual global stylesheet import (see `scanStyleFiles`):
  // scanned on the first build that needs it, then kept up to date by `watchChange` / the dev server's watcher / `load`.
  let styleScan = null;
  // The dev server's scan runs in the background (see `buildStart`): a promise until it is done. Stylesheets wait for it in `load`.
  let styleScanPending = null;
  let isServe = false;
  // `typecheck`: a child-process `tsgo` / `tsc --noEmit` (vite-typecheck.js). A build starts it at `buildStart` and awaits it
  // before the bundle is written (after `components.d.ts` is written when `dts` is on); a dev server and a watch rebuild
  // run it in the background and log the verdict.
  const checker = createTypecheck(() => root, typecheck);
  let logger = null;
  let checkTimer = null;
  let deferCheck = false; // `dts` + a written build: the check starts in `writeBundle`
  let checkDev = false; // dev server or `vite build --watch`: report, never block
  const reportCheck = (r) => {
    if (!r || r.killed) return;
    if (r.ok) logger?.info(`[stencilrs] typecheck passed (${r.name})`, { timestamp: true });
    else logger?.error(formatFailure(r), { timestamp: true });
  };
  const checkInBackground = () => {
    checker.start().then(reportCheck, (e) => logger?.error(e.message, { timestamp: true }));
  };
  /** Await the running check; a type error fails the build with the checker's output. */
  const awaitCheck = async (ctx) => {
    const r = await checker.wait();
    if (r && !r.ok && !r.killed) ctx.error(formatFailure(r));
  };
  const stopCheck = () => {
    clearTimeout(checkTimer);
    checker.stop();
  };
  const TS_FILE_RE = /\.(?:[cm]?tsx?|json)$/;
  const styleKey = (file) => file.split('?')[0].replaceAll('\\', '/');
  const noteStyle = (file, event) => {
    if (!styleScan) return false;
    const key = styleKey(file);
    if (event === 'delete') {
      styleScan.delete(key);
      return false;
    }
    const mentions = mentionsVirtualGlobalImport(file);
    styleScan.set(key, mentions);
    return mentions;
  };
  // Files stencilrs compiled: @stencil/unplugin must not transform its output again.
  const handled = new Set();
  const fallbackPlugin = createFallback(stencilOptions, (id) => id.startsWith(BASE_PREFIX) || handled.has(id.split('?')[0].replaceAll('\\', '/')));
  // Files ancestor classes were read from, served as base-class virtual modules.
  const baseClasses = new Set();
  // Component stylesheets served here. `docs` reads @stencil/unplugin's stylesheet bookkeeping,
  // so with it the stylesheets stay with @stencil/unplugin.
  const serveCss = !stencilOptions.docs;
  const loadCss = serveCss ? createCssPipeline(cssOptions) : null;
  // For HMR, as @stencil/unplugin's cssFileToTagNames / cssRealToVirtualIds.
  const cssFileToTags = new Map();
  const cssFileToIds = new Map();
  const trackCss = (file, tag, id) => {
    if (!cssFileToTags.has(file)) cssFileToTags.set(file, new Set());
    cssFileToTags.get(file).add(tag);
    if (!cssFileToIds.has(file)) cssFileToIds.set(file, new Set());
    cssFileToIds.get(file).add(id);
  };

  /** The HMR modules for a changed component or stylesheet; undefined when the file is neither. */
  const hotUpdate = ({ file, server }) => {
    const tags = new Set(cssFileToTags.get(file));
    const tagName = fileToTag.get(file.replaceAll('\\', '/'));
    if (tagName) tags.add(tagName);
    if (!tags.size) return undefined;
    // A changed stylesheet: drop its modules, then reload the components that import it.
    for (const id of cssFileToIds.get(file) ?? []) {
      const mod = server.moduleGraph.getModuleById?.(id) ?? server.moduleGraph.idToModuleMap?.get(id);
      if (mod) server.moduleGraph.invalidateModule(mod, new Set(), Date.now(), true);
    }
    for (const tag of tags) server.ws.send({ type: 'custom', event: 'stencil:hmr', data: { tagName: tag } });
    return [];
  };

  /** @type {import('vite').Plugin} */
  const plugin = {
    name: '@popcorn245/stencilrs',
    // Before @stencil/unplugin and before Vite's own TSX transform.
    enforce: 'pre',

    // Vitest's fs module cache keys on source and config, not on this binary: add it.
    configureVitest({ defineCacheKeyGenerator }) {
      defineCacheKeyGenerator?.(() => `stencilrs:${buildId}`);
    },

    config(userConfig, env) {
      fallbackPlugin.remember('config', [userConfig, env]);
      const result = { resolve: { alias: [virtualGlobalAlias(userConfig, env)] } };
      // The dev server's startup scan reads source files, so it misses the imports the transform
      // injects (`app-data`, the runtime): pre-bundle them up front, or Vite finds them on the
      // first request and re-runs its optimizer. Only the client runtime of the default output
      // does this; ssr (`runtime/server`) and spec-page (`core/testing`) import others.
      // `optimizeDeps.noDiscovery`: Vite finds nothing on a request, so there is no re-run to avoid, and the user's `include`
      // is the whole list. Adding to it there makes `listen` wait for an optimizer run (behind the watcher's first crawl on
      // Windows) that the user turned off: ~1.4 s of the ui-kit's first response.
      if (env?.command === 'serve' && !ssr && !specPage && !userConfig.optimizeDeps?.noDiscovery) result.optimizeDeps = { include: [APP_DATA_ID, RUNTIME_ID] };
      // Stencil's output and cache folders are not watched (see DEFAULT_WATCH_IGNORE); `watchIgnore: false`
      // keeps them, an array of folder names replaces the list. Vite concatenates this with the user's
      // `server.watch.ignored` (a string, a function or an array) and its own defaults. `server.watch: null`
      // (the user turned the watcher off) is left alone.
      if (env?.command === 'serve' && watchIgnore && watchIgnore.length && userConfig.server?.watch !== null) {
        result.server = { watch: { ignored: [watchIgnoreMatcher(userConfig.root ?? process.cwd(), watchIgnore)] } };
      }
      return result;
    },

    configResolved(config) {
      fallbackPlugin.remember('resolved', config);
      isDev = stencilOptions.dev ?? config.command === 'serve';
      foldFlags = config.command === 'build' && !specPage;
      buildStamps = config.command === 'build';
      root = config.root;
      isServe = config.command === 'serve';
      logger = config.logger;
      deferCheck = !!dtsFileName && !specPage && !ssr && config.build.write !== false;
      tsconfigJsx = readTsconfigJsx(root);
      // TypeScript's own default, at the ES2022 target Stencil v5 emits: on.
      useDefineForClassFields = readTsconfigOptions(root).useDefineForClassFields !== false;
    },

    configureServer(server) {
      fallbackPlugin.remember('server', server);
      // A new stylesheet that imports a virtual global stylesheet: @stencil/unplugin generates it.
      // The Sass compiler process (sass-embedded) ends with the server.
      server.httpServer?.once('close', () => {
        stopCheck();
        void loadCss?.dispose();
      });
      if (checker.enabled) {
        // After a change to a TypeScript file or a tsconfig: once edits settle, and a run still going is killed for the new one.
        const recheck = (file) => {
          if (!TS_FILE_RE.test(file) || file.includes('/node_modules/') || file.includes('\\node_modules\\')) return;
          clearTimeout(checkTimer);
          checkTimer = setTimeout(checkInBackground, 300);
        };
        for (const event of ['add', 'change', 'unlink']) server.watcher.on(event, recheck);
      }
      server.watcher.on('add', async (file) => {
        if (!STYLE_FILE_RE.test(file)) return;
        const mentions = styleScan ? noteStyle(file, 'create') : mentionsVirtualGlobalImport(file);
        if (!fallbackPlugin.loaded && mentions) await fallbackPlugin.ensure(this);
      });
      server.watcher.on('change', (file) => void (STYLE_FILE_RE.test(file) && noteStyle(file, 'update')));
      server.watcher.on('unlink', (file) => void (STYLE_FILE_RE.test(file) && noteStyle(file, 'delete')));
    },

    // A watch rebuild: a stylesheet that changed is looked at again; the rest of the project is not.
    watchChange(id, change) {
      if (STYLE_FILE_RE.test(id)) noteStyle(id, change?.event);
    },

    async buildStart() {
      if (checker.enabled) {
        checkDev = isServe || !!this.meta?.watchMode;
        if (checkDev) checkInBackground();
        // `dts` writes components.d.ts with the output files: the check then starts once they are written (`writeBundle`).
        else if (!deferCheck) {
          try {
            await checker.prepare(); // no checker installed: fail now, with the clear error
          } catch (e) {
            this.error(e.message);
          }
          void checker.start();
        }
      }
      stamps = new Map();
      counts.stencilrs = counts.reused = counts.stencil = 0;
      if (buildStamps) loadCss?.newBuild();
      runtimeByDir.clear();
      if (fallbackPlugin.loaded) return void (await fallbackPlugin.call('buildStart', this, {}));
      // Stylesheets that import the virtual global stylesheets need them written before the build.
      if (!needsUnplugin && !styleScan && !styleScanPending && isServe) {
        // Dev: the first response does not wait for every stylesheet to be read. A stylesheet that is requested before the scan
        // is done waits for it (`load`), so a virtual global stylesheet import is still generated before it is needed.
        styleScanPending = scanStyleFilesAsync(root).then((found) => {
          for (const [k, v] of styleScan ?? []) found.set(k, v); // what the watcher reported meanwhile is newer
          styleScan = found;
          styleScanPending = null;
        });
        styleScanPending.catch(() => {});
        return;
      }
      if (!needsUnplugin) styleScan ??= scanStyleFiles(root);
      if (needsUnplugin || [...styleScan.values()].some(Boolean)) await fallbackPlugin.ensure(this);
    },

    async transform(code, id, transformOpts) {
      const file = id.split('?')[0].replaceAll('\\', '/');
      // Vite's `vite:asset-import-meta-url` would run `stripLiteral` over the whole 230 kB client runtime (about 250 ms of a cold
      // build) for its one `new URL(".", import.meta.url)`, to emit exactly this (the directory is no file, so the URL is kept).
      if (code.includes(STENCIL_BASE_URL) && !ssr && !transformOpts?.ssr && STENCIL_DIST_RE.test(file)) {
        return { code: code.replaceAll(STENCIL_BASE_URL, `new URL(".", '' + import.meta.url)`), map: null };
      }
      if (!/\.tsx?$/.test(file) || file.endsWith('.d.ts')) return null;
      if (file.includes('/node_modules/')) return null;
      // Left to Stencil's compiler (through @stencil/unplugin, loaded now if it was not):
      // it gets the file as it came in, and folds the build flags itself.
      const original = code;
      if (dtsFileName && !transformOpts?.ssr && !id.startsWith(BASE_PREFIX) && REAL_DECORATOR_RE.test(code)) dtsSources.set(file, code);
      const fallBack = async () => {
        await fallbackPlugin.ensure(this);
        return fallbackPlugin.call('transform', this, original, id, transformOpts);
      };
      if (!DECORATORS_RE.test(code)) {
        if (needsUnplugin) return fallbackPlugin.call('transform', this, code, id, transformOpts);
        // As @stencil/unplugin does in a production build: fold the flags in every TypeScript file.
        if (!foldFlags || transformOpts?.ssr || !code.includes('Build') || handled.has(file) || id.startsWith(BASE_PREFIX)) return null;
        const folded = foldBuildFlags(code, file, { isBrowser: true, isServer: false });
        return folded === null ? null : { code: folded, map: null };
      }

      // As @stencil/unplugin does for production client builds: fold `Build.isBrowser` /
      // `Build.isServer` so server-only code is tree-shaken.
      if (ssr) {
        if (code.includes('Build')) code = foldBuildFlags(code, file, { isBrowser: false, isServer: true }) ?? code;
      } else if (!isDev && !specPage && !transformOpts?.ssr && code.includes('Build')) {
        code = foldBuildFlags(code, file, { isBrowser: true, isServer: false }) ?? code;
      }

      const memoKey = `${id}\0${transformOpts?.ssr ? 1 : 0}`;
      const kept = memo.get(memoKey);
      if (kept && kept.source === original && depsFresh(kept.deps, buildStamps ? stamps : new Map())) {
        counts.reused++;
        handled.add(file);
        for (const base of kept.baseClasses) {
          baseClasses.add(base);
          this.addWatchFile(base);
        }
        fileToTag.set(file, kept.tagName);
        return kept.result;
      }

      const result = await transpileAsync(code, { file, resolveImports, componentExport, useDefineForClassFields, ...(specPage ? SPEC_PAGE_OPTIONS : {}), ...jsxFor(code, tsconfigJsx) });

      const unported = result.diagnostics.filter((d) => d.message.startsWith('stencilrs:'));
      if (unported.length) {
        const why = [...new Set(unported.map((d) => d.message.replace(/^stencilrs: /, '')))].join(' ');
        // Stencil's compiler through @stencil/unplugin would produce the client shape, not ssr's.
        if (!fallback || ssr) this.error(`[stencilrs] ${file}: ${why}`);
        counts.stencil++;
        if (verbose) this.info?.(`[stencilrs] ${file}: using Stencil's compiler (${why})`);
        return fallBack();
      }
      const errors = result.diagnostics.filter((d) => d.level === 'error');
      if (errors.length) this.error(`[stencilrs] transpile error in ${file}:\n${errors.map((d) => d.message).join('\n')}`);
      for (const d of result.diagnostics) this.warn(`[stencilrs] ${file}: ${d.message}`);

      // Base classes and mixins without @Component: Stencil's compiler handles those.
      if (!result.components.length) return REAL_DECORATOR_RE.test(original) ? fallBack() : null;
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
        ...buildFlags,
        ...(isDev && !ssr && !specPage ? { hotModuleReplacement: true, isDev: true } : {}),
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
      if (specPage) return { code: out, map }; // lazy output keeps the class exported; no HMR
      // customelement output drops the class's `export`; consumers import it by name. ssr keeps it.
      if (!ssr && !new RegExp(`^export\\s+(const|\\{[^}]*\\b${componentClassName}\\b)`, 'm').test(out)) {
        out += `\nexport { ${componentClassName} };`;
      }
      if (isDev && !ssr) out += hmrSnippet(tagName, componentClassName);
      const value = { code: out, map };
      if (result.diagnostics.length || !result.deps) memo.delete(memoKey);
      else memo.set(memoKey, { source: original, deps: result.deps, baseClasses: result.baseClasses, tagName, result: value });
      return value;
    },

    // An import of a file an ancestor lives in gets its base-class compilation instead
    // (@stencil/unplugin's `\0stencil-base:` modules). Components are compiled before their
    // imports resolve, so the set is filled in time.
    async resolveId(id, importer) {
      // As @stencil/unplugin: one platform instance for the whole test file.
      if (specPage && id === '@stencil/core') return this.resolve('@stencil/core/testing', importer, { skipSelf: true });
      // A file that is not a component (a util, a global script) importing `getMode`, `setMode`, `writeTask`,
      // `h`... from '@stencil/core' gets the runtime the compiled components use. `@stencil/core`'s own
      // entry is a separate, minimal client whose mode resolver, task queue and vdom state the components
      // never see (`stencil build` rewrites these imports the same way).
      if (id === '@stencil/core' && importer && !specPage && !ssr && !importer.startsWith('\0')) {
        // The same answer for every file of a folder: asked once per folder and build.
        const dir = dirname(importer);
        if (!runtimeByDir.has(dir)) runtimeByDir.set(dir, this.resolve(RUNTIME_ID, importer, { skipSelf: true }));
        return runtimeByDir.get(dir);
      }
      if (importer) {
        if (serveCss) {
          const css = resolveStencilCss(id, importer);
          if (css) return css;
        }
        if (baseClasses.size) {
          const from = importer.startsWith(BASE_PREFIX) ? importer.slice(BASE_PREFIX.length) : importer.split('?')[0];
          const abs = resolveSpecifier(id, from);
          if (abs && baseClasses.has(abs)) return BASE_PREFIX + abs;
        }
      }
      // The docs module, the virtual global stylesheets, the base classes it compiled itself.
      return fallbackPlugin.call('resolveId', this, id, importer);
    },

    async load(id) {
      // A stylesheet the scan has not seen (created since, and not reported by a watcher): it may be the first to import a
      // virtual global stylesheet, which has to be generated before it is compiled.
      const sheet = id.startsWith(STENCIL_CSS_PREFIX) ? parseStencilCssId(id).file : id.split('?')[0];
      if (styleScanPending && !fallbackPlugin.loaded && STYLE_FILE_RE.test(sheet)) {
        await styleScanPending;
        if (!fallbackPlugin.loaded && [...styleScan.values()].some(Boolean)) await fallbackPlugin.ensure(this);
      }
      if (styleScan && !fallbackPlugin.loaded) {
        if (STYLE_FILE_RE.test(sheet) && !styleScan.has(styleKey(sheet)) && noteStyle(sheet, 'create')) await fallbackPlugin.ensure(this);
      }
      if (serveCss && id.startsWith(STENCIL_CSS_PREFIX)) {
        const { file, tag } = parseStencilCssId(id);
        const css = await loadCss(id, isDev);
        if (!css) {
          // A step's package can't be loaded from here: @stencil/unplugin resolves it from its own place.
          await fallbackPlugin.ensure(this);
          return fallbackPlugin.call('load', this, id);
        }
        this.addWatchFile(file);
        if (tag) trackCss(file, tag, id);
        // Vite's own `addWatchFile` only hands files outside the root to the watcher (the root is watched already, minus the
        // ignored folders), so a dependency inside the root costs no `fs.watch`; it is still registered, because Vite links it to
        // this module for HMR and invalidation.
        for (const dep of css.deps) {
          this.addWatchFile(dep);
          if (tag) trackCss(dep, tag, id);
        }
        return { code: css.code, map: null };
      }
      if (!id.startsWith(BASE_PREFIX)) return fallbackPlugin.call('load', this, id);
      const file = id.slice(BASE_PREFIX.length);
      this.addWatchFile(file);
      const code = readFileSync(file, 'utf8');
      const result = transpile(code, { file, resolveImports, componentExport, useDefineForClassFields, transformAsBaseClass: true, ...jsxFor(code, tsconfigJsx) });
      if (result.diagnostics.some((d) => d.message.startsWith('stencilrs:'))) {
        if (!fallback || ssr) this.error(`[stencilrs] ${file}: ${result.diagnostics.map((d) => d.message).join(' ')}`);
        // As @stencil/unplugin's `transpileBaseClass`.
        const { transpileSync } = await import('@stencil/core/compiler');
        const st = transpileSync(code, { file, componentExport: 'customelement', styleImportData: 'queryparams', transformAsBaseClass: true });
        return { code: st.code, map: st.map ?? null };
      }
      const errors = result.diagnostics.filter((d) => d.level === 'error');
      if (errors.length) this.error(`[stencilrs] transpile error in ${file}:\n${errors.map((d) => d.message).join('\n')}`);
      return { code: result.code, map: result.map ? JSON.parse(result.map) : null };
    },

    async handleHotUpdate(ctx) {
      const mine = hotUpdate(ctx);
      // A stylesheet that starts importing a virtual global stylesheet: @stencil/unplugin generates it.
      if (!fallbackPlugin.loaded && STYLE_FILE_RE.test(ctx.file) && mentionsVirtualGlobalImport(ctx.file)) await fallbackPlugin.ensure(this);
      const theirs = await fallbackPlugin.call('handleHotUpdate', this, mine ? { ...ctx, modules: mine } : ctx);
      return theirs ?? mine;
    },

    async generateBundle(outputOptions) {
      // Before the bundle is written: a type error leaves no output. `dts` with a write waits for `writeBundle`.
      if (checker.enabled && !checkDev && !deferCheck) await awaitCheck(this);
      if (!dtsFileName || !dtsSources.size || specPage || ssr) return;
      const outDir = resolve(root, outputOptions.dir ?? dirname(outputOptions.file ?? 'dist/x.js'));
      const outFile = resolve(outDir, dtsFileName);
      const modules = [...dtsSources].map(([file, source]) => ({ file, source }));
      const { code, components, diagnostics } = generateTypes(modules, { outFile });
      for (const d of diagnostics) this.warn(`[stencilrs] types: ${d.file}: ${d.message}`);
      if (!components.length) return;
      this.emitFile({ type: 'asset', fileName: dtsFileName, source: code });
    },

    // `components.d.ts` is on disk now: check against it.
    async writeBundle() {
      if (!checker.enabled || checkDev || !deferCheck) return;
      try {
        await checker.prepare();
      } catch (e) {
        this.error(e.message);
      }
      void checker.start();
      await awaitCheck(this);
    },

    // A build is over: stop the Sass compiler process, which would keep the process alive. `vite build --watch` keeps it
    // for the next rebuild and stops it with the watcher (`closeWatcher`).
    async closeBundle() {
      if (!this.meta?.watchMode) {
        stopCheck(); // a build that failed elsewhere must not leave the checker running
        await loadCss?.dispose();
      }
    },

    async closeWatcher() {
      stopCheck();
      await loadCss?.dispose();
    },

    buildEnd() {
      if (verbose && counts.stencilrs + counts.reused + counts.stencil > 0) {
        this.info?.(`[stencilrs] compiled ${counts.stencilrs} component file(s), reused ${counts.reused}; ${counts.stencil} left to Stencil's compiler`);
      }
    },
  };

  return [plugin];
}

/** @stencil/unplugin's `stencilSpecPage`, compiled by stencilrs: for `newSpecPage` in Vitest. */
export const stencilrsSpecPage = (options = {}) => stencilrs({ ...options, mode: 'spec-page' });

export default stencilrs;
