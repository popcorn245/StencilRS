// Check a patched standalone build (bench-stencil-build.mjs) against the stock one.
//
//   node bench-stencil-build.mjs 1 --keep && node check-standalone.mjs
//
// 1. Both outputs have the same files (and how many .js files are byte-identical).
// 2. Each variant's pop-*.js entry is imported in its own process under jsdom (the module
//    auto-defines its component and dependencies); then every tag is created, connected and
//    rendered, and the two runs are compared: custom element metadata (observed attributes,
//    proxied members), light DOM and shadow DOM markup, adopted/injected styles, and errors.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = join(root, '.bench/out');

if (process.argv[2] === '--snapshot') {
  const [dir, dest] = process.argv.slice(3);
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

  const entries = readdirSync(dir).filter((f) => /^pop-.+\.js$/.test(f)).sort();
  const result = {};
  for (const file of entries) {
    const tag = file.slice(0, -3);
    errors.length = 0;
    try {
      await import(join(dir, file));
    } catch (e) {
      result[tag] = { importError: String(e?.message ?? e).slice(0, 300) };
      continue;
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

const ls = (d) => readdirSync(d, { recursive: true }).filter((f) => /\.(js|ts)$/.test(f)).sort();
const stockFiles = ls(join(out, 'stock'));
const patchedFiles = ls(join(out, 'patched'));
let bad = 0;
const report = (ok, msg) => {
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
};
report(JSON.stringify(stockFiles) === JSON.stringify(patchedFiles), `same ${stockFiles.length} output files`);

let identical = 0;
for (const f of stockFiles.filter((f) => f.endsWith('.js'))) {
  if (readFileSync(join(out, 'stock', f), 'utf8') === readFileSync(join(out, 'patched', f), 'utf8')) identical++;
}
const jsCount = stockFiles.filter((f) => f.endsWith('.js')).length;
console.log(`      ${identical} / ${jsCount} .js files are byte-identical; the rest differ where stencilrs writes \`X=class…;proxy(X,meta)\` and Stencil \`X=proxy(class…,meta)\` (and the minifier names things differently after that)`);

const snap = {};
for (const v of ['stock', 'patched']) {
  const dest = join(out, `${v}-snapshot.json`);
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--snapshot', join(out, v), dest], { cwd: root, encoding: 'utf8' });
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
process.exit(bad ? 1 : 0);
