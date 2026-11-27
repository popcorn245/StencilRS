// Issue #194: does the stencilrs Vite plugin's hydrating client (`hydrateClient`) adopt what the stencilrs hydrate app rendered?
//
//   npm run build:hydrate                                             (dist/hydrate-stencilrs)
//   IONIC_HYDRATE_CLIENT=1 IONIC_OUT_DIR=$PWD/dist-hydrate-client node node_modules/vite/bin/vite.js build --config vite.config.ts
//   node spike/islands/hydrating-client.mjs [list-50|kitchen-sink] [dsd|scoped]
//
// Renders the page with the hydrate app, serves it with the per-component client (init.js, then components/<tag>.js for the tags the page
// uses, from components.json), and reports: server nodes adopted (identity survives), console errors, interaction, and the DOM compared
// with the one a reference client produced (ISLANDS_REFERENCE_DIR: Stencil's own build, the spike's `dist-client`, if present).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { hydrationReport } from './islands.mjs';
import { PAGES, MODES, ionicRoot, launch, loadHydrate, renderOptions, serve } from './lib.mjs';

export const ONE_BUNDLE_DIR = process.env.IONIC_ONE_BUNDLE_DIR ?? join(ionicRoot, 'dist-hydrate-onebundle');
export const HYDRATING_DIR = process.env.IONIC_HYDRATE_CLIENT_DIR ?? join(ionicRoot, 'dist-hydrate-client');

/** The boot script of the page under test: the global script, then every tag of the manifest the document (shadow roots included) uses. */
export const bootScript = (base = '/client/') => `
const manifest = await (await fetch('${base}components.json')).json();
await import('${base}init.js');
const used = new Set();
const scan = (root) => {
  for (const el of root.querySelectorAll('*')) {
    if (manifest.tags[el.localName]) used.add(el.localName);
    if (el.shadowRoot) scan(el.shadowRoot);
  }
};
scan(document);
window.__tags = [...used];
// A component module defines its tag when it is evaluated, and an element is upgraded at that moment: \`ion-tabs\` sets \`active\` on its
// \`ion-tab\`s in componentWillLoad, and a tab that is not defined yet takes the value as an own property that its constructor's own
// \`this.active = false\` then overwrites. So: load every module with \`define\` held back, then define them all in one synchronous go
// (the lazy loader registers all its tags at once too); componentWillLoad runs in a microtask, after the last of them.
const defined = [];
const define = customElements.define;
customElements.define = (...args) => void defined.push(args);
await Promise.all([...used].map((t) => import('${base}' + manifest.tags[t])));
customElements.define = define;
for (const args of defined) customElements.get(args[0]) || define.apply(customElements, args);
`;

/** Bytes of what a page loads (static imports only; `entries` the bundle's own entry, default the global script): the tags' modules and the chunks they import (transitively, from the manifest), raw and gzip. */
export const clientBytes = (dir, tags, entries = ['init.js']) => {
  const manifest = existsSync(join(dir, 'components.json')) ? JSON.parse(readFileSync(join(dir, 'components.json'), 'utf8')) : { tags: {} };
  const files = new Set(entries);
  const imports = (f, seen) => {
    const src = readFileSync(join(dir, f), 'utf8').replace(/\bimport\(\s*"[^"]*"\s*\)/g, '');
    for (const m of src.matchAll(/(?:from|import)\s*"(\.{1,2}\/[^"]+)"/g)) {
      const rel = join(f, '..', m[1]);
      if (!seen.has(rel)) imports(rel, seen.add(rel));
    }
  };
  for (const f of [...entries, ...tags.map((t) => manifest.tags[t])]) {
    files.add(f);
    imports(f, files);
  }
  let raw = 0;
  let gz = 0;
  for (const f of files) {
    const b = readFileSync(join(dir, f));
    raw += b.length;
    gz += gzipSync(b, { level: 9 }).length;
  }
  return { files: files.size, raw, gzip: gz };
};

const sizeOfDir = (dir, ext = '.js') => {
  let raw = 0;
  let gz = 0;
  let n = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const f = join(d, name);
      if (statSync(f).isDirectory()) walk(f);
      else if (f.endsWith(ext)) {
        const b = readFileSync(f);
        raw += b.length;
        gz += gzipSync(b, { level: 9 }).length;
        n++;
      }
    }
  };
  walk(dir);
  return { files: n, raw, gzip: gz };
};

if (process.argv[1]?.endsWith('hydrating-client.mjs')) {
  const pageName = process.argv[2] ?? 'list-50';
  const modeName = process.argv[3] ?? 'dsd';
  const hydrate = await loadHydrate();
  const html = (await hydrate.renderToString(PAGES[pageName].full(), { ...renderOptions(MODES[modeName]), fullDocument: true })).html;
  const { server, origin } = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) }, { clientDir: HYDRATING_DIR });
  const browser = await launch();
  const report = await hydrationReport(browser, origin, html, '/', bootScript());
  const tags = await (async () => {
    const p = await browser.newPage();
    await p.goto(origin, { waitUntil: 'load' });
    await p.addScriptTag({ type: 'module', content: bootScript() });
    await p.waitForFunction(() => window.__tags, null, { timeout: 30000 });
    const t = await p.evaluate(() => window.__tags);
    await p.close();
    return t;
  })();
  server.close();
  const { sig, sigNoCtx, ...rest } = report;
  // The reference: Stencil's own client of the same source (the spike's `dist-client`: `stencil build --dev` with an ssr target), lazy loader.
  const refDir = process.env.ISLANDS_REFERENCE_DIR ?? join(ionicRoot, 'dist-client');
  let reference = null;
  if (existsSync(join(refDir, 'dist/ionic/ionic.esm.js'))) {
    const ref = await serve({ '/': (_q, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html) }, { clientDir: refDir });
    const r = await hydrationReport(browser, ref.origin, html);
    ref.server.close();
    reference = { total: r.total, adopted: r.adopted, errors: r.errors.length, sameDomAsReference: r.sig === sig, sameDomAsReferenceIgnoringHostContext: r.sigNoCtx === sigNoCtx };
    if (process.env.ISLANDS_DUMP_SIG) (await import('node:fs')).writeFileSync(`${process.env.ISLANDS_DUMP_SIG}.ref`, r.sig), (await import('node:fs')).writeFileSync(`${process.env.ISLANDS_DUMP_SIG}.mine`, sig);
    if (r.sig !== sig) {
      let i = 0;
      while (i < sig.length && sig[i] === r.sig[i]) i++;
      reference.firstDifference = { stencilrs: sig.slice(Math.max(0, i - 80), i + 120), reference: r.sig.slice(Math.max(0, i - 80), i + 120) };
    }
  }
  await browser.close();
  console.log(JSON.stringify({ page: pageName, mode: modeName, ...rest, reference, tags: tags.length, bytes: clientBytes(HYDRATING_DIR, tags), oneBundle: existsSync(join(ONE_BUNDLE_DIR, 'ionic.js')) ? clientBytes(ONE_BUNDLE_DIR, [], ['ionic.js']) : null, allComponents: sizeOfDir(HYDRATING_DIR) }, null, 1));
  if (!existsSync(HYDRATING_DIR)) process.exitCode = 1;
}
