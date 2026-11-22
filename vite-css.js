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
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { availableParallelism } from 'node:os';
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
 * The installed version of a package as the project (or, with `from`, that package) resolves it; null when unknown.
 * Found by walking up from the package's entry point: a package's `exports` may hide its package.json from `resolve`.
 */
const packageVersion = (name, from) => {
  try {
    let req = createRequire(join(process.cwd(), 'noop.js'));
    if (from) req = createRequire(req.resolve(`${from}/package.json`));
    for (let dir = dirname(req.resolve(name)); ; dir = dirname(dir)) {
      try {
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        if (pkg.name === name) return pkg.version ?? null;
      } catch {}
      if (dirname(dir) === dir) return null;
    }
  } catch {
    return null;
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

/**
 * Stencil's own `optimizeCss` (`@stencil/core/compiler`: autoprefix at its default targets, then its CSS parser and
 * serializer as the whitespace-only minifier), loaded from the project. Only `minify: 'stencil'` needs it.
 */
let stencilOptimizeCss;
const loadStencilOptimizeCss = () =>
  (stencilOptimizeCss ??= (async () => {
    const pkg = createRequire(join(process.cwd(), 'noop.js')).resolve('@stencil/core/package.json');
    return (await import(pathToFileURL(join(dirname(pkg), 'dist/compiler/index.mjs')).href)).optimizeCss;
  })());

/** `stripCssComments` of Stencil's `css-to-esm`: the block comments outside strings. */
const stripCssComments = (input) => {
  let inside = null;
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (input[i - 1] !== '\\' && (c === '"' || c === "'")) {
      if (inside === c) inside = null;
      else if (!inside) inside = c;
    }
    if (!inside && c === '/' && input[i + 1] === '*') {
      let j = i + 2;
      while (j < input.length && !(input[j] === '*' && input[j + 1] === '/')) j++;
      i = j + 1;
      continue;
    }
    out += c;
  }
  return out;
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
// What a file's content hashed to, by its stat: a shared Sass partial that 190 stylesheets depend on is read and hashed
// once, not once per stylesheet per rebuild. A file stamped (mtime, size) as when it was hashed is not read again, unless
// it was modified within the last 2 s (git's "racy" case: a later edit of the same size could keep the mtime).
const hashByStamp = new Map();
const hashNow = (f) => {
  const st = statSync(f, { bigint: true, throwIfNoEntry: false });
  if (!st?.isFile()) return 'missing'; // a dependency that vanished: differs from any recorded hash, so the stylesheet recompiles (and reports it)
  const stamp = `${st.mtimeNs}:${st.size}`;
  const known = hashByStamp.get(f);
  if (known?.stamp === stamp) return known.hash;
  let hash;
  try {
    hash = createHash('sha1').update(readFileSync(f)).digest('hex');
  } catch {
    return 'missing';
  }
  if (Date.now() - Number(st.mtimeNs / 1000000n) > 2000) hashByStamp.set(f, { stamp, hash });
  else hashByStamp.delete(f);
  return hash;
};

// A stylesheet's text, by its stat: read again only when (mtime, size) changed or it was modified within the last 2 s.
const sourceByStamp = new Map();
const readSource = (f) => {
  const st = statSync(f, { bigint: true, throwIfNoEntry: false });
  if (!st?.isFile()) return readFileSync(f, 'utf-8');
  const stamp = `${st.mtimeNs}:${st.size}`;
  const known = sourceByStamp.get(f);
  if (known?.stamp === stamp) return known.text;
  const text = readFileSync(f, 'utf-8');
  if (Date.now() - Number(st.mtimeNs / 1000000n) > 2000) sourceByStamp.set(f, { stamp, text });
  else sourceByStamp.delete(f);
  return text;
};

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
  // own whitespace-only minifier); `false` (the default in dev) leaves the output as printed. `'stencil'` is Stencil's
  // own `transformCssToEsm` order and minifier, byte for byte: scopeCss, then its `optimizeCss` (autoprefix and its CSS
  // serializer), newlines and tabs as spaces, comments stripped. What a hydrate app's styles are (`@popcorn245/stencilrs/ssr`).
  // Needs `@stencil/core`.
  // `transform`: `(css, file) => css | undefined`, run on the stylesheet after Sass / Less and before the rest of the chain.
  // `sass`: passed to Sass' `compileString` (silenceDeprecations, loadPaths, quietDeps, ...).
  // `cache`: results are reused while a stylesheet and every file Sass loaded for it (`loadedUrls`) are unchanged, so a
  // watch rebuild recompiles only what an edit touched. In memory always; also on disk (node_modules/.cache/stencilrs)
  // for the Sass step, unless `false` / 'memory', or the Sass options hold functions or importers (not hashable).
  const { targets: targetsOption = STENCIL_CSS_TARGETS, minify: minifyOption, sass: sassOptions = {}, cache: cacheOption = true, transform: transformOption } = options;
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
  // Within one build a file is looked at once (`newBuild`); null until the plugin says a build starts (a dev server never does).
  let hashesOfBuild = null;
  const fileHash = (f) => {
    if (!hashesOfBuild) return hashNow(f);
    let hash = hashesOfBuild.get(f);
    if (hash === undefined) hashesOfBuild.set(f, (hash = hashNow(f)));
    return hash;
  };
  const depsCurrent = (depHashes) => depHashes.every(([f, h]) => fileHash(f) === h);
  const sassMemo = new Map(); // key -> { css, deps, depHashes }
  const outputMemo = new Map(); // key -> { code, deps }
  let targets; // lightningcss' targets, resolved once
  const resolveTargets = async () => {
    if (targets !== undefined) return targets;
    if (!targetsOption) return (targets = null);
    if (typeof targetsOption === 'object' && !Array.isArray(targetsOption)) return (targets = targetsOption);
    const explicit = targetsOption !== STENCIL_CSS_TARGETS;
    // The resolved targets are a function of the query and of the browserslist, caniuse-lite and lightningcss versions (the
    // browser data ships in caniuse-lite): kept on disk under that key, so a build does not load browserslist and its data (~40 ms).
    const versions = [packageVersion('browserslist'), packageVersion('caniuse-lite', 'browserslist'), packageVersion('lightningcss')];
    const cacheFile = diskCache && versions.every(Boolean) ? join(diskCache, '..', 'targets', `${sha('targets', ...versions, JSON.stringify(targetsOption))}.json`) : null;
    if (cacheFile) {
      try {
        return (targets = JSON.parse(readFileSync(cacheFile, 'utf8')));
      } catch {}
    }
    try {
      const mod = await importFromProject('browserslist');
      const browserslist = typeof mod === 'function' ? mod : mod.default;
      targets = mods.lightningcss.browserslistToTargets(browserslist(targetsOption));
      if (cacheFile) {
        try {
          mkdirSync(dirname(cacheFile), { recursive: true });
          const tmp = `${cacheFile}.${process.pid}.tmp`;
          writeFileSync(tmp, JSON.stringify(targets));
          renameSync(tmp, cacheFile);
        } catch {}
      }
    } catch (err) {
      if (explicit) throw new Error(`[stencilrs] css.targets needs the browserslist package: ${err.message}`);
      targets = null; // no browserslist here: no targets, as before
    }
    return targets;
  };
  // Sass: `sass-embedded` when the project has it (a native compiler process: stylesheets compile concurrently, off the main
  // thread), else `sass` (compiles synchronously, one at a time).
  const sassPackage = packageExists('sass-embedded') ? 'sass-embedded' : 'sass';
  const has = { sass: packageExists('sass-embedded') || packageExists('sass'), less: packageExists('less'), postcss: packageExists('postcss') && packageExists('postcss-load-config'), lightningcss: packageExists('lightningcss') };
  const mods = {};
  // sass-embedded, unless it does not load (its platform binary is missing): then `sass`, if installed. Imported once; the
  // plugin starts it early (`preloadSass`) so the first stylesheet does not wait for the module to load.
  let sassModule;
  const loadSassModule = () =>
    (sassModule ??= importFromProject(sassPackage).catch((err) => {
      if (sassPackage === 'sass' || !packageExists('sass')) throw err;
      return importFromProject('sass');
    }));
  const need = async (ext) => {
    const names = [];
    const wantsSass = has.sass && (ext === 'scss' || ext === 'sass');
    if (wantsSass) names.push('sass');
    else if (has.less && ext === 'less') names.push('less');
    if (has.postcss) names.push('postcss', 'postcss-load-config');
    if (has.lightningcss) names.push('lightningcss');
    for (const name of names) {
      if (name in mods) continue;
      try {
        if (name === 'sass') mods.sass = await loadSassModule();
        else mods[name] = await importFromProject(name);
      } catch {
        mods[name] = null;
      }
    }
    return names.every((n) => mods[n]);
  };

  // sass-embedded: one compiler process, shared; at most `availableParallelism()` compilations in flight. It is started on
  // the first compilation and stopped by `dispose` (a running one keeps the process alive); a compilation after `dispose` starts a new one.
  let asyncCompiler = null;
  const maxConcurrent = Math.max(1, availableParallelism());
  let running = 0;
  const waiting = [];
  const slot = async () => {
    if (running >= maxConcurrent) await new Promise((r) => waiting.push(r));
    else running++;
  };
  const release = () => {
    const next = waiting.shift();
    if (next) next(); // the slot passes on
    else running--;
  };
  const compileSassUncached = async (source, filePath, indented) => {
    const mainUrl = `file://${filePath}`;
    const opts = { ...sassOptions, url: new URL(mainUrl), syntax: indented ? 'indented' : 'scss' };
    let result;
    if (String(mods.sass.info).startsWith('sass-embedded')) {
      await slot();
      try {
        const compiler = await (asyncCompiler ??= mods.sass.initAsyncCompiler());
        result = await compiler.compileStringAsync(source, opts);
      } finally {
        release();
      }
    } else {
      result = mods.sass.compileString(source, opts);
    }
    const deps = result.loadedUrls.filter((u) => u.protocol === 'file:' && u.href !== mainUrl).map((u) => fileURLToPath(u));
    return { css: result.css, deps };
  };
  let sassVersion;
  const compileSass = async (source, filePath, indented) => {
    if (!memCache || sassOptionsKey === null) return await compileSassUncached(source, filePath, indented);
    sassVersion ??= String(mods.sass.info).split('\t')[1] ?? String(mods.sass.info); // 'dart-sass\t1.99.0\t...' and 'sass-embedded\t1.99.0\t...' alike: the cache does not depend on which package compiled
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
    const { css, deps } = await compileSassUncached(source, filePath, indented);
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
  const load = async function load(id, isDev) {
    const { file, tag, encapsulation, mode } = parseStencilCssId(id);
    if (!existsSync(file)) return { code: 'export default () => ""', deps: [] };
    const ext = extname(file).slice(1);
    if (!(await need(ext))) return null;
    let css = readSource(file);
    let deps = [];
    let sassKey = null;
    if (has.sass && (ext === 'scss' || ext === 'sass')) ({ css, deps, key: sassKey } = await compileSass(css, file, ext === 'sass'));
    else if (has.less && ext === 'less') ({ css, deps } = await compileLess(css, file));
    // Everything after Sass is a function of the CSS it produced and of the id: reuse the whole output while both are unchanged.
    const outKey = sassKey ? sha(sassKey, id, isDev) : null;
    const memo = outKey && outputMemo.get(outKey);
    if (memo) return memo;
    // `css.transform(css, file)`: a repair for a stylesheet the toolchain cannot take as it is (the `transform` of a Stencil CSS plugin). Pure: the output is memoized.
    if (transformOption) css = (await transformOption(css, file)) ?? css;
    if (has.postcss) css = await runPostCss(css, file);
    const lightningTargets = has.lightningcss ? await resolveTargets() : null;
    const minify = minifyOption ?? (isDev ? false : 'whitespace');
    if (minify === 'stencil') {
      // Stencil scopes first, then autoprefixes and minifies (`transformCssToEsm`): not this chain's lightningcss.
      if (encapsulation === 'scoped' && tag) {
        try {
          css = scopeCss(css, mode ? `sc-${tag}-${mode}` : `sc-${tag}`, false);
        } catch {
          return null; // a stylesheet stencilrs' scopeCss rejects: Stencil's decides
        }
      }
      const { output, diagnostics } = await (await loadStencilOptimizeCss())({ input: css, filePath: file, autoprefixer: true, minify: true });
      const failed = diagnostics.find((d) => d.level === 'error');
      if (failed) throw new Error(`${file}: ${failed.messageText}`);
      const text = stripCssComments(output.replace(/[\n\r\t]/g, ' '));
      const stencilOut = { code: `export default () => ${JSON.stringify(text)};`, deps };
      if (outKey) outputMemo.set(outKey, stencilOut);
      return stencilOut;
    }
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
  /**
   * Starts importing the Sass package without waiting for it (the plugin calls this once the project is known to have Sass
   * stylesheets). Only the module is loaded: no compiler process starts, nothing keeps the process alive.
   */
  load.preloadSass = () => {
    if (has.sass) loadSassModule().catch(() => {}); // a failure surfaces in `need`, as without the preload
  };
  /** A build starts: what a file hashed to is remembered until the next one. */
  load.newBuild = () => {
    hashesOfBuild = new Map();
  };
  /** Stops the Sass compiler process (sass-embedded). A later compilation starts it again. */
  load.dispose = async () => {
    const compiler = asyncCompiler;
    asyncCompiler = null;
    if (compiler) await (await compiler).dispose();
  };
  return load;
}
