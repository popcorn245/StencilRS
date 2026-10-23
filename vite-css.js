// Component stylesheets for the Vite plugin: @stencil/unplugin's `src/css.ts`, with Stencil's JS
// `scopeCss` replaced by stencilrs' port. Self-contained: nothing here needs `@stencil/core`.
//
// A style import the compiler emits, `./foo.css?tag=my-cmp&encapsulation=scoped[&mode=ios]`,
// resolves to a `\0stencil-css:` virtual id, and loads as `export default () => "…css…"` after
// Sass/Less -> PostCSS -> lightningcss -> `scopeCss` (scoped encapsulation only). Like
// @stencil/unplugin, only `tag` and `encapsulation` matter: a mode's stylesheet is its own import.
//
// Steps run when their package is installed, as in @stencil/unplugin. When one can't be loaded
// from here, `load` returns null so @stencil/unplugin (which resolves it from its own place)
// does the work. Global stylesheets (`globalStyle`, `stencil-component-globals`) and `docs`
// are not component styles: they stay with @stencil/unplugin.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  };
}

const postcssConfigCache = new Map();

/**
 * The chain's packages, loaded lazily, once. null when an installed one fails to import from
 * here: the caller leaves the stylesheet to @stencil/unplugin.
 */
export function createCssPipeline() {
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
        mods[name] = await import(name);
      } catch {
        mods[name] = null;
      }
    }
    return names.every((n) => mods[n]);
  };

  const compileSass = (source, filePath, indented) => {
    const mainUrl = `file://${filePath}`;
    const result = mods.sass.compileString(source, { url: new URL(mainUrl), syntax: indented ? 'indented' : 'scss' });
    const deps = result.loadedUrls.filter((u) => u.protocol === 'file:' && u.href !== mainUrl).map((u) => fileURLToPath(u));
    return { css: result.css, deps };
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
    const { file, tag, encapsulation } = parseStencilCssId(id);
    if (!existsSync(file)) return { code: 'export default () => ""', deps: [] };
    const ext = extname(file).slice(1);
    if (!(await need(ext))) return null;
    let css = readFileSync(file, 'utf-8');
    let deps = [];
    if (has.sass && (ext === 'scss' || ext === 'sass')) ({ css, deps } = compileSass(css, file, ext === 'sass'));
    else if (has.less && ext === 'less') ({ css, deps } = await compileLess(css, file));
    if (has.postcss) css = await runPostCss(css, file);
    if (has.lightningcss) css = mods.lightningcss.transform({ filename: file, code: Buffer.from(css), minify: !isDev }).code.toString();
    // Stencil's getScopeId(tag), with no mode.
    if (encapsulation === 'scoped' && tag) {
      try {
        css = scopeCss(css, `sc-${tag}`, false);
      } catch {
        return null; // a stylesheet stencilrs' scopeCss rejects: Stencil's decides
      }
    }
    return { code: `export default () => ${JSON.stringify(css)};`, deps };
  };
}
