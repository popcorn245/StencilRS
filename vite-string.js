// `stringRenderer: true` (docs/vite-plugin.md): an SSR build with `runtime: 'stencilrs'` also writes the server bundle
// for the DOM-free string renderer (runtime-string.js), next to the happy-dom one:
//
//   dist/server/entry-server.js          imports the runtime (runtime.js), bundled: for happy-dom
//   dist/server/string/entry-server.js   the same components, importing '@popcorn245/stencilrs/runtime/string'
//
// `createRenderer(load, { renderer: 'string' })` (runtime-server.js) loads the second and falls back to the first.
// The second is built by a second `vite build` of the same config, in `writeBundle` of the first: this plugin's own
// copy in that build (it finds the marker plugin below) sends the runtime imports to the string runtime, which stays
// external, so the bundle and the renderer share one copy of it.
import { join } from 'node:path';

/** What the string variant's runtime imports resolve to: the package's own export, left to Node. */
export const STRING_RUNTIME_ID = '@popcorn245/stencilrs/runtime/string';
const MARKER = 'stencilrs:string-variant';
/** The subfolder of the SSR build's `outDir` that holds the string variant. */
export const STRING_DIR = 'string';

/** True in the second build. */
export const isStringVariant = (config) => config.plugins.some((p) => p.name === MARKER);

/** The runtime imports of the string variant. */
export const resolveStringRuntime = (id, importer) => (importer && (id === '@stencil/core' || id === '@popcorn245/stencilrs/runtime') ? { id: STRING_RUNTIME_ID, external: true } : null);

/** Builds the string variant of the SSR build `config` just wrote. */
export async function buildStringVariant(config) {
  const { build } = await import('vite');
  const inline = config.inlineConfig ?? {};
  await build({
    ...inline,
    root: config.root,
    configFile: inline.configFile ?? config.configFile ?? false,
    mode: config.mode,
    plugins: [...(inline.plugins ?? []), { name: MARKER }],
    build: { ...inline.build, ssr: config.build.ssr, outDir: join(config.build.outDir, STRING_DIR), emptyOutDir: false, watch: null },
  });
}
