// Check a patched build (bench-stencil-build.mjs) against the stock one.
//
//   node bench-stencil-build.mjs 1 --keep && node check-standalone.mjs [standalone|loader-bundle|www|all]
//
// The target (default: all, when the full config was built) picks the output directory under
// .bench/out/<variant>/ (a standalone-config build puts its files directly in .bench/out/<variant>/).
// 1. Both outputs have the same files (and how many .js files are byte-identical; the lazy
//    bundles hash chunk names, so they are compared by behaviour only).
// 2. Each variant is loaded in its own process under jsdom, then every tag is created,
//    connected and rendered, and the two runs are compared: custom element metadata (observed
//    attributes, proxied members), light DOM and shadow DOM markup, adopted/injected styles,
//    and errors.
//      standalone     each pop-*.js entry is imported (it auto-defines its component and
//                     dependencies)
//      loader-bundle  loader-bundle/esm/loader.js: defineCustomElements(), components load lazily
//      www            www/build/pop.esm.js (the app bootstrap, same lazy bundle)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = join(root, '.bench/out');

if (process.argv[2] === '--snapshot') {
  const [dir, dest, target, tagsFile] = process.argv.slice(3);
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  const w = dom.window;
  for (const k of Object.getOwnPropertyNames(w)) if (!(k in globalThis)) Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true });
  for (const k of ['window', 'document', 'navigator', 'location', 'customElements', 'HTMLElement', 'Element', 'Node', 'CustomEvent', 'Event', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    Object.defineProperty(globalThis, k, { value: w[k], configurable: true, writable: true });
  }
  w.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  globalThis.matchMedia = w.matchMedia;
  // Editor.js, reveal.js and friends make random ids: same sequence in both runs.
  let seed = 12345;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  w.Math.random = Math.random;
  const errors = [];
  const origError = console.error;
  console.error = (...a) => errors.push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(' ').slice(0, 300));
  console.warn = console.info = console.log = () => {};
  w.addEventListener('error', (e) => errors.push(`error: ${e.message}`));
  process.on('unhandledRejection', (e) => errors.push(`unhandled: ${e?.message ?? e}`));

  const lazy = target !== 'standalone';
  const tags = lazy ? JSON.parse(readFileSync(tagsFile, 'utf8')) : readdirSync(dir).filter((f) => /^pop-.+\.js$/.test(f)).sort().map((f) => f.slice(0, -3));
  const result = {};
  if (lazy) {
    try {
      const m = await import(join(dir, target === 'www' ? 'build/pop.esm.js' : 'esm/loader.js'));
      await m.defineCustomElements?.(window);
    } catch (e) {
      console.error = origError;
      console.error('bootstrap failed', e);
      process.exit(1);
    }
  }
  for (const tag of tags) {
    errors.length = 0;
    if (!lazy) {
      try {
        await import(join(dir, `${tag}.js`));
      } catch (e) {
        result[tag] = { importError: String(e?.message ?? e).slice(0, 300) };
        continue;
      }
    }
    const ctor = customElements.get(tag);
    if (!ctor) {
      result[tag] = { notDefined: true };
      continue;
    }
    const el = document.createElement(tag);
    document.body.append(el);
    await Promise.race([el.componentOnReady?.(), new Promise((r) => setTimeout(r, 300))]).catch((e) => errors.push(`ready: ${e?.message ?? e}`));
    await new Promise((r) => setTimeout(r, 400));
    result[tag] = {
      observed: [...(ctor.observedAttributes ?? [])].sort(),
      members: Object.getOwnPropertyNames(ctor.prototype).filter((n) => !n.startsWith('__') && n !== 'constructor').sort(),
      html: el.outerHTML.replace(/data-id="[^"]*"/g, 'data-id="_"').replace(/editor-js-\w+/g, 'editor-js-_'),
      shadow: el.shadowRoot?.innerHTML ?? null,
      adopted: (el.shadowRoot?.adoptedStyleSheets ?? []).length,
      errors: [...errors],
    };
    el.remove();
  }
  result['<head>'] = [...document.head.querySelectorAll('style')].map((s) => s.textContent).sort();
  writeFileSync(dest, JSON.stringify(result, null, 1));
  console.error = origError;
  process.exit(0);
}

const hasSub = existsSync(join(out, 'stock/standalone'));
const requested = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : 'all';
const targets = requested === 'all' ? (hasSub ? ['standalone', 'loader-bundle', 'www'] : ['standalone']) : [requested];
let bad = 0;
const report = (ok, msg) => {
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};
const ls = (d) => readdirSync(d, { recursive: true }).filter((f) => /\.(js|ts)$/.test(f)).sort();
const dirOf = (v, target) => (hasSub ? join(out, v, target) : join(out, v));
// the tags the lazy bundles register: the standalone entries' names
const tagsFile = join(out, 'tags.json');
writeFileSync(tagsFile, JSON.stringify(readdirSync(dirOf('stock', 'standalone')).filter((f) => /^pop-.+\.js$/.test(f)).sort().map((f) => f.slice(0, -3))));

for (const target of targets) {
  console.log(`\n== ${target}`);
  const stockFiles = ls(dirOf('stock', target));
  const patchedFiles = ls(dirOf('patched', target));
  const lazyTarget = target !== 'standalone';
  if (lazyTarget) report(stockFiles.length === patchedFiles.length, `${stockFiles.length} / ${patchedFiles.length} output .js/.ts files (stock / patched)`);
  else report(JSON.stringify(stockFiles) === JSON.stringify(patchedFiles), `same ${stockFiles.length} output files`);
  let identical = 0;
  for (const f of stockFiles.filter((f) => f.endsWith('.js'))) {
    if (patchedFiles.includes(f) && readFileSync(join(dirOf('stock', target), f), 'utf8') === readFileSync(join(dirOf('patched', target), f), 'utf8')) identical++;
  }
  const jsCount = stockFiles.filter((f) => f.endsWith('.js')).length;
  console.log(`      ${identical} / ${jsCount} .js files are byte-identical; the rest differ where stencilrs and Stencil print the same code differently (and the minifier names things differently after that)`);

  const snap = {};
  for (const v of ['stock', 'patched']) {
    const dest = join(out, `${v}-${target}-snapshot.json`);
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--snapshot', dirOf(v, target), dest, target, tagsFile], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) {
      console.log(r.stdout + r.stderr);
      report(false, `${v}: snapshot run failed`);
      process.exit(1);
    }
    snap[v] = JSON.parse(readFileSync(dest, 'utf8'));
  }
  const tags = Object.keys(snap.stock).filter((t) => t !== '<head>');
  const differing = tags.filter((t) => JSON.stringify(snap.stock[t]) !== JSON.stringify(snap.patched[t]));
  const broken = tags.filter((t) => snap.stock[t].importError || snap.stock[t].notDefined);
  report(differing.length === 0, `${tags.length - differing.length} / ${tags.length} components behave identically under jsdom (metadata, light + shadow DOM, adopted styles, errors)${differing.length ? `; differ: ${differing.join(', ')}` : ''}`);
  report(JSON.stringify(snap.stock['<head>']) === JSON.stringify(snap.patched['<head>']), `injected <style> elements identical (${snap.stock['<head>'].length})`);
  const withErrors = tags.filter((t) => snap.stock[t].errors?.length);
  console.log(`      (stock itself: ${broken.length} entries fail to import or define, ${withErrors.length} log errors; they must match, not be zero)`);
}
process.exit(bad ? 1 : 0);
