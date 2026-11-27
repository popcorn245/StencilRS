// Opt-in: declarative shadow DOM output with each shadow root's `<style>` replaced by a `<link rel="stylesheet">` to a
// shared, cacheable file (docs/spike-dsd-styles.md). Standards-only: `<link rel=stylesheet>` is valid inside a shadow root
// in every evergreen browser, and the file is fetched and parsed once per URL however many roots use it.
//
//   import { createShadowStyleStore, externalizeShadowStyles } from '@popcorn245/stencilrs/ssr';
//   const store = createShadowStyleStore({ base: '/c/' });
//   const { html } = externalizeShadowStyles(result.html, store);   // <style sty-id="x">..</style>  ->  <link rel=stylesheet href=/c/x.<hash>.css sty-id=x>
//   app.use(store.base, store.middleware());                       // serves the sheets, `immutable` (the name has the content hash)
//
// `sty-id` stays on the link so Stencil's client finds the element where it looks for the server's `<style>`
// (`querySelector('[sty-id=...]')`), adopts its own constructable sheet and removes the element.
// Only the styles that are the leading children of a `<template shadowrootmode>` are touched: `<style sty-id>` in `<head>`
// (scoped components, global styles) and any other style stay inline. With `preload`, the head gets one
// `<link rel=preload as=style>` per sheet used (measured: it does not change first paint, it moves requests earlier).

// FNV-1a over UTF-16 code units, 32 bit, plus the length: a cache-busting name, not a security boundary.
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + s.length.toString(16);
};

const ROOT = /(<template shadowrootmode="[a-z]+"[^>]*>)((?:<style sty-id="[^"]+">[^]*?<\/style>)+)/g;
const STYLE = /<style sty-id="([^"]+)">([^]*?)<\/style>/g;
const SAFE_ID = /^[A-Za-z0-9_.-]+$/;

/** @param {{ base?: string, max?: number }} [options] `base`: URL prefix of the sheets (default `/c/`). `max`: most sheets kept (default 5000; the oldest go first). */
export const createShadowStyleStore = ({ base = '/c/', max = 5000 } = {}) => {
  if (!base.startsWith('/') || !base.endsWith('/')) throw new TypeError('createShadowStyleStore: `base` must start and end with "/"');
  const sheets = new Map(); // file name -> css
  const add = (id, css) => {
    const file = `${SAFE_ID.test(id) ? id : 'x'}.${hash(css)}.css`;
    if (!sheets.has(file)) {
      sheets.set(file, css);
      if (sheets.size > max) sheets.delete(sheets.keys().next().value);
    }
    return file;
  };
  /** Connect/Express middleware, mounted at `base`: `app.use(store.base, store.middleware())`. */
  const middleware = () => (req, res, next) => {
    const css = sheets.get(decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\//, '')));
    if (css === undefined) return next ? next() : res.writeHead(404).end();
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' }).end(css);
  };
  return { base, sheets, add, get: (file) => sheets.get(file), middleware };
};

/**
 * @param {string} html a rendered document or fragment (declarative shadow DOM)
 * @param {ReturnType<typeof createShadowStyleStore>} store
 * @param {{ preload?: boolean, minUses?: number }} [options] `minUses` (default 1): only a sheet that starts at least this many shadow roots of the page becomes a link; the others stay inline (no request, no wait for them). 2 or 3 suits pages of many one-off components
 * @returns {{ html: string, files: string[] }} `files`: the sheets the page links, in first-use order
 */
export const externalizeShadowStyles = (html, store, { preload = false, minUses = 1 } = {}) => {
  const used = new Set();
  let counts = null;
  if (minUses > 1) {
    counts = new Map();
    for (const [, , styles] of html.matchAll(ROOT)) for (const [, id, css] of styles.matchAll(STYLE)) counts.set(id + css, (counts.get(id + css) ?? 0) + 1);
  }
  let out = html.replace(ROOT, (_, open, styles) => {
    let links = '';
    for (const [whole, id, css] of styles.matchAll(STYLE)) {
      if (counts && counts.get(id + css) < minUses) {
        links += whole;
        continue;
      }
      const file = store.add(id, css);
      used.add(file);
      links += `<link rel="stylesheet" href="${store.base}${file}" sty-id="${id}">`;
    }
    return open + links;
  });
  if (preload && used.size > 0 && out.includes('</head>')) {
    const tags = [...used].map((f) => `<link rel="preload" as="style" href="${store.base}${f}">`).join('');
    out = out.replace('</head>', tags + '</head>');
  }
  return { html: out, files: [...used] };
};
