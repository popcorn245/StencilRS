// Two things for Stencil's hydrate runner: `buildHydrate` (below) builds the hydrate app from stencilrs' output, and
// `fastSerializerPlugin` swaps mock-doc's HTML serializer for ssr-serializer.js at bundle time.
//
// fastSerializerPlugin
//
//   import { fastSerializerPlugin } from '@popcorn245/stencilrs/ssr';
//   rolldown({ input: '@stencil/core/runtime/server/runner', plugins: [fastSerializerPlugin(), ...] })
//
// The serializer lives inside the runner bundle (Stencil ships mock-doc inlined in
// `runtime/server/runner.mjs`, and a built hydrate app such as @ionic/core's carries its own copy),
// so there is no module to re-route. `patchSerializer` edits the text of the module that defines it:
// the original is renamed `serializeNodeToHtml$original` and a function of the old name, which every
// caller (outerHTML, innerHTML, `serializeDocumentToString`) already uses, forwards to the fast
// serializer with the original as its fallback. The fast serializer's source is inlined as it is,
// since a bundle that is already built can't resolve an import. node_modules is never touched.
//
// If the runner is not what this expects (Stencil renamed or restructured the function, or changed
// the id attribute the serializer reads), it throws rather than shipping the slow serializer
// unnoticed or, worse, a fast one that differs: bump it together with the differential test.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { analyze } from './index.js';
import { readCollections } from './ssr-collection.js';
import { runtimePatchesPlugin } from './ssr-patches.js';
import stencilrs from './vite.js';

const SOURCE = readFileSync(new URL('./ssr-serializer.js', import.meta.url), 'utf8');
const DEFINITION = 'function serializeNodeToHtml(';

const count = (text, needle) => text.split(needle).length - 1;

/** True for a module that defines mock-doc's serializer (what `patchSerializer` would patch). */
export const hasSerializer = (code) => code.includes(DEFINITION) && code.includes('function* streamToHtml(');

/**
 * @param code the text of the module that defines `serializeNodeToHtml`
 * @returns that module with the fast serializer in its place
 */
export const patchSerializer = (code) => {
  if (!hasSerializer(code)) throw new Error('stencilrs fast serializer: no `function serializeNodeToHtml(` next to `function* streamToHtml(` in this module; has mock-doc changed?');
  if (count(code, DEFINITION) !== 1) throw new Error(`stencilrs fast serializer: expected one \`${DEFINITION}\`, found ${count(code, DEFINITION)}`);
  // The fast serializer hardcodes the attribute Stencil's hydrate ids use.
  if (!code.includes('const HYDRATE_ID = "s-id";')) throw new Error('stencilrs fast serializer: `const HYDRATE_ID = "s-id"` not found; the id attribute changed, so update ssr-serializer.js and its test');
  const fast = SOURCE.replace('export function fastSerializeNodeToHtml(', 'function fastSerializeNodeToHtml(');
  if (fast === SOURCE) throw new Error('stencilrs fast serializer: ssr-serializer.js no longer exports fastSerializeNodeToHtml');
  return `${code.replace(DEFINITION, 'function serializeNodeToHtml$original(')}
//#region stencilrs fast serializer
const $stencilrsFastSerialize = (() => {
${fast}
return fastSerializeNodeToHtml;
})();
function serializeNodeToHtml(elm, serializationOptions = {}) {
	return $stencilrsFastSerialize(elm, serializationOptions, serializeNodeToHtml$original);
}
//#endregion
`;
};

/** A Rolldown/Rollup/Vite plugin that applies `patchSerializer`; it fails the build if nothing was patched. */
export const fastSerializerPlugin = () => {
  let patched = 0;
  return {
    name: 'stencilrs-fast-serializer',
    transform(code) {
      if (!hasSerializer(code)) return null;
      patched++;
      return { code: patchSerializer(code), map: null };
    },
    buildEnd() {
      if (patched === 0) throw new Error('stencilrs fast serializer: no module defining mock-doc\'s serializeNodeToHtml was bundled, so the slow serializer would ship; is this the hydrate runner?');
    },
  };
};

// ---- buildHydrate ----
//
// `buildHydrate`: the hydrate app of Stencil's `ssr` output target (`stencil build` with `{ type: 'ssr' }`), built
// from components stencilrs compiled. One ES module with the `renderToString` / `hydrateDocument` API of
// `@stencil/core/runtime/server/runner`, rendering every component on the server.
//
//   import { buildHydrate } from '@popcorn245/stencilrs/ssr';
//   await buildHydrate({ root: import.meta.dirname, outDir: 'dist/hydrate' });   // dist/hydrate/index.js
//
// Stencil assembles the app in two Rolldown passes (`output-targets/ssr/generate-ssr-app.ts`), repeated here with
// the same pieces. Only the first pass differs: stencilrs' Vite plugin compiles the components, not Stencil.
//
//   1. factory   the components (`componentExport: 'ssr'`) and the server runtime (`@stencil/core/runtime/server`) as
//                one CommonJS body, which is wrapped in `ssrFactory(window, ...)` (Stencil's `SSR_FACTORY_INTRO` /
//                `OUTRO`) so that they see each render's window as their globals.
//   2. runner    `@stencil/core/runtime/server/runner` bundled with that factory (its `ssr-factory` import), the
//                mock-doc window and the serializer included. `fastSerializerPlugin` is applied here (unless
//                `fastSerializer: false`), and `runnerPlugins` are more Rolldown plugins of this pass: how a module of
//                the runner bundle is replaced at build time.


const FACTORY_ID = '@stencil/core/runtime/server/ssr-factory';
const APP_DATA_ID = '@stencil/core/app-data';
const APP_GLOBALS_ID = '@stencil/core/app-globals';
const SERVER_ID = '@stencil/core/runtime/server';
const ENTRY_ID = '\0stencilrs-hydrate-entry';
const APP_DATA_VIRTUAL = '\0stencilrs-ssr-app-data';
const APP_GLOBALS_VIRTUAL = '\0stencilrs-ssr-app-globals';

/**
 * `getSsrBuildConditionals` (output-targets/ssr/ssr-build-conditionals.ts): what Stencil forces on, whatever the
 * project uses. The features it derives from the components (`getBuildFeatures`: `shadowDom`, `vdomRef`, ...) are
 * the runtime's defaults here, every feature on; `buildConditionals` overrides them.
 */
const SSR_BUILD = {
  slotRelocation: true, lazyLoad: true, hydrateServerSide: true, hydrateClientSide: true, isDebug: false, isDev: false,
  isTesting: false, devTools: false, lifecycleDOMEvents: false, profile: false, hotModuleReplacement: false, updatable: true,
  member: true, constructableCSS: false, asyncLoading: true, lightDomPatches: false, slotChildNodes: false, slotCloneNode: false,
  slotDomMutations: false, slotTextContent: false, cssAnnotations: true,
};

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** The package `name`, resolved from `root` as Node would (so a hoisted, linked or workspace install all work). */
const resolveFrom = (root, specifier) => createRequire(join(root, 'noop.js')).resolve(specifier);

/** The directory of `@stencil/core`, found from the project. */
const stencilCoreDir = (root) => {
  try {
    return dirname(resolveFrom(root, '@stencil/core/package.json'));
  } catch (cause) {
    throw new Error(`stencilrs/ssr: @stencil/core is not installed (looked from ${root})`, { cause });
  }
};

/** `rolldown`: a dependency of Vite 8, so not always resolvable from the project (pnpm): found through Vite when it is not. */
const loadRolldown = async (root) => {
  const req = createRequire(join(root, 'noop.js'));
  for (const from of [() => req.resolve('rolldown'), () => createRequire(req.resolve('vite/package.json')).resolve('rolldown')]) {
    try {
      return await import(pathToFileUrl(from()));
    } catch {}
  }
  throw new Error('stencilrs/ssr: rolldown was not found (it comes with vite >= 8, which has to be installed in the project)');
};
const pathToFileUrl = (p) => new URL(`file://${p.startsWith('/') ? '' : '/'}${p.replaceAll('\\', '/')}`).href;

/**
 * `SSR_FACTORY_INTRO` / `SSR_FACTORY_OUTRO` and the `modeResolver` declaration. Stencil does not export them, so they
 * are lifted out of its compiler chunk (`output-targets/ssr/ssr-factory-closure.ts`): the `const` run from its marker
 * to the end of its region, evaluated on its own. A layout change in a future Stencil is an error naming what was
 * looked for, never a silently wrong bundle.
 */
export const readFactoryWrapper = (core) => {
  const dist = join(core, 'dist');
  const chunks = readdirSync(dist).filter((f) => /^compiler(-[\w-]+)?\.mjs$/.test(f));
  const searched = chunks.length ? chunks.join(', ') : 'no compiler chunk';
  for (const chunk of chunks) {
    const text = readFileSync(join(dist, chunk), 'utf8');
    const start = text.indexOf('const HYDRATE_APP_CLOSURE_START');
    const outro = text.indexOf('const SSR_FACTORY_OUTRO');
    if (start < 0 || outro < start) continue;
    const end = text.indexOf('//#endregion', outro);
    if (end < outro) continue;
    try {
      const wrapper = new Function(`${text.slice(start, end)}\nreturn { SSR_FACTORY_INTRO, SSR_FACTORY_OUTRO, MODE_RESOLVER_DECLARATION };`)();
      if (typeof wrapper.SSR_FACTORY_INTRO === 'string' && typeof wrapper.SSR_FACTORY_OUTRO === 'string' && typeof wrapper.MODE_RESOLVER_DECLARATION === 'string') return wrapper;
    } catch {}
  }
  throw new Error(
    `stencilrs/ssr: Stencil's ssr factory wrapper (SSR_FACTORY_INTRO / SSR_FACTORY_OUTRO) was not found in ${join(dist, '<compiler chunk>')} (${searched}). ` +
      `The layout of this @stencil/core version has changed; stencilrs/ssr supports the version in its peerDependencies.`,
  );
};

/**
 * The components of `srcDir`: every `.tsx` file with a `@Component`, one entry per class, sorted by class name as
 * `generateSsrFactoryEntry` sorts them (`updateSsrComponents`).
 */
const discoverComponents = (files) =>
  files
    .flatMap((file) => analyze(readFileSync(file, 'utf8'), file).components.map((c) => ({ file, className: c.componentClassName, tagName: c.tagName })))
    .sort((a, b) => (a.className < b.className ? -1 : a.className > b.className ? 1 : 0));

const SOURCE_RE = /\.tsx$/;
const NOT_SOURCE_RE = /\.(spec|e2e|stories)\.tsx$/;

/** `generateSsrFactoryEntry`: one import per class, the tag transformer, `registerComponents`. */
const factoryEntry = (cmps) =>
  [
    `import { ssrApp, registerComponents, setTagTransformer } from '${SERVER_ID}';`,
    ...cmps.map((c, i) => `import { ${c.className} as C${i} } from ${JSON.stringify(c.file)};`),
    `setTagTransformer((tag) => $stencilTagTransform.transformTag(tag));`,
    `registerComponents([${cmps.map((_, i) => `C${i}`).join(', ')}]);`,
    `export { ssrApp };`,
  ].join('\n');

/** First pass: the components compiled by stencilrs plus the server runtime, one CommonJS body. */
const buildFactory = async (o) => {
  const { build } = await import('vite');
  const result = await build({
    root: o.root,
    configFile: false,
    logLevel: o.logLevel,
    resolve: { alias: o.alias },
    ssr: { noExternal: true },
    plugins: [
      {
        name: 'stencilrs-ssr-factory',
        enforce: 'pre',
        resolveId(id, importer) {
          if (id === ENTRY_ID) return ENTRY_ID;
          // A collection component's stylesheet and other relative imports are the original's neighbours.
          if (importer && o.origin.has(importer) && /^\.{1,2}\//.test(id)) return this.resolve(id, o.origin.get(importer), { skipSelf: true });
          if (o.virtual.has(id)) return id;
          if (id === APP_DATA_ID) return APP_DATA_VIRTUAL;
          if (id === APP_GLOBALS_ID) return APP_GLOBALS_VIRTUAL;
          // The ssr build's one runtime: `@stencil/core` imports of a file that is not a component (a util, the global
          // script) must reach the server runtime the components use, as `updateStencilCoreImports` rewrites them.
          if (id === '@stencil/core') return this.resolve(SERVER_ID, join(o.root, 'noop.js'), { skipSelf: true });
          return null;
        },
        load(id) {
          if (id === ENTRY_ID) return factoryEntry(o.cmps);
          if (o.virtual.has(id)) return o.virtual.get(id);
          // The runtime's defaults, with the ssr build's conditionals (`appDataPlugin`).
          if (id === APP_DATA_VIRTUAL) {
            return `import { BUILD as DEFAULTS, Env as DEFAULT_ENV, NAMESPACE as DEFAULT_NAMESPACE } from ${JSON.stringify(join(o.core, 'dist/app-data/index.js'))};
export const BUILD = { ...DEFAULTS, ...${JSON.stringify({ ...SSR_BUILD, ...o.buildConditionals })} };
export const Env = { ...DEFAULT_ENV, ...${JSON.stringify(o.env)} };
export const NAMESPACE = ${o.namespace == null ? 'DEFAULT_NAMESPACE' : JSON.stringify(o.namespace)};`;
          }
          // `appendGlobalScripts` / `appendGlobalStyles`: the global script runs at the start of each render.
          if (id === APP_GLOBALS_VIRTUAL) {
            return `${o.globalScript ? `import * as appGlobalScriptNs from ${JSON.stringify(o.globalScript)};
const appGlobalScript = appGlobalScriptNs.default || (() => {});
export const globalScripts = appGlobalScript;` : 'export const globalScripts = () => {};'}
export const globalStyles = ${JSON.stringify(o.globalStyles)};`;
          }
          return null;
        },
      },
      stencilrs({ ...o.pluginOptions, css: { ...(o.minifyCss ? { minify: 'stencil' } : {}), ...o.pluginOptions.css }, componentExport: 'ssr' }),
      ...o.plugins,
    ],
    build: {
      ssr: true,
      write: false,
      minify: false,
      rollupOptions: { input: ENTRY_ID, output: { format: 'cjs', esModule: false, strict: false, codeSplitting: false } },
    },
  });
  return [result].flat()[0].output.find((out) => out.type === 'chunk').code;
};

/** Second pass: the runner, bundled with the factory (`generateSsrApp`), then `postProcessSsrCode`. */
const buildRunner = async (factory, o) => {
  const { SSR_FACTORY_INTRO, SSR_FACTORY_OUTRO, MODE_RESOLVER_DECLARATION } = readFactoryWrapper(o.core);
  const { rolldown } = await loadRolldown(o.root);
  const bundle = await rolldown({
    input: join(o.core, 'dist/runtime/server/runner.mjs'),
    external: ['node:stream'],
    treeshake: false,
    plugins: [
      {
        name: 'ssrAppPlugin',
        resolveId: (id) => (id === FACTORY_ID ? FACTORY_ID : id === APP_DATA_ID ? join(o.core, 'dist/app-data/index.js') : null),
        load: (id) => (id === FACTORY_ID ? SSR_FACTORY_INTRO + factory + SSR_FACTORY_OUTRO : null),
        // The factory declares `modeResolver` once, for the runtime and the components alike.
        transform: (code) => (code.includes(`const ${MODE_RESOLVER_DECLARATION}`) ? code.replaceAll(`const ${MODE_RESOLVER_DECLARATION}`, '') : null),
      },
      ...(o.fastSerializer ? [fastSerializerPlugin()] : []),
      ...(o.runtimePatches === false ? [] : [runtimePatchesPlugin(o.runtimePatches)]),
      ...o.runnerPlugins,
    ],
  });
  const { output } = await bundle.generate({ format: 'esm', file: 'index.js', ...(o.preamble ? { banner: `/*!\n* ${o.preamble}\n*/` } : {}) });
  let code = output.find((out) => out.type === 'chunk').code;
  code = code.replace(`//! let ${MODE_RESOLVER_DECLARATION}`, `let ${MODE_RESOLVER_DECLARATION}`);
  // The factory entry reaches the tag transformer through this object.
  if (/function (setTagTransformer|transformTag)\(/.test(code)) {
    const at = Math.max(code.lastIndexOf('function transformTag('), code.lastIndexOf('function setTagTransformer('));
    if (at >= 0) {
      let depth = 0;
      let i = code.indexOf('{', at);
      for (; i < code.length; i++) {
        if (code[i] === '{') depth++;
        else if (code[i] === '}' && --depth === 0) break;
      }
      code = `${code.slice(0, i + 1)}\nvar $stencilTagTransform = { setTagTransformer: setTagTransformer, transformTag: transformTag };\n${code.slice(i + 1)}`;
    }
  }
  return code;
};

/**
 * Builds the hydrate app.
 *
 * @param {object} [options]
 * @param {string} [options.root] the project root: where `@stencil/core`, `vite` and `rolldown` are resolved from, and Vite's root. Default `process.cwd()`.
 * @param {string} [options.srcDir] the folder searched for components (a `.tsx` with a `@Component`; specs and stories are skipped). Default `src`, under `root`.
 * @param {string[]} [options.components] the component files, instead of searching `srcDir`.
 * @param {string[]} [options.collections] packages whose Stencil collection components are part of the app (`['ionicons']`), as Stencil's `ssr` target includes the collections the project imports.
 * @param {string} [options.outDir] writes `<outDir>/index.js`; leave it out to get the code only.
 * @param {string} [options.namespace] Stencil's `fsNamespace` (`NAMESPACE` of the runtime): the config's `namespace`, lower-cased.
 * @param {string} [options.globalScript] the global script (Stencil's `globalScript`), run at the start of each render.
 * @param {string} [options.globalStyles] CSS added to every render (the `global-style` targets of Stencil with `inject: 'all'`).
 * @param {string} [options.preamble] Stencil's `preamble`, as a banner comment.
 * @param {Record<string, string> | Array<{ find: string | RegExp, replacement: string }>} [options.alias] Vite `resolve.alias` of the component build.
 * @param {Record<string, boolean>} [options.buildConditionals] overrides of the runtime's `BUILD` flags, over Stencil's ssr conditionals.
 * @param {Record<string, unknown>} [options.env] Stencil's `env`.
 * @param {object} [options.stencilrs] options of the stencilrs Vite plugin (`componentExport` is always `'ssr'`).
 * @param {import('vite').Plugin[]} [options.plugins] more Vite plugins for the component build (a CSS fix, a resolver).
 * @param {boolean} [options.minifyCss] minify component styles with Stencil's own minifier, as `stencil build` does (its `minifyCss`, on outside dev mode): scope, autoprefix and minify in Stencil's order (the plugin's `css.minify: 'stencil'`). Default `true`; `false` keeps what the plugin's `css` options give.
 * @param {boolean} [options.fastSerializer] swap mock-doc's serializer for `ssr-serializer.js` (`fastSerializerPlugin`). Default `true`; `false` keeps Stencil's own.
 * @param {boolean | Record<string, boolean>} [options.runtimePatches] the byte-identical speed patches of `ssr-patches.js` (attribute lookups, selector parse cache, CSS rewrite cache, ...), applied to the runner and factory text at bundle time. Default `true`; `false` keeps Stencil's own code; `{ cssCache: false }` opts one out.
 * @param {object[]} [options.runnerPlugins] Rolldown plugins of the second pass, which bundles the runner: replace a module
 *   of the runner bundle (mock-doc's serializer, for example) with `resolveId` / `load` / `transform`.
 * @param {string} [options.logLevel] Vite's, default `'warn'`.
 * @returns {Promise<{ code: string, file: string | null, components: string[] }>} the app, where it was written, and the tags it renders.
 */
export const buildHydrate = async (options = {}) => {
  const root = resolve(options.root ?? process.cwd());
  const core = stencilCoreDir(root);
  const srcDir = resolve(root, options.srcDir ?? 'src');
  const files = options.components ?? walk(srcDir).filter((f) => SOURCE_RE.test(f) && !NOT_SOURCE_RE.test(f) && /@Component\s*\(/.test(readFileSync(f, 'utf8')));
  const cmps = discoverComponents(files.map((f) => resolve(root, f)));
  // Components of collections (`ionicons`' `ion-icon`): decorated source rebuilt from the compiled collection.
  const virtual = new Map();
  const origin = new Map();
  for (const c of readCollections(root, options.collections ?? [])) {
    virtual.set(c.file, c.code);
    origin.set(c.file, c.origin);
    const [meta] = analyze(c.code, c.file).components;
    cmps.push({ file: c.file, className: meta.componentClassName, tagName: meta.tagName });
  }
  cmps.sort((a, b) => (a.className < b.className ? -1 : a.className > b.className ? 1 : 0));
  if (!cmps.length) throw new Error(`stencilrs/ssr: no component found in ${options.components ? 'the given files' : srcDir}`);
  const o = {
    root,
    core,
    cmps,
    virtual,
    origin,
    alias: options.alias ?? {},
    namespace: options.namespace,
    globalScript: options.globalScript ? resolve(root, options.globalScript).replaceAll('\\', '/') : null,
    globalStyles: options.globalStyles ?? '',
    preamble: options.preamble,
    buildConditionals: options.buildConditionals ?? {},
    env: options.env ?? {},
    pluginOptions: options.stencilrs ?? {},
    plugins: options.plugins ?? [],
    minifyCss: options.minifyCss ?? true,
    fastSerializer: options.fastSerializer ?? true,
    runtimePatches: options.runtimePatches ?? true,
    runnerPlugins: options.runnerPlugins ?? [],
    logLevel: options.logLevel ?? 'warn',
  };
  const code = await buildRunner(await buildFactory(o), o);
  let file = null;
  if (options.outDir) {
    mkdirSync(resolve(root, options.outDir), { recursive: true });
    file = join(resolve(root, options.outDir), 'index.js');
    writeFileSync(file, code);
  }
  return { code, file, components: cmps.map((c) => c.tagName) };
};


export { createRenderCache } from './render-cache.js';
