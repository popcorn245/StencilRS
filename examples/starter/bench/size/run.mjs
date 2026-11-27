// Bundle size of the same tiny app (a counter: one prop, one state, a click handler, shadow DOM with a small
// style, plus a keyed list of 10 items) built for production with Vite, in several frameworks.
//
//   npm install && node run.mjs [name ...]      (names: stencil stencilrs stencilrs-default stencilrs-gated stencilrs-auto stencilrs-client lit solid svelte preact qwik)
//
// Prints raw / gzip / brotli of all JavaScript the page loads (the app has no CSS file: styles are in the JS).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { build } from 'vite';

const here = import.meta.dirname;
const need = async (name) => (await import(name)).default;

const stencilrsPlugin = async (options) => (await need('@popcorn245/stencilrs/vite'))(options);

const variants = {
  stencil: { dir: 'stencil', plugins: async () => [await stencilrsPlugin({ runtime: 'stencil' })] },
  // The whole runtime (`runtimeFeatures: false`).
  stencilrs: { dir: 'stencil', plugins: async () => [await stencilrsPlugin({ runtime: 'stencilrs', runtimeFeatures: false })] },
  // The plugin's default (`runtimeFeatures` not set: 'auto' while DEFAULT_RUNTIME_FEATURES is).
  'stencilrs-default': { dir: 'stencil', plugins: async () => [await stencilrsPlugin({ runtime: 'stencilrs' })] },
  // The same runtime with the features this app does not use compiled out (see docs/runtime.md).
  'stencilrs-gated': {
    dir: 'stencil',
    plugins: async () => [await stencilrsPlugin({ runtime: 'stencilrs', runtimeFeatures: { server: false, hydrate: false, resume: false, light: false, signals: false, vnode: false, hot: false } })],
  },
  // `runtimeFeatures: 'auto'` for this app (a shadow component, no signals, no h or spreads): no light DOM, signals, vnodes; hydration and resuming stay.
  'stencilrs-auto': { dir: 'stencil', plugins: async () => [await stencilrsPlugin({ runtime: 'stencilrs', runtimeFeatures: 'auto' })] },
  // `'client'`: auto for an app no server renders (no hydration, no resuming).
  'stencilrs-client': { dir: 'stencil', plugins: async () => [await stencilrsPlugin({ runtime: 'stencilrs', runtimeFeatures: 'client' })] },
  lit: { dir: 'lit' },
  solid: { dir: 'solid', plugins: async () => [(await need('vite-plugin-solid'))()] },
  svelte: {
    dir: 'svelte',
    plugins: async () => [(await import('@sveltejs/vite-plugin-svelte')).svelte({ compilerOptions: { customElement: true } })],
  },
  // Qwik 1 wants Vite 7: it builds in its own folder (npm install there), with its own Vite.
  qwik: { external: 'qwik' },
  preact: { dir: 'preact', config: { oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } } } },
};

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

// `features`: a `runtimeFeatures` object, to build the stencilrs variant with other features off (features.mjs).
export async function measure(name, { features, tag = name } = {}) {
  const v = features ? { dir: 'stencil', plugins: async () => [await stencilrsPlugin({ runtime: 'stencilrs', runtimeFeatures: features })] } : variants[name];
  const root = v.dir && join(here, 'apps', v.dir);
  const outDir = join(here, 'dist', tag);
  if (v.external) {
    const r = spawnSync('npx', ['vite', 'build'], { cwd: join(here, v.external), stdio: 'pipe', encoding: 'utf8' });
    if (r.status) throw new Error(`${v.external}: vite build failed: ${(r.stderr || r.stdout).split('\n')[0]}`);
  } else await build({
    root,
    configFile: false,
    logLevel: 'error',
    plugins: v.plugins ? await v.plugins() : [],
    ...v.config,
    build: { outDir, emptyOutDir: true, target: 'es2022', modulePreload: { polyfill: false } },
  });
  let raw = 0, gz = 0, br = 0;
  const files = [], parts = [];
  for (const f of walk(outDir).filter((f) => f.endsWith('.js'))) {
    const buf = readFileSync(f);
    raw += buf.length;
    gz += gzipSync(buf, { level: 9 }).length;
    br += brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
    files.push(f.slice(outDir.length + 1));
    parts.push([f.slice(outDir.length + 1), buf.length, gzipSync(buf, { level: 9 }).length]);
  }
  return { name, raw, gz, br, files, parts };
}

if (import.meta.filename === process.argv[1]) {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(variants);
  const kb = (n) => (n / 1024).toFixed(2).padStart(7);
  console.log('variant            raw KB  gzip KB  brotli KB');
  for (const name of names) {
    try {
      const r = await measure(name);
      if (r.parts.length > 1) for (const [f, raw, gz] of r.parts) console.log(`    ${f}: ${raw} raw, ${gz} gzip`);
      console.log(`${name.padEnd(16)} ${kb(r.raw)}  ${kb(r.gz)}   ${kb(r.br)}   (${r.files.length} js file${r.files.length === 1 ? '' : 's'}; ${r.raw} / ${r.gz} / ${r.br} bytes)`);
    } catch (e) {
      console.log(`${name.padEnd(16)} FAILED: ${String(e.message ?? e).split('\n')[0]}`);
    }
  }
  void statSync;
}
