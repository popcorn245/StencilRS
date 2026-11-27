// Q2/Q3 of the islands spike: component styles and <html>/<head> in fragment mode, and a visual + computed-style comparison of the
// assembled islands page against the full render.
//   node spike/islands/styles-check.mjs [list-50|kitchen-sink] [--shots <dir>]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { assemble, openPool } from './assemble.mjs';
import { PAGES, MODES, loadHydrate, renderOptions, launch, serve } from './lib.mjs';
import { renderIsland, renderShell } from './islands.mjs';

const args = process.argv.slice(2);
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const pageNames = args.filter((a) => PAGES[a]);
if (!pageNames.length) pageNames.push('list-50', 'kitchen-sink');
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

const hydrate = await loadHydrate();
const pool = await openPool(2);
const browser = await launch();

const styleIds = (html) => [...html.matchAll(/<style([^>]*)>/g)].map((m) => /sty-id="([^"]+)"/.exec(m[1])?.[1] ?? '(none)');
const count = (ids) => ids.reduce((m, id) => ((m[id] = (m[id] ?? 0) + 1), m), {});

// In the page: a fingerprint of the computed style of every element (and shadow element), to compare two renderings of the same page.
function computedFingerprint() {
  const props = ['display', 'color', 'background-color', 'font-size', 'font-weight', 'padding-top', 'padding-left', 'margin-top', 'margin-left', 'border-top-width', 'width', 'height', 'position', 'opacity', 'min-height'];
  const rows = [];
  const visit = (root, path) => {
    for (const el of root.querySelectorAll('*')) {
      if (['style', 'script', 'link', 'template'].includes(el.localName)) continue;
      const cs = getComputedStyle(el);
      rows.push(`${path}${el.localName}|${props.map((p) => cs.getPropertyValue(p)).join('|')}`);
      if (el.shadowRoot) visit(el.shadowRoot, `${path}${el.localName}>`);
    }
  };
  visit(document.body, '');
  return rows;
}

const diffPixels = async (a, b) => {
  const page = await browser.newPage();
  const res = await page.evaluate(async ([x, y]) => {
    const load = (b64) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + b64; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const c = (img) => { const k = document.createElement('canvas'); k.width = w; k.height = h; const g = k.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; };
    const da = c(ia), db = c(ib);
    let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 8) n++;
    return { w, h, differing: n, share: n / (w * h) };
  }, [a.toString('base64'), b.toString('base64')]);
  await page.close();
  return res;
};

const results = [];
for (const pageName of pageNames) {
  for (const modeName of ['dsd', 'scoped']) {
    const page = PAGES[pageName];
    const opts = renderOptions(MODES[modeName]);
    const full = await hydrate.renderToString(page.full(), { ...opts, fullDocument: true });
    const shell = await hydrate.renderToString(page.template, { ...opts, fullDocument: true });
    const frag = {};
    for (const n of Object.keys(page.islands)) frag[n] = await hydrate.renderToString(page.islands[n], { ...opts, fullDocument: false });
    const islands = await assemble(pool, pageName, modeName);

    const row = { page: pageName, mode: modeName, fullBytes: full.html.length, islandsBytes: islands.html.length };
    row.fullStyleTags = Object.keys(count(styleIds(full.html))).length;
    row.fullStyleTagTotal = styleIds(full.html).length;
    row.fullHeadStyles = (/<head>([\s\S]*?)<\/head>/.exec(full.html)?.[1].match(/<style/g) ?? []).length;
    row.shellHeadStyles = (/<head>([\s\S]*?)<\/head>/.exec(shell.html)?.[1].match(/<style/g) ?? []).length;
    row.fragmentResultStyles = Object.fromEntries(Object.entries(frag).map(([n, r]) => [n, r.styles.length]));
    row.fragmentInlineStyleTags = Object.fromEntries(Object.entries(frag).map(([n, r]) => [n, (r.html.match(/<style/g) ?? []).length]));
    const fullIds = count(styleIds(full.html));
    const isl = count(styleIds(islands.html));
    row.styleIdsMissingInIslands = Object.keys(fullIds).filter((id) => !(id in isl));
    row.styleIdsOnlyInIslands = Object.keys(isl).filter((id) => !(id in fullIds));
    // repeated sty-id's in scoped/head position (a style that should be once per page)
    row.islandsRepeatedHeadLevelStyles = Object.entries(isl).filter(([id, n]) => id !== '(none)' && n > (fullIds[id] ?? 0)).map(([id, n]) => `${id}:${n}>${fullIds[id] ?? 0}`);

    // pixels + computed style, JavaScript off (what the server wrote, before any client code)
    const shots = {};
    const fp = {};
    for (const [variant, html] of [['full', full.html], ['islands', islands.html]]) {
      const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) });
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 520, height: 900 } });
      const p = await ctx.newPage();
      await p.goto(origin + '/', { waitUntil: 'load' });
      shots[variant] = await p.screenshot({ fullPage: false });
      if (shotsDir) writeFileSync(join(shotsDir, `${pageName}-${modeName}-${variant}.png`), shots[variant]);
      await ctx.close();
      const ctx2 = await browser.newContext({ viewport: { width: 520, height: 900 } });
      const p2 = await ctx2.newPage();
      await p2.goto(origin + '/', { waitUntil: 'load' });
      fp[variant] = await p2.evaluate(`(${computedFingerprint})()`);
      await ctx2.close();
      server.close();
    }
    row.pixels = await diffPixels(shots.full, shots.islands);
    const a = fp.full, b = fp.islands;
    row.computed = { elements: a.length, elementsIslands: b.length, differing: a.length === b.length ? a.filter((r, i) => r !== b[i]).length : 'length differs', firstDiff: a.length === b.length ? (a.map((r, i) => (r !== b[i] ? [r, b[i]] : null)).find(Boolean) ?? null) : null };
    results.push(row);
  }
}
await browser.close();
await pool.close();
console.log(JSON.stringify(results, null, 1));
