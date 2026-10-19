// The two bundles the server-render smoke test needs, both from components stencilrs compiled:
//
//   node ssr/build.mjs
//
//   dist/hydrate/index.js          the hydrate app (`componentExport: 'ssr'`), with the
//                                  `renderToString` / `hydrateDocument` API of Stencil's `ssr`
//                                  output target (`stencil build` with `{ type: 'ssr' }`)
//   dist/hydrate-client/components.js
//                                  the client bundle that hydrates what the app rendered: every
//                                  component and its dependencies in one module (no bare imports,
//                                  so a browser or happy-dom can load it as it is)
//
// Stencil assembles it in two Rolldown passes, which this repeats with the same pieces
// (`output-targets/ssr/generate-ssr-app.ts`): the components and the server runtime become one
// CommonJS body, wrapped in `ssrFactory(window, ...)` so they see each render's window as their
// globals; then the runner (`@stencil/core/runtime/server/runner`) is bundled with that factory.
// Only the first pass differs: stencilrs' Vite plugin compiles the components, not Stencil.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze } from '@popcorn245/stencilrs';
import stencilrs from '@popcorn245/stencilrs/vite';
import { rolldown } from 'rolldown';
import { build } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'node_modules/@stencil/core');
const FACTORY_ID = '@stencil/core/runtime/server/ssr-factory';
const APP_DATA_ID = '@stencil/core/app-data';

const alias = {
  '@popcorn245/cards-core': join(root, 'vendor/cards-core/index.ts'),
  '@popcorn245/floorplan-core': join(root, 'vendor/floorplan-core/index.ts'),
};

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

/** `getSsrBuildConditionals` (output-targets/ssr/ssr-build-conditionals.ts), over the defaults of every feature on. */
const SSR_BUILD = {
  slotRelocation: true, lazyLoad: true, hydrateServerSide: true, hydrateClientSide: true, isDebug: false, isDev: false,
  isTesting: false, devTools: false, lifecycleDOMEvents: false, profile: false, hotModuleReplacement: false, updatable: true,
  member: true, constructableCSS: false, asyncLoading: true, lightDomPatches: false, slotChildNodes: false, slotCloneNode: false,
  slotDomMutations: false, slotTextContent: false, cssAnnotations: true,
};

/** `SSR_FACTORY_INTRO` / `SSR_FACTORY_OUTRO`, which Stencil does not export: lifted from its compiler chunk. */
const factoryWrapper = () => {
  const dist = join(core, 'dist');
  const chunk = readdirSync(dist).find((f) => /^compiler-[\w-]+\.mjs$/.test(f));
  const text = readFileSync(join(dist, chunk), 'utf8');
  const start = text.indexOf('const HYDRATE_APP_CLOSURE_START');
  const end = text.indexOf('//#endregion', text.indexOf('const SSR_FACTORY_OUTRO'));
  if (start < 0 || end < start) throw new Error('SSR_FACTORY_INTRO not found in the @stencil/core compiler chunk; has its layout changed?');
  return new Function(`${text.slice(start, end)}\nreturn { SSR_FACTORY_INTRO, SSR_FACTORY_OUTRO, MODE_RESOLVER_DECLARATION };`)();
};

/** Components as `generateSsrFactoryEntry` registers them: one import per class, sorted by class name. */
const factoryEntry = () => {
  const files = walk(join(root, 'src')).filter((f) => f.endsWith('.tsx') && !/\.(spec|stories)\.tsx$/.test(f));
  const cmps = files
    .flatMap((file) => analyze(readFileSync(file, 'utf8'), file).components.map((c) => ({ file, className: c.componentClassName })))
    .sort((a, b) => a.className.localeCompare(b.className));
  return [
    `import { ssrApp, registerComponents, setTagTransformer } from '@stencil/core/runtime/server';`,
    ...cmps.map((c, i) => `import { ${c.className} as C${i} } from ${JSON.stringify(c.file)};`),
    `setTagTransformer((tag) => $stencilTagTransform.transformTag(tag));`,
    `registerComponents([${cmps.map((_, i) => `C${i}`).join(', ')}]);`,
    `export { ssrApp };`,
  ].join('\n');
};

/** First pass: the components compiled by stencilrs plus the server runtime, one CommonJS body. */
const buildFactory = async () => {
  // Vite resolves an entry on disk: the ignored `.lib/` folder, as `vite.lib.config.ts` uses.
  const entry = join(root, '.lib/ssr-factory-entry.mjs');
  mkdirSync(dirname(entry), { recursive: true });
  writeFileSync(entry, factoryEntry());
  const result = await build({
    root,
    configFile: false,
    logLevel: 'warn',
    resolve: { alias },
    ssr: { noExternal: true },
    plugins: [
      stencilrs({ componentExport: 'ssr' }),
      {
        name: 'ssr-factory',
        enforce: 'pre',
        resolveId: (id) => (id === APP_DATA_ID ? '\0ssr-app-data' : null),
        load(id) {
          // The runtime's defaults, with the ssr build's conditionals (`appDataPlugin`).
          if (id === '\0ssr-app-data') {
            return `import { BUILD as DEFAULTS, Env, NAMESPACE } from ${JSON.stringify(join(core, 'dist/app-data/index.js'))};
export const BUILD = { ...DEFAULTS, ...${JSON.stringify(SSR_BUILD)} };
export { Env, NAMESPACE };`;
          }
          return null;
        },
      },
    ],
    build: {
      ssr: entry,
      write: false,
      minify: false,
      rollupOptions: { output: { format: 'cjs', esModule: false, strict: false, codeSplitting: false } },
    },
  });
  const output = [result].flat()[0].output;
  return output.find((o) => o.type === 'chunk').code;
};

/** Second pass: the runner, bundled with the factory (`generateSsrApp`), then `postProcessSsrCode`. */
const buildRunner = async (factory) => {
  const { SSR_FACTORY_INTRO, SSR_FACTORY_OUTRO, MODE_RESOLVER_DECLARATION } = factoryWrapper();
  const bundle = await rolldown({
    input: join(core, 'dist/runtime/server/runner.mjs'),
    external: ['node:stream'],
    treeshake: false,
    plugins: [
      {
        name: 'ssrAppPlugin',
        resolveId: (id) => (id === FACTORY_ID ? FACTORY_ID : id === APP_DATA_ID ? join(core, 'dist/app-data/index.js') : null),
        load: (id) => (id === FACTORY_ID ? SSR_FACTORY_INTRO + factory + SSR_FACTORY_OUTRO : null),
        // The factory declares `modeResolver` once, for the runtime and the components alike.
        transform: (code) => (code.includes(`const ${MODE_RESOLVER_DECLARATION}`) ? code.replaceAll(`const ${MODE_RESOLVER_DECLARATION}`, '') : null),
      },
    ],
  });
  const { output } = await bundle.generate({ format: 'esm', file: 'index.js' });
  let code = output.find((o) => o.type === 'chunk').code;
  code = code.replace(`//! let ${MODE_RESOLVER_DECLARATION}`, `let ${MODE_RESOLVER_DECLARATION}`);
  // The factory entry reaches the tag transformer through this object.
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
  return code;
};

/** The client bundle: `vite.lib.config.ts`'s entry, with the third-party libraries bundled in. */
export const buildClient = async (outDir = join(root, 'dist/hydrate-client')) => {
  const files = walk(join(root, 'src')).filter((f) => f.endsWith('.tsx') && !/\.(spec|stories)\.tsx$/.test(f));
  const entry = join(root, '.lib/ssr-client-entry.mjs');
  mkdirSync(dirname(entry), { recursive: true });
  writeFileSync(entry, files.map((f) => `import ${JSON.stringify(f)};`).join('\n') + '\n');
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    resolve: { alias },
    plugins: [stencilrs()],
    build: { outDir, emptyOutDir: true, lib: { entry, formats: ['es'], fileName: 'components' } },
  });
  return join(outDir, 'components.js');
};

export const buildHydrate = async (outDir = join(root, 'dist/hydrate')) => {
  const code = await buildRunner(await buildFactory());
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.js'), code);
  return join(outDir, 'index.js');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const file of [await buildHydrate(), await buildClient()]) {
    console.log(`${relative(root, file)} (${(statSync(file).size / 1024).toFixed(0)} kB)`);
  }
}
