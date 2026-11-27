// Builds the page variants of the DSD style spike (docs/spike-dsd-styles.md) from the hydrate app's output.
//
//   node ssr-bench/html.mjs dist/hydrate-stencilrs/index.js <out>      (the DSD and scoped HTML of every page)
//   node spike/dsd-styles/build-variants.mjs <out>
//
// Variants (per page), all in <out>/<variant>/<page>.html, shared sheets in <out>/c/:
//   a-inline    today: a <style sty-id> as the first child of every shadow root
//   b-link      <link rel=stylesheet href=/c/<id>.<hash>.css sty-id=<id>> in every shadow root (the sty-id lets Stencil's
//               client find the element and drop it once it has adopted its own sheet, exactly as it does for <style>)
//   b-preload   b-link plus <link rel=preload as=style> for every distinct sheet in <head>
//   b-block     b-link with blocking=render on every link (does the browser then hold first paint for them?)
//   e-hybrid    ssr-shadow-styles.js with minUses: 3 (links only for sheets that start 3+ roots, the rest stay inline)
//   c-module    declarative CSS module scripts: <style type=module specifier=id> once in <head> and
//               shadowrootadoptedstylesheets="id" on the <template>. Chromium behind --enable-experimental-web-platform-features
//               only, NOT shippable; measured for reference
//   d-scoped    Stencil's `scoped` mode (no shadow roots, one <style> per component in <head>), for reference
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { createShadowStyleStore, externalizeShadowStyles } from '../../../../ssr-shadow-styles.js';

const [out] = process.argv.slice(2);
const PAGES = ['list-50', 'kitchen-sink'];
const IONIC_CSS = /<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net[^"]*">/;
const ionicCssFile = new URL('../../node_modules/@ionic/core/css/ionic.bundle.css', import.meta.url);

mkdirSync(join(out, 'c'), { recursive: true });
copyFileSync(ionicCssFile, join(out, 'ionic.bundle.css'));
const sheets = new Map(); // id -> { css, file }
const sheet = (id, css) => {
  const hash = createHash('sha1').update(css).digest('hex').slice(0, 8);
  const file = `${id}.${hash}.css`;
  if (!sheets.has(file)) {
    writeFileSync(join(out, 'c', file), css);
    sheets.set(file, { id, css });
  }
  return file;
};

// `<template shadowrootmode...>` followed by one or more <style sty-id>: the per-root styles.
const ROOT = /(<template shadowrootmode="[a-z]+"[^>]*>)((?:<style sty-id="[^"]+">[^]*?<\/style>)+)/g;
const STYLE = /<style sty-id="([^"]+)">([^]*?)<\/style>/g;

const write = (variant, page, html) => {
  mkdirSync(join(out, variant), { recursive: true });
  writeFileSync(join(out, variant, `${page}.html`), html.replace(IONIC_CSS, '<link rel="stylesheet" href="/ionic.bundle.css">'));
};

const stats = {};
for (const page of PAGES) {
  const dsd = readFileSync(`${out}/${page}.declarative-shadow-dom.html`, 'utf8');
  const scoped = readFileSync(`${out}/${page}.scoped.html`, 'utf8');
  write('a-inline', page, dsd);
  write('d-scoped', page, scoped);

  const used = new Map(); // file -> id
  let roots = 0;
  const link = dsd.replace(ROOT, (_, open, styles) => {
    roots++;
    let links = '';
    for (const [, id, css] of styles.matchAll(STYLE)) {
      const file = sheet(id, css);
      used.set(file, id);
      links += `<link rel="stylesheet" href="/c/${file}" sty-id="${id}">`;
    }
    return open + links;
  });
  write('b-link', page, link);
  const preload = [...used.keys()].map((f) => `<link rel="preload" as="style" href="/c/${f}">`).join('');
  write('b-block', page, link.replace(/(<link rel="stylesheet" href="\/c\/[^"]+") sty-id/g, '$1 blocking="render" sty-id'));
  write('b-preload', page, link.replace('</head>', `${preload}</head>`));

  // the prototype of ssr-shadow-styles.js, only sheets that start 3 or more roots (the rest stay inline)
  const store = createShadowStyleStore();
  write('e-hybrid', page, externalizeShadowStyles(dsd, store, { minUses: 3 }).html);
  for (const [file, css] of store.sheets) writeFileSync(join(out, 'c', file), css);

  const moduleSheets = new Map();
  const mod = dsd.replace(ROOT, (_, open, styles) => {
    const ids = [];
    for (const [, id, css] of styles.matchAll(STYLE)) {
      const file = sheet(id, css);
      moduleSheets.set(file, { id, css });
      ids.push(id);
    }
    return open.replace('<template ', `<template shadowrootadoptedstylesheets="${ids.join(' ')}" `);
  });
  const defs = [...moduleSheets.values()].map(({ id, css }) => `<style type="module" specifier="${id}">${css}</style>`).join('');
  write('c-module', page, mod.replace('</title>', `</title>${defs}`));
  stats[page] = { roots, distinctSheets: used.size, distinctBytes: [...used.keys()].reduce((n, f) => n + sheets.get(f).css.length, 0) };
}
writeFileSync(join(out, 'stats.json'), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats));
