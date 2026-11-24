// The project-wide part of the Vite plugin's `docs`, `types`, `include` and `exclude` options, which
// @stencil/unplugin does with Stencil's compiler (and so with TypeScript, ~700 ms): the file filter
// (`transformInclude`), the scan of the project's components, the manifest behind the `@stencil/unplugin/docs`
// virtual module, and `components.d.ts` in `srcDir`. The generators are in vite-docs.js; this is the
// bookkeeping around them, as unplugin's `project-scan.ts` and `component-types.ts` do it.
//
// Nothing here loads TypeScript while every component compiles in stencilrs. A file with something stencilrs
// does not port yet (a `stencilrs:` diagnostic) gets its metadata from Stencil's compiler, for that file only.
// What this cannot do (CSS-only components, a `stencil.config` it can not load) is reported by `unsupported`, and
// the plugin then hands `docs` / `types` to @stencil/unplugin as before.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { addGeneratedDocTags, cmpMetaToDocsComponent, collectStyleDocs, generateComponentTypesFile, generateManifest, hasComponentDecorator, normalizePath, stencilMeta, stencilrsMeta } from './vite-docs.js';

// ---- include / exclude (@rollup/pluginutils' `createFilter`, as @stencil/unplugin's `transformInclude` uses it) ----

/** A glob as picomatch reads it (`*`, `**`, `?`, `[a-z]`, `{a,b}`), as a regular expression over a `/` path. */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      let depth = 1;
      let j = i + 1;
      for (; j < glob.length && depth; j++) depth += glob[j] === '{' ? 1 : glob[j] === '}' ? -1 : 0;
      const inner = glob.slice(i + 1, j - 1);
      const parts = [];
      let start = 0;
      let d = 0;
      for (let k = 0; k <= inner.length; k++) {
        if (inner[k] === '{') d++;
        else if (inner[k] === '}') d--;
        else if ((inner[k] === ',' && d === 0) || k === inner.length) {
          parts.push(inner.slice(start, k));
          start = k + 1;
        }
      }
      re += `(?:${parts.map((p) => globToRegExp(p).source.slice(1, -1)).join('|')})`;
      i = j - 1;
    } else if (c === '[') {
      const end = glob.indexOf(']', i + 1);
      if (end < 0) re += '\\[';
      else {
        re += `[${glob[i + 1] === '!' ? '^' : ''}${glob.slice(glob[i + 1] === '!' ? i + 2 : i + 1, end)}]`;
        i = end;
      }
    } else re += c.replace(/[.+^$()|\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/**
 * `createFilter` of @rollup/pluginutils itself, which @stencil/unplugin filters with: found from where unplugin is
 * (it depends on it; resolving does not load unplugin), then from the working directory. Null when it is not installed.
 */
let pluginutilsCreateFilter;
function findCreateFilter() {
  if (pluginutilsCreateFilter !== undefined) return pluginutilsCreateFilter;
  pluginutilsCreateFilter = null;
  for (const base of [() => import.meta.resolve('@stencil/unplugin'), () => join(process.cwd(), 'noop.js'), () => import.meta.url]) {
    try {
      const { createFilter } = createRequire(base())('@rollup/pluginutils');
      if (typeof createFilter === 'function') {
        pluginutilsCreateFilter = createFilter;
        break;
      }
    } catch {}
  }
  return pluginutilsCreateFilter;
}

/**
 * `createFilter(include, exclude)`: a path passes when it matches `include` (all, if empty) and not `exclude`. This is
 * @rollup/pluginutils' own filter when it can be found, so every glob reads as it does for @stencil/unplugin; the
 * matcher written here (`globFileFilter`) covers `*`, `**`, `?`, `[a-z]` and `{a,b}` for an install without it.
 */
export function createFileFilter(include, exclude, base = process.cwd()) {
  const createFilter = findCreateFilter();
  if (!createFilter) return globFileFilter(include, exclude, base);
  const filter = createFilter(include, exclude, { resolve: base });
  return (id) => filter(id);
}

export function globFileFilter(include, exclude, base = process.cwd()) {
  const toList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const toMatcher = (pattern) => {
    if (pattern instanceof RegExp) {
      return (id) => {
        pattern.lastIndex = 0;
        return pattern.test(id);
      };
    }
    const normalized = String(pattern).replaceAll('\\', '/');
    const absolute = /^(?:\*\*|[A-Za-z]:\/|\/)/.test(normalized) ? normalized : posix.join(base.replaceAll('\\', '/'), normalized);
    const re = globToRegExp(absolute.replace(/^\.\//, ''));
    return (id) => re.test(id);
  };
  const includes = toList(include).map(toMatcher);
  const excludes = toList(exclude).map(toMatcher);
  return (id) => {
    if (typeof id !== 'string' || /\0/.test(id)) return false;
    const path = id.replaceAll('\\', '/');
    for (const m of excludes) if (m(path)) return false;
    for (const m of includes) if (m(path)) return true;
    return !includes.length;
  };
}

// ---- stencil.config ---------------------------------------------------------------------------------------------

const CONFIG_CANDIDATES = ['stencil.config.ts', 'stencil.config.mts', 'stencil.config.js', 'stencil.config.mjs'];
const STENCIL_CONFIG_KEYS = new Set(['namespace', 'srcDir', 'outputTargets', 'plugins', 'signalBacking', 'compat']);
const looksLikeConfig = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some((k) => STENCIL_CONFIG_KEYS.has(k));

/** jiti, which @stencil/unplugin loads `stencil.config.ts` with: from the project, or from where unplugin is. */
async function importJiti(root) {
  const tries = [() => createRequire(join(root, 'noop.js')).resolve('jiti'), () => createRequire(import.meta.resolve('@stencil/unplugin')).resolve('jiti')];
  for (const resolveJiti of tries) {
    try {
      return await import(pathToFileURL(resolveJiti()).href);
    } catch {}
  }
  return null;
}

/** The fields of the project's `stencil.config` that docs and types read (`srcDir`, `signalBacking`), or `undefined` if it can't be read. */
async function loadConfigSubset(root) {
  for (const name of CONFIG_CANDIDATES) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    const jiti = await importJiti(root);
    if (!jiti) return undefined;
    try {
      const mod = await jiti.createJiti(import.meta.url).import(path);
      const raw = mod.config ?? (looksLikeConfig(mod.default) ? mod.default : null);
      if (!raw || typeof raw !== 'object') return {};
      const result = {};
      if (raw.signalBacking === true) result.signalBacking = true;
      if (typeof raw.srcDir === 'string') result.srcDir = raw.srcDir;
      return result;
    } catch {
      return {};
    }
  }
  return {};
}

// ---- the project ---------------------------------------------------------------------------------------------

const isTsSourceFile = (abs) => (abs.endsWith('.tsx') || abs.endsWith('.ts')) && !abs.endsWith('.d.ts');

function collectFiles(dir, matches, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(abs, matches, out);
    else if (entry.isFile() && matches(abs)) out.push(abs);
  }
}

/** Resolve a package the way the project does (then from the working directory, then from here), and import it; null when it is not installed. */
async function importFromProject(name, root) {
  for (const base of [join(root, 'noop.js'), join(process.cwd(), 'noop.js'), import.meta.url]) {
    try {
      return await import(pathToFileURL(createRequire(base).resolve(name)).href);
    } catch {}
  }
  return null;
}

/**
 * The stylesheet tools `docs` needs: Sass and Less to compile a stylesheet (as unplugin's `compileCssForDocs`: no other
 * step), and postcss for a stylesheet with custom properties.
 */
function createStyleTools(getRoot) {
  let loading;
  let mods = null;
  const load = () =>
    (loading ??= (async () => {
      const unwrap = (m) => (m && m.default && !m.compileString && !m.render && !m.parse ? m.default : m);
      const sass = unwrap((await importFromProject('sass', getRoot())) ?? (await importFromProject('sass-embedded', getRoot())));
      const less = unwrap(await importFromProject('less', getRoot()));
      const postcss = await importFromProject('postcss', getRoot());
      mods = { sass, less, postcss: postcss?.default ?? postcss };
      return mods;
    })());
  return {
    async prepare() {
      return load();
    },
    async css(abs) {
      if (!existsSync(abs)) return null;
      const { sass, less } = await load();
      const ext = extname(abs).slice(1);
      const text = readFileSync(abs, 'utf-8');
      if (sass && (ext === 'scss' || ext === 'sass')) {
        const url = new URL(`file://${abs}`);
        return sass.compileString(text, { url, syntax: ext === 'sass' ? 'indented' : 'scss' }).css;
      }
      if (less && ext === 'less') return (await less.render(text, { filename: abs, paths: [dirname(abs)] })).css;
      return text;
    },
    // Read once `prepare` has run. Stencil's own parser needs postcss for a stylesheet with custom properties: without it, unsupported.
    get postcss() {
      return (
        mods?.postcss ??
        (() => {
          throw Object.assign(new Error('postcss is not installed'), { code: 'NO_POSTCSS' });
        })
      );
    },
  };
}

/**
 * @param {object} options
 * @param {{ docs?: boolean, types?: boolean, include?: unknown, exclude?: unknown, stencilConfig?: object }} options.stencil the plugin's @stencil/unplugin options
 * @param {string} [options.root] the project root (`setRoot` changes it)
 * @param {boolean} options.resolveImports follow imports for prop and event types, as `stencil build` does
 * @param {boolean} [options.generatedTags] docs carry the `@default` and `@readonly` tags `stencil build` adds (docs-json has them); false: as @stencil/unplugin's
 */
export function createProject({ stencil, root = process.cwd(), resolveImports, generatedTags = true }) {
  const filter = createFileFilter(stencil.include ?? [/\.tsx?$/], stencil.exclude ?? ['node_modules/**']);
  const docsOn = !!stencil.docs;
  const typesOn = !!stencil.types;
  const tools = createStyleTools(() => root);
  /** tag -> docs component, tag -> compiler metadata, source file -> tags. */
  const docsRegistry = new Map();
  const metaRegistry = new Map();
  const tagsByFile = new Map();
  /** stylesheet -> tags of the components that link it. */
  const tagsByStylesheet = new Map();
  let typesConfig = null;
  let unsupported = null;
  let scanned = null;
  const counts = { stencilrs: 0, stencil: 0 };
  /** The files whose metadata came from Stencil's compiler. */
  const fallbackFiles = new Set();

  /** The metadata of the components of one file: stencilrs', or Stencil's for a file stencilrs does not port yet. */
  async function metaOf(file, code) {
    const own = stencilrsMeta(file, code, { resolveImports });
    if (own) {
      counts.stencilrs++;
      return own;
    }
    counts.stencil++;
    fallbackFiles.add(normalizePath(file, false));
    return stencilMeta(file, code);
  }

  async function register(file, code) {
    const abs = normalizePath(file, false);
    for (const tag of tagsByFile.get(abs) ?? []) {
      docsRegistry.delete(tag);
      metaRegistry.delete(tag);
    }
    tagsByFile.delete(abs);
    if (!hasComponentDecorator(code)) return false;
    const items = (await metaOf(file, code)).filter((item) => item.tagName);
    if (!items.length) return false;
    if (docsOn) await tools.prepare();
    for (const item of items) {
      if (generatedTags) addGeneratedDocTags(item);
      if (stencil.docs === true) {
        try {
          await collectStyleDocs(item, abs, tools);
        } catch (e) {
          if (e.code !== 'NO_POSTCSS') throw e;
          unsupported = 'stylesheets with custom properties, and no postcss installed';
          return false;
        }
      }
      docsRegistry.set(item.tagName, cmpMetaToDocsComponent(item, abs));
      metaRegistry.set(item.tagName, item);
      for (const style of item.styles ?? []) {
        for (const external of style.externalStyles ?? []) {
          const css = normalizePath(resolve(dirname(abs), external.originalComponentPath ?? external.relativePath), false);
          if (!tagsByStylesheet.has(css)) tagsByStylesheet.set(css, new Set());
          tagsByStylesheet.get(css).add(item.tagName);
        }
      }
    }
    tagsByFile.set(abs, items.map((i) => i.tagName));
    return true;
  }

  async function scan() {
    // CSS-only components (`@component` in a stylesheet) are parsed by Stencil's compiler.
    const cssFiles = [];
    const cwd = process.cwd();
    collectFiles(cwd, (abs) => isTsSourceFile(abs) || abs.endsWith('.css'), cssFiles);
    for (const css of cssFiles) {
      if (!css.endsWith('.css')) continue;
      try {
        if (readFileSync(css, 'utf-8').includes('@component')) return void (unsupported = `CSS-only components (${css})`);
      } catch {}
    }
    await Promise.all(
      cssFiles
        .filter((abs) => isTsSourceFile(abs) && filter(abs))
        .map(async (abs) => {
          let code;
          try {
            code = readFileSync(abs, 'utf-8');
          } catch {
            return;
          }
          await register(abs, code);
        }),
    );
  }

  /** The `docs`-and-`types` config; `undefined` when it can't be read (`unsupported`). */
  async function loadConfig() {
    const detected = await loadConfigSubset(root);
    if (detected === undefined) {
      unsupported = 'a stencil.config it can not load (jiti is not installed)';
      return;
    }
    const merged = { ...detected, ...stencil.stencilConfig };
    typesConfig = { srcDir: resolve(root, merged.srcDir ?? 'src'), signalBacking: !!merged.signalBacking };
  }

  const byTagName = (a, b) => a.tagName.localeCompare(b.tagName);
  const typesContent = () => generateComponentTypesFile([...metaRegistry.values()].sort(byTagName), typesConfig);

  /** Write `<srcDir>/components.d.ts` unless it already has this content. */
  function writeTypes() {
    if (!typesOn || !typesConfig) return false;
    const filePath = join(typesConfig.srcDir, 'components.d.ts');
    const content = typesContent();
    let existing;
    try {
      existing = readFileSync(filePath, 'utf-8');
    } catch {}
    if (existing === content) return false;
    writeFileSync(filePath, content);
    return true;
  }

  return {
    filter,
    /** The Vite project root (`stencil.config` and `srcDir` are read from it), known once the config is resolved. */
    setRoot(dir) {
      root = dir;
    },
    counts,
    fallbackFiles,
    /** Why docs / types need @stencil/unplugin after all (known after `start`), or null. */
    get unsupported() {
      return unsupported;
    },
    /** Scan the project once (unplugin's `buildStart`): the registries, then `components.d.ts`. */
    start() {
      scanned ??= (async () => {
        await loadConfig();
        if (!unsupported) await scan();
        if (!unsupported) writeTypes();
      })();
      return scanned;
    },
    /** The docs components (`JsonDocsComponent`, without readme, usage and dependencies) of the scanned project. */
    docsComponents() {
      return [...docsRegistry.values()];
    },
    /** `@stencil/unplugin/docs`: the manifest, as JSON. */
    manifestJson() {
      return JSON.stringify(generateManifest([...docsRegistry.values()]));
    },
    /** A component file the scan did not see (outside the working directory): added when it is compiled. */
    async note(file, code) {
      if (!docsOn || unsupported) return;
      const abs = normalizePath(file, false);
      if (tagsByFile.has(abs) || !filter(abs)) return;
      await register(abs, code);
    },
    /**
     * A source file or stylesheet changed, was added or deleted: bring the registries up to date and rewrite
     * `components.d.ts`. Resolves to whether the docs changed.
     */
    async changed(file) {
      if (unsupported || !scanned) return false;
      await scanned;
      const abs = normalizePath(file, false);
      let docsChanged = false;
      if (isTsSourceFile(abs) && filter(abs)) {
        const before = JSON.stringify((tagsByFile.get(abs) ?? []).map((t) => docsRegistry.get(t)));
        let code = '';
        try {
          code = readFileSync(abs, 'utf-8');
        } catch {}
        try {
          await register(abs, code);
        } catch {
          return false;
        }
        docsChanged = docsOn && before !== JSON.stringify((tagsByFile.get(abs) ?? []).map((t) => docsRegistry.get(t)));
      } else if (!abs.endsWith('.css')) {
        return false;
      } else if (docsOn) {
        for (const tag of tagsByStylesheet.get(abs) ?? []) {
          const owner = [...tagsByFile].find(([, tags]) => tags.includes(tag))?.[0];
          if (!owner) continue;
          const before = JSON.stringify(docsRegistry.get(tag));
          try {
            await register(owner, readFileSync(owner, 'utf-8'));
          } catch {}
          if (JSON.stringify(docsRegistry.get(tag)) !== before) docsChanged = true;
        }
      }
      writeTypes();
      return docsChanged;
    },
  };
}
