// The part of the Vite plugin that is still @stencil/unplugin, loaded only when something needs
// it. Importing `@stencil/unplugin` imports `@stencil/core/compiler`, which loads TypeScript
// (~700 ms), so vite.js neither imports them nor adds the plugin unless:
//   - a file falls back to Stencil's compiler (a feature stencilrs has not ported, or a base
//     class stencilrs does not compile), or
//   - an option needs its project scan: `docs`, `types`, `include`, `exclude`, or
//   - a stylesheet imports a virtual global stylesheet (`stencil-hydrate`,
//     `stencil-component-globals`, `stencil-css-components`), which it generates.
// Once loaded, the plugin is brought up to date by replaying the hooks that already ran (`config`,
// `configResolved`, `configureServer`, `buildStart`) and then called from vite.js's own hooks.
// The inventory of what @stencil/unplugin does, and which of it is where, is in docs/vite-plugin.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const VIRTUAL_GLOBAL_IMPORTS = ['stencil-hydrate', 'stencil-component-globals', 'stencil-css-components'];
const VIRTUAL_GLOBAL_ID_RE = new RegExp(`^(${VIRTUAL_GLOBAL_IMPORTS.join('|')})$`);
const VIRTUAL_GLOBAL_IMPORT_RE = new RegExp(`\\b(?:${VIRTUAL_GLOBAL_IMPORTS.join('|')})\\b`);
export const STYLE_FILE_RE = /\.(css|scss|sass|less|styl|stylus|pcss)$/;

/**
 * @stencil/unplugin's Vite alias for the virtual global stylesheets: Vite doesn't consult plugins
 * to resolve a CSS `@import`, so each name is aliased to the file the plugin generates for it.
 * The alias is only a path; nothing is generated until @stencil/unplugin is loaded.
 */
export const virtualGlobalAlias = (userConfig, env) => ({
  find: VIRTUAL_GLOBAL_ID_RE,
  replacement: join(resolve(userConfig.root ?? process.cwd(), 'node_modules', '.stencil', 'virtual-css', env.command), '$1.css'),
});

/** Does a stylesheet mention one of the virtual global stylesheet imports? */
export const mentionsVirtualGlobalImport = (file) => {
  try {
    return VIRTUAL_GLOBAL_IMPORT_RE.test(readFileSync(file, 'utf8'));
  } catch {
    return false;
  }
};

/**
 * Every stylesheet of the project (@stencil/unplugin's `projectUsesVirtualGlobalImports` is a text scan of these), with whether it mentions a virtual
 * global stylesheet import. Keys use forward slashes. The plugin keeps this across a watch build's rebuilds and updates it
 * from the changes it is told about, instead of walking and reading the whole project each time.
 */
export function scanStyleFiles(root) {
  const found = new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && STYLE_FILE_RE.test(abs)) found.set(abs.replaceAll('\\', '/'), mentionsVirtualGlobalImport(abs));
    }
  };
  if (existsSync(root)) walk(root);
  return found;
}

/**
 * `scanStyleFiles` without blocking the event loop: the dev server starts it at `buildStart` and does not wait for it, so the
 * first response does not pay for reading every stylesheet (~0.15 s on Windows for Ionic). Resolves to the same map.
 */
export async function scanStyleFilesAsync(root) {
  const found = new Map();
  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) return;
        const abs = join(dir, entry.name);
        if (entry.isDirectory()) return walk(abs);
        if (!entry.isFile() || !STYLE_FILE_RE.test(abs)) return;
        const mentions = await readFile(abs, 'utf8').then((text) => VIRTUAL_GLOBAL_IMPORT_RE.test(text), () => false);
        found.set(abs.replaceAll('\\', '/'), mentions);
      }),
    );
  };
  if (existsSync(root)) await walk(root);
  return found;
}

const fnOf = (hook) => (typeof hook === 'function' ? hook : hook?.handler);

/** Make @stencil/unplugin's `transform` leave alone the files `skip` says stencilrs compiled. */
function skipCompiled(p, skip) {
  const hook = p.transform;
  const fn = fnOf(hook);
  if (!fn) return;
  const wrapped = function (code, id, ...rest) {
    return skip(id) ? null : fn.call(this, code, id, ...rest);
  };
  p.transform = typeof hook === 'function' ? wrapped : { ...hook, handler: wrapped };
}

/**
 * @param {object} stencilOptions the options @stencil/unplugin is given
 * @param {(id: string) => boolean} skip ids its `transform` must leave to stencilrs
 */
export function createFallback(stencilOptions, skip) {
  /** What Vite has told the plugin so far, replayed to @stencil/unplugin when it loads. */
  const seen = { config: null, resolved: null, server: null };
  let plugins = [];
  let loading = null;
  let ready = false;

  const callAll = async (name, ctx, args) => {
    let result = null;
    for (const p of plugins) {
      const fn = fnOf(p[name]);
      const r = fn ? await fn.apply(ctx, args) : null;
      if (r != null && result == null) result = r;
    }
    return result;
  };

  const start = async (ctx) => {
    const { stencilVite } = await import('@stencil/unplugin');
    const loaded = [stencilVite(stencilOptions)].flat();
    for (const p of loaded) skipCompiled(p, skip);
    plugins = loaded;
    if (seen.config) await callAll('config', ctx, seen.config);
    if (seen.resolved) await callAll('configResolved', ctx, [seen.resolved]);
    if (seen.server) await callAll('configureServer', ctx, [seen.server]);
    await callAll('buildStart', ctx, [{}]);
  };

  return {
    /** Has @stencil/unplugin been loaded (and brought up to date)? */
    get loaded() {
      return ready;
    },
    remember(key, value) {
      seen[key] = value;
    },
    /** Load @stencil/unplugin on first use. `ctx` is the plugin context of the hook that needs it. */
    async ensure(ctx) {
      loading ??= start(ctx).then(() => {
        ready = true;
      });
      await loading;
    },
    /** Call a hook of @stencil/unplugin, if it is loaded. Resolves to its first non-null result. */
    async call(name, ctx, ...args) {
      if (!ready) return null;
      return callAll(name, ctx, args);
    },
  };
}
