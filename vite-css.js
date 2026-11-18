// Component stylesheets for the Vite plugin: @stencil/unplugin's `src/css.ts`, with Stencil's JS
// `scopeCss` replaced by stencilrs' port. Self-contained: nothing here needs `@stencil/core`.
//
// A style import the compiler emits, `./foo.css?tag=my-cmp&encapsulation=scoped[&mode=ios]`,
// resolves to a `\0stencil-css:` virtual id, and loads as `export default () => "…css…"` after
// Sass/Less -> PostCSS -> lightningcss -> `scopeCss` (scoped encapsulation only), with the scope id
// `sc-<tag>`, or `sc-<tag>-<mode>` for a mode's stylesheet (`styleUrls: { ios, md }`). (@stencil/unplugin
// scopes every mode to `sc-<tag>`, so the runtime's `sc-<tag>-ios` host class never matches its CSS.)
//
// Steps run when their package is installed, as in @stencil/unplugin. When one can't be loaded
// from here, `load` returns null so @stencil/unplugin (which resolves it from its own place)
// does the work. Global stylesheets (`globalStyle`, `stencil-component-globals`) and `docs`
// are not component styles: they stay with @stencil/unplugin.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { scopeCss } from './index.js';

const STENCIL_CSS_RE = /\.(?:css|scss|sass|less|styl)\?[^/]*\btag=/;
export const STENCIL_CSS_PREFIX = '\0stencil-css:';

const packageExists = (name) => {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'node_modules', name, 'package.json'))) return true;
    if (dirname(dir) === dir) break;
  }
  try {
    createRequire(join(process.cwd(), 'noop.js')).resolve(`${name}/package.json`);
    return true;
  } catch {
    return false;
  }
};

/**
 * `import(name)`, from the project first: a package linked into node_modules (`file:` dependencies,
 * workspaces) resolves from its real path, where the project's own Sass / PostCSS / lightningcss
 * are out of reach.
 */
const importFromProject = async (name) => {
  try {
    const mod = await import(pathToFileURL(createRequire(join(process.cwd(), 'noop.js')).resolve(name)).href);
    // The CommonJS build (what `require.resolve` finds): its exports are the default, not named exports.
    return mod.default && typeof mod.default === 'object' ? { ...mod.default, ...mod } : mod;
  } catch {
    return import(name);
  }
};

/** @stencil/unplugin's `resolveStencilCss`. */
export function resolveStencilCss(specifier, importer) {
  if (!STENCIL_CSS_RE.test(specifier)) return null;
  const [base, query] = specifier.split('?');
  const absBase = resolve(dirname(importer), base);
  const ext = extname(absBase);
  const stem = absBase.slice(0, absBase.length - ext.length);
  return `${STENCIL_CSS_PREFIX}${stem}?${query}&__ext=${encodeURIComponent(ext.slice(1))}`;
}

/** The stylesheet's file and the `tag` / `encapsulation` of a `\0stencil-css:` id. */
export function parseStencilCssId(id) {
  const rest = id.slice(STENCIL_CSS_PREFIX.length);
  const q = rest.indexOf('?');
  const stem = q === -1 ? rest : rest.slice(0, q);
  const params = new URLSearchParams(q === -1 ? '' : rest.slice(q + 1));
  return {
    file: `${stem}.${decodeURIComponent(params.get('__ext') ?? 'css')}`,
    tag: params.get('tag') ?? '',
    encapsulation: params.get('encapsulation') ?? 'none',
    mode: params.get('mode') ?? '',
  };
}

/** lightningcss' unminified output (one declaration per line, indented) without its line breaks and indentation. */
const compactWhitespace = (css) =>
  css
    .replace(/([{};,])[ \t]*\n\s*/g, '$1')
    .replace(/\s*\n\s*/g, ' ')
    .trim();

const postcssConfigCache = new Map();

const sha = (...parts) => {
  const h = createHash('sha1');
  for (const p of parts) h.update(String(p)).update('\0');
  return h.digest('hex');
};
const fileHash = (f) => {
  try {
    return createHash('sha1').update(readFileSync(f)).digest('hex');
  } catch {
    return 'missing'; // a dependency that vanished: differs from any recorded hash, so the stylesheet recompiles (and reports it)
  }
};
const depsCurrent = (depHashes) => depHashes.every(([f, h]) => fileHash(f) === h);

/** `node_modules/.cache/stencilrs/sass` of the nearest node_modules above the working directory, or null. */
const diskCacheDir = () => {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'node_modules'))) return join(dir, 'node_modules', '.cache', 'stencilrs', 'sass');
    if (dirname(dir) === dir) return null;
  }
};

/**
 * The browsers `stencil build` autoprefixes for (`DEFAULT_BROWSER_TARGETS` in @stencil/core's
 * compiler, `autoprefixCss: true`). A browserslist query, resolved when the stylesheets load.
 */
export const STENCIL_CSS_TARGETS = ['last 2 Chrome versions', 'last 2 Firefox versions', 'last 2 Safari versions', 'last 2 Edge versions', 'iOS >= 16', 'Android >= 13', '> 0.5%', 'not dead'];

/**
 * The chain's packages, loaded lazily, once. null when an installed one fails to import from
 * here: the caller leaves the stylesheet to @stencil/unplugin.
 */
export function createCssPipeline(options = {}) {
  // `targets`: a browserslist query (string or array), or lightningcss' own targets object, or false for none.
  // Default: Stencil's autoprefix targets. `minify`: `true` is lightningcss' minify (shortens values: `bold` to `700`,
  // `none` to `0 0`, `translate3d(x, 0, 0)` to `translate(x)`); `'whitespace'` (the default in a build) keeps the values
  // lightningcss prints without it and drops the whitespace, which is what `stencil build` ships (autoprefix, then its
  // own whitespace-only minifier); `false` (the default in dev) leaves the output as printed.
  // `sass`: passed to Sass' `compileString` (silenceDeprecations, loadPaths, quietDeps, ...).
  // `cache`: results are reused while a stylesheet and every file Sass loaded for it (`loadedUrls`) are unchanged, so a
  // watch rebuild recompiles only what an edit touched. In memory always; also on disk (node_modules/.cache/stencilrs)
  // for the Sass step, unless `false` / 'memory', or the Sass options hold functions or importers (not hashable).
  const { targets: targetsOption = STENCIL_CSS_TARGETS, minify: minifyOption, sass: sassOptions = {}, cache: cacheOption = true } = options;
  const sassOptionsKey = (() => {
    if (sassOptions.functions || sassOptions.importers || sassOptions.logger) return null;
    try {
      return JSON.stringify(sassOptions);
    } catch {
      return null;
    }
  })();
  const memCache = cacheOption !== false;
  const diskCache = cacheOption === true && sassOptionsKey !== null ? diskCacheDir() : null;
  const sassMemo = new Map(); // key -> { css, deps, depHashes }
  const outputMemo = new Map(); // key -> { code, deps }
  let targets; // lightningcss' targets, resolved once
  const resolveTargets = async () => {
    if (targets !== undefined) return targets;
    if (!targetsOption) return (targets = null);
    if (typeof targetsOption === 'object' && !Array.isArray(targetsOption)) return (targets = targetsOption);
    const explicit = targetsOption !== STENCIL_CSS_TARGETS;
    try {
      const mod = await importFromProject('browserslist');
      const browserslist = typeof mod === 'function' ? mod : mod.default;
      targets = mods.lightningcss.browserslistToTargets(browserslist(targetsOption));
    } catch (err) {
      if (explicit) throw new Error(`[stencilrs] css.targets needs the browserslist package: ${err.message}`);
      targets = null; // no browserslist here: no targets, as before
    }
    return targets;
  };
  const has = { sass: packageExists('sass'), less: packageExists('less'), postcss: packageExists('postcss') && packageExists('postcss-load-config'), lightningcss: packageExists('lightningcss') };
  const mods = {};
  const need = async (ext) => {
    const names = [];
    if (has.sass && (ext === 'scss' || ext === 'sass')) names.push('sass');
    else if (has.less && ext === 'less') names.push('less');
    if (has.postcss) names.push('postcss', 'postcss-load-config');
    if (has.lightningcss) names.push('lightningcss');
    for (const name of names) {
      if (name in mods) continue;
      try {
        mods[name] = await importFromProject(name);
      } catch {
        mods[name] = null;
      }
    }
    return names.every((n) => mods[n]);
  };

  const compileSassUncached = (source, filePath, indented) => {
    const mainUrl = `file://${filePath}`;
    const result = mods.sass.compileString(source, { ...sassOptions, url: new URL(mainUrl), syntax: indented ? 'indented' : 'scss' });
    const deps = result.loadedUrls.filter((u) => u.protocol === 'file:' && u.href !== mainUrl).map((u) => fileURLToPath(u));
    return { css: result.css, deps };
  };
  let sassVersion;
  const compileSass = (source, filePath, indented) => {
    if (!memCache || sassOptionsKey === null) return compileSassUncached(source, filePath, indented);
    sassVersion ??= String(mods.sass.info);
    // The key: the file, its content, the syntax, Sass' version and options. The entry also holds the hash of each file Sass loaded.
    const key = sha('sass', sassVersion, sassOptionsKey, indented, filePath, source);
    let hit = sassMemo.get(key);
    const diskFile = diskCache && join(diskCache, `${key}.json`);
    if (!hit && diskFile) {
      try {
        hit = JSON.parse(readFileSync(diskFile, 'utf8'));
      } catch {}
    }
    if (hit && depsCurrent(hit.depHashes)) {
      sassMemo.set(key, hit);
      return { css: hit.css, deps: hit.deps, key: sha(key, ...hit.depHashes.flat()) };
    }
    const { css, deps } = compileSassUncached(source, filePath, indented);
    const entry = { css, deps, depHashes: deps.map((d) => [d, fileHash(d)]) };
    sassMemo.set(key, entry);
    if (diskFile) {
      try {
        mkdirSync(diskCache, { recursive: true });
        const tmp = `${diskFile}.${process.pid}.tmp`;
        writeFileSync(tmp, JSON.stringify(entry));
        renameSync(tmp, diskFile);
      } catch {}
    }
    return { css, deps, key: sha(key, ...entry.depHashes.flat()) };
  };
  const compileLess = async (source, filePath) => {
    const result = await mods.less.default.render(source, { filename: filePath, paths: [dirname(filePath)] });
    return { css: result.css, deps: result.imports ?? [] };
  };
  const runPostCss = async (css, filePath) => {
    const dir = dirname(filePath);
    let config = postcssConfigCache.get(dir);
    if (config === undefined) {
      try {
        const loaded = await mods['postcss-load-config'].default({}, dir);
        config = { plugins: loaded.plugins, options: loaded.options };
      } catch {
        config = null;
      }
      postcssConfigCache.set(dir, config);
    }
    if (!config?.plugins.length) return css;
    return (await mods.postcss.default(config.plugins).process(css, { ...config.options, from: filePath })).css;
  };

  /**
   * @stencil/unplugin's `loadStencilCss`.
   * @returns `{ code, deps }`, or null to leave the stylesheet to @stencil/unplugin
   */
  return async function load(id, isDev) {
    const { file, tag, encapsulation, mode } = parseStencilCssId(id);
    if (!existsSync(file)) return { code: 'export default () => ""', deps: [] };
    const ext = extname(file).slice(1);
    if (!(await need(ext))) return null;
    let css = readFileSync(file, 'utf-8');
    let deps = [];
    let sassKey = null;
    if (has.sass && (ext === 'scss' || ext === 'sass')) ({ css, deps, key: sassKey } = compileSass(css, file, ext === 'sass'));
    else if (has.less && ext === 'less') ({ css, deps } = await compileLess(css, file));
    // Everything after Sass is a function of the CSS it produced and of the id: reuse the whole output while both are unchanged.
    const outKey = sassKey ? sha(sassKey, id, isDev) : null;
    const memo = outKey && outputMemo.get(outKey);
    if (memo) return memo;
    if (has.postcss) css = await runPostCss(css, file);
    const lightningTargets = has.lightningcss ? await resolveTargets() : null;
    const minify = minifyOption ?? (isDev ? false : 'whitespace');
    const lower = (code) => {
      const out = mods.lightningcss.transform({ filename: file, code: Buffer.from(code), minify: minify === true, ...(lightningTargets ? { targets: lightningTargets } : {}) }).code.toString();
      return minify === 'whitespace' ? compactWhitespace(out) : out;
    };
    const scoped = encapsulation === 'scoped' && tag;
    // Stencil's getScopeId(tag, mode): a mode's stylesheet (`styleUrls: { ios, md }`) is scoped to `sc-<tag>-<mode>`,
    // the class the runtime puts on the host and its children for that mode.
    const scope = (code) => scopeCss(code, mode ? `sc-${tag}-${mode}` : `sc-${tag}`, false);
    let scopedFirst = false;
    if (has.lightningcss) {
      try {
        css = lower(css);
      } catch (err) {
        // `::slotted(*) h1` (a scoped component's own way of styling slotted content's descendants) is
        // not valid CSS: lightningcss refuses it, while `stencil build` rewrites the selector (scopeCss)
        // before it optimizes. Do the same for the stylesheets lightningcss rejects.
        if (!scoped) {
          err.message = `${file}: ${err.message}`; // lightningcss's message has no file name
          throw err;
        }
        scopedFirst = true;
        try {
          css = lower(scope(css));
        } catch {
          err.message = `${file}: ${err.message}`;
          throw err;
        }
      }
    }
    if (scoped && !scopedFirst) {
      try {
        css = scope(css);
      } catch {
        return null; // a stylesheet stencilrs' scopeCss rejects: Stencil's decides
      }
    }
    const out = { code: `export default () => ${JSON.stringify(css)};`, deps };
    if (outKey) outputMemo.set(outKey, out);
    return out;
  };
}
