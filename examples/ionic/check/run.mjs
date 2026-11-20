// The stencilrs build of Ionic core against the `stencil build` one, in headless Chrome.
//
//   node check/run.mjs [--shots <dir>]        (npm run check)
//
// 1. smoke/run.mjs on both builds: button, card, list, toggle, modal; ios and md.
// 2. The smoke screenshots of the two builds, compared pixel by pixel.
// 3. Every component of docs.json (94 tags), the internal ones (ion-select-popover), and ion-icon mounted in both modes in each build: defined,
//    hydrated, shadow root exactly where the encapsulation says (shadow / scoped / none), no console error
//    or page error, and the same rendered result in both builds (host and shadow DOM, size, the scope ids
//    in the styles), and the same CSS text (whitespace aside; CSS_DIFFERENCES lists the two exceptions and why).
// Exits 1 on the first kind of failure that is found (all failures of that step are printed).
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';
import { root } from '../scripts/paths.mjs';

const args = process.argv.slice(2);
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : join(root, 'smoke', 'shots');
const BUILDS = { stencil: 'dist-stencil', stencilrs: 'dist-stencilrs' };
const ENTRY = { stencil: '/build/dist/ionic/ionic.esm.js', stencilrs: '/build/ionic.js' };
for (const [name, dir] of Object.entries(BUILDS)) {
  if (!existsSync(join(root, dir, name === 'stencilrs' ? 'ionic.js' : 'dist/ionic/ionic.esm.js'))) {
    console.error(`${dir}/ has no build: run npm run build:${name}`);
    process.exit(1);
  }
}
let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

// ---- 0. nothing fell back to Stencil's compiler ------------------------------------------------------------------
console.log('== stencilrs compiled every component itself');
{
  const log = readFileSync(join(root, 'logs', 'stencilrs.log'), 'utf8');
  const summary = log.match(/\[stencilrs\] compiled (\d+) component file\(s\); (\d+) left to Stencil's compiler/);
  if (!summary) fail('logs/stencilrs.log has no [stencilrs] summary: run npm run build:stencilrs');
  else if (summary[2] !== '0') {
    fail(`${summary[2]} of ${summary[1]} files left to Stencil's compiler:`);
    for (const l of log.split('\n').filter((l) => /using Stencil's compiler/.test(l))) console.log(`       ${l.trim()}`);
  } else console.log(`  ok   ${summary[1]} component files compiled by stencilrs, 0 left to Stencil's compiler`);
}

// No Chromium (CI without a browser download): the build steps above still ran, the browser ones cannot.
try {
  const probe = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  await probe.close();
} catch (err) {
  if (process.env.IONIC_REQUIRE_BROWSER) throw err;
  console.log(`\n  skipped the browser checks: no Chromium found (set CHROME_PATH, or run npx playwright install chromium; IONIC_REQUIRE_BROWSER=1 makes this an error)`);
  process.exit(failures ? 1 : 0);
}

// ---- 1. smoke -----------------------------------------------------------------------------------------------
for (const name of Object.keys(BUILDS)) {
  console.log(`\n== smoke: ${name}`);
  const r = spawnSync(process.execPath, [join(root, 'smoke', 'run.mjs'), name, '--shots', shotsDir], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) fail(`smoke on ${name} exited ${r.status}`);
}

// ---- a server for both builds ---------------------------------------------------------------------------------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.map': 'application/json' };
const serve = (base, rel, res) => {
  const file = normalize(join(base, rel));
  if (!file.startsWith(base) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
};
const pageFor = (name) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,"><link rel="stylesheet" href="/${name}/css/core.css"><link rel="stylesheet" href="/${name}/css/normalize.css"><link rel="stylesheet" href="/${name}/css/structure.css"><link rel="stylesheet" href="/${name}/css/typography.css">
<script type="module" src="/${name}${ENTRY[name].slice('/build'.length)}"></script></head><body style="position:static;overflow:auto"></body></html>`;
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const [, first, ...rest] = path.split('/');
  if (first === 'mount') return void res.writeHead(200, { 'content-type': 'text/html' }).end(pageFor(rest[0]));
  if (BUILDS[first]) return serve(join(root, BUILDS[first]), rest.join('/'), res);
  res.writeHead(404).end();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

// ---- 2. pixels --------------------------------------------------------------------------------------------------
console.log('\n== screenshots, stencil vs stencilrs');
{
  const page = await browser.newPage();
  for (const shot of ['ios', 'md', 'ios-page', 'md-page']) {
    const [a, b] = ['stencil', 'stencilrs'].map((n) => readFileSync(join(shotsDir, `${n}-${shot}.png`)).toString('base64'));
    // Decode both PNGs on a canvas and count differing pixels.
    const diff = await page.evaluate(async ([a, b]) => {
      const load = (b64) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height));
          };
          img.onerror = reject;
          img.src = `data:image/png;base64,${b64}`;
        });
      const [x, y] = await Promise.all([load(a), load(b)]);
      if (x.width !== y.width || x.height !== y.height) return { size: [x.width, x.height, y.width, y.height] };
      let n = 0;
      let max = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const d = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]), Math.abs(x.data[i + 3] - y.data[i + 3]));
        if (d) n++;
        if (d > max) max = d;
      }
      return { n, max, total: x.width * x.height };
    }, [a, b]);
    if (diff.size) fail(`${shot}: sizes differ ${diff.size.join(' ')}`);
    // Pixel for pixel: the stylesheets are the same CSS (a lowered `translate3d(x, 0, 0)` once cost the ios toggle its compositing layer).
    else if (diff.n) fail(`${shot}: ${diff.n} of ${diff.total} pixels differ, by up to ${diff.max} levels`);
    else console.log(`  ok   ${shot}: identical (${diff.total} pixels)`);
  }
  await page.close();
}

// ---- 3. every component ----------------------------------------------------------------------------------------
const docs = JSON.parse(readFileSync(join(root, 'dist-stencil', 'docs.json'), 'utf8'));
const expected = new Map(docs.components.map((c) => [c.tag, c.encapsulation]));
// docs.json leaves out `internal: true` components (ion-select-popover): they come from the source.
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
for (const file of walk(join(root, 'migrated', 'src', 'components')).filter((f) => f.endsWith('.tsx'))) {
  const code = readFileSync(file, 'utf8');
  const tag = code.match(/@Component\(\{[^}]*?\btag:\s*'([^']+)'/s)?.[1];
  if (tag && !expected.has(tag)) expected.set(tag, code.match(/encapsulation:\s*\{\s*type:\s*'(\w+)'/)?.[1] ?? 'none');
}
const tags = [...expected.keys(), 'ion-icon'];
console.log(`\n== ${docs.components.length} components of docs.json + ${expected.size - docs.components.length} internal + ion-icon, both modes, both builds`);

const CONTEXT_DIAGNOSTIC = /^console\.(error|warning): (\[Ionic (Error|Warning)\]|<ion-[a-z-]+> must be used inside)/;
// The same diagnostics, per tag, in both builds.
const diagnostics = (m) => Object.fromEntries(tags.map((t) => [t, m.results[t].errors.map((e) => e.replace(/JSHandle@\w+/, '')).sort()]));
// The CSS text of a stylesheet, without the whitespace the two minifiers disagree on.
const squash = (css) => css.replace(/\s*([,:;{}()])\s*/g, '$1').replace(/;}/g, '}');
// The scope ids a stylesheet uses (`sc-ion-label-ios-h`, ...): a mismatch with the classes on the element
// means the scoped rules never apply.
// Component stylesheets that are not the same CSS text in both builds, and why (everything else must be identical:
// the plugin autoprefixes for the same browsers as `stencil build` and keeps lightningcss' values, vite-css.js).
const CSS_DIFFERENCES = {
  'ion-icon': `not this plugin's CSS: stencilrs uses ionicons' prebuilt ion-icon.js, with the stylesheet ionicons shipped; \`stencil build\` compiles ion-icon from source and orders its declarations differently`,
  'md:ion-select': `selector written twice in select.md.scss's Sass output (':host(.select-fill-outline) .label-text-wrapper, :host(.select-fill-outline) .label-text-wrapper'): Stencil's own minifier drops the duplicate, lightningcss without minify keeps it`,
};
const scopeIds = (css) => [...new Set(css.match(/sc-[a-z0-9-]+/g) ?? [])].sort().join(' ');
// Class lists in markup are sets: the order a class is added in can depend on timing, and ion-datetime's wheels
// mark the active option (`option-active`) a frame or two after they are laid out.
const sortClasses = (html) => unclock(sortClassesIn(html));
// ion-datetime shows the time of day.
const unclock = (html) => (html == null ? html : html.replace(/\b\d{1,2}:\d\d (AM|PM)\b/g, '<time>'));
const sortClassesIn = (html) => (html == null ? html : html.replace(/class=\\?"([^"\\]*)\\?"/g, (_, c) => `class="${c.split(/\s+/).filter((k) => k !== 'option-active').sort().join(' ')}"`));

const measure = async (name, mode) => {
  const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
  const log = [];
  const note = (s) => log.push(s);
  page.on('pageerror', (e) => note(`pageerror: ${e.message}`));
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && note(`console.${m.type()}: ${m.text()}`));
  page.on('requestfailed', (r) => note(`request failed: ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && note(`HTTP ${r.status()}: ${r.url()}`));
  await page.goto(`${origin}/mount/${name}?ionic:mode=${mode}`);
  await page.waitForFunction(() => window.Ionic?.mode, null, { timeout: 15000 }).catch(() => note('Ionic.mode never set'));
  const results = {};
  for (const tag of tags) {
    const before = log.length;
    const mounted = await page
      .evaluate(
        async (tag) => {
          await customElements.whenDefined(tag);
          const el = document.createElement(tag);
          el.id = `t-${tag}`;
          if (tag === 'ion-datetime') el.setAttribute('value', '2024-01-15T10:30:00'); // not the time of day
          document.body.appendChild(el);
          const t0 = performance.now();
          while (!el.classList.contains('hydrated') && performance.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 20));
          return el.classList.contains('hydrated');
        },
        tag,
      )
      .catch((e) => `mount threw: ${e.message.split('\n')[0]}`);
    await page.waitForTimeout(30);
    results[tag] = { mounted, errors: log.slice(before) };
  }
  await page.waitForTimeout(1500);
  const states = await page.evaluate((tags) => {
    const out = {};
    for (const tag of tags) {
      const el = document.getElementById(`t-${tag}`);
      const r = el.getBoundingClientRect();
      const sheets = el.shadowRoot ? [...el.shadowRoot.adoptedStyleSheets].map((s) => [...s.cssRules].map((x) => x.cssText).join('\n')) : [];
      const styleTags = el.shadowRoot ? [...el.shadowRoot.querySelectorAll('style')].map((s) => s.textContent) : [];
      out[tag] = {
        defined: !!customElements.get(tag),
        hydrated: el.classList.contains('hydrated'),
        shadow: !!el.shadowRoot,
        scopeClass: [...el.classList].filter((c) => /^sc-/.test(c)).join(' '),
        mode: [...el.classList].filter((c) => c === 'ios' || c === 'md').join(' '),
        host: el.outerHTML.replace(el.innerHTML, '').slice(0, 400),
        light: el.innerHTML,
        shadowHtml: el.shadowRoot?.innerHTML ?? null,
        styles: [...sheets, ...styleTags].join('\n/*--*/\n'),
        size: [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10],
      };
    }
    // The stylesheets scoped components put in <head> (sorted: the order is the order they were first used).
    out.__head = [...document.head.querySelectorAll('style')].map((s) => s.textContent).sort();
    out.__htmlMode = document.documentElement.getAttribute('mode');
    return out;
  }, tags);
  await page.close();
  return { results, states, log };
};

const all = {};
for (const name of Object.keys(BUILDS)) {
  for (const mode of ['ios', 'md']) {
    const m = await measure(name, mode);
    all[`${name}/${mode}`] = m;
    const bad = [];
    if (m.states.__htmlMode !== mode) bad.push(`<html mode> is ${m.states.__htmlMode}`);
    for (const tag of tags) {
      const s = m.states[tag];
      const r = m.results[tag];
      const enc = tag === 'ion-icon' ? 'shadow' : expected.get(tag);
      if (!s.defined) bad.push(`${tag}: not defined`);
      if (r.mounted !== true || !s.hydrated) bad.push(`${tag}: not hydrated (${r.mounted})`);
      if ((enc === 'shadow') !== s.shadow) bad.push(`${tag}: shadow root ${s.shadow}, declared ${enc}`);
      if (enc === 'scoped' && !s.scopeClass) bad.push(`${tag}: scoped but has no sc-* class`);
      if (enc !== 'scoped' && s.scopeClass) bad.push(`${tag}: has scope class ${s.scopeClass} but is ${enc}`);
      if (tag !== 'ion-icon' && enc !== 'none' && !s.styles && !m.states.__head.length) bad.push(`${tag}: no styles`);
      // A bare element outside its context says so itself (Ionic's printIonError / printIonWarning, and a few
      // console.errors): that is the component working. Anything else is a failure.
      for (const e of r.errors) if (!CONTEXT_DIAGNOSTIC.test(e)) bad.push(`${tag}: ${e}`);
    }
    for (const e of m.log.filter((l) => !tags.some((t) => m.results[t].errors.includes(l)))) bad.push(`outside a mount: ${e}`);
    if (bad.length) bad.forEach((b) => fail(`${name}/${mode}: ${b}`));
    else console.log(`  ok   ${name}/${mode}: ${tags.length} tags defined, hydrated, encapsulation as declared, no errors`);
  }
}

console.log('\n== stencil vs stencilrs');
const clip = (s, n = 160) => (s == null ? String(s) : s.length > n ? s.slice(0, n) + '...' : s);
for (const mode of ['ios', 'md']) {
  const a = all[`stencil/${mode}`];
  const b = all[`stencilrs/${mode}`];
  let differing = 0;
  let sameCss = 0;
  const known = [];
  for (const tag of tags) {
    const x = a.states[tag];
    const y = b.states[tag];
    if (squash(x.styles) === squash(y.styles)) sameCss++;
    else if (!CSS_DIFFERENCES[`${mode}:${tag}`] && !CSS_DIFFERENCES[tag]) {
      const [p, q] = [squash(x.styles), squash(y.styles)];
      let i = 0;
      while (i < p.length && p[i] === q[i]) i++;
      fail(`${mode} ${tag}: stylesheet text differs, first at ${i}\n        stencil   ...${p.slice(Math.max(0, i - 60), i + 100)}\n        stencilrs ...${q.slice(Math.max(0, i - 60), i + 100)}`);
    } else known.push(`${mode} ${tag}: ${CSS_DIFFERENCES[`${mode}:${tag}`] ?? CSS_DIFFERENCES[tag]}`);
    for (const st of [x, y]) {
      st.scopeIds = scopeIds(st.styles);
      st.styles = undefined;
      for (const k of ['host', 'light', 'shadowHtml']) st[k] = sortClasses(st[k]);
    }
    const keys = ['shadow', 'scopeClass', 'mode', 'host', 'light', 'shadowHtml', 'scopeIds', 'size'].filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
    if (keys.length) {
      differing++;
      fail(`${mode} ${tag}: differs in ${keys.join(', ')}`);
      for (const k of keys.slice(0, 2)) {
        const [p, q] = [JSON.stringify(x[k]), JSON.stringify(y[k])];
        let i = 0;
        while (i < p.length && p[i] === q[i]) i++;
        const around = (t) => t.slice(Math.max(0, i - 50), i + 90);
        console.log(`      ${k}, first difference at ${i}\n        stencil   ...${around(p)}\n        stencilrs ...${around(q)}`);
      }
    }
  }
  const [dx, dy] = [diagnostics(a), diagnostics(b)];
  for (const tag of tags) if (JSON.stringify(dx[tag]) !== JSON.stringify(dy[tag])) fail(`${mode} ${tag}: console output differs: ${JSON.stringify(dx[tag])} vs ${JSON.stringify(dy[tag])}`);
  // (the lazy loader also adds a `visibility: hidden` rule for not-yet-hydrated components: no scope ids, not compared)
  const [hx, hy] = [a.states.__head, b.states.__head].map((h) => h.map(scopeIds).filter(Boolean).sort());
  if (JSON.stringify(hx) !== JSON.stringify(hy)) {
    fail(`${mode}: <head> stylesheets use different scope ids`);
    for (const h of hx.filter((v) => !hy.includes(v))) console.log(`      only in stencil:   ${clip(h, 200)}`);
    for (const h of hy.filter((v) => !hx.includes(v))) console.log(`      only in stencilrs: ${clip(h, 200)}`);
  }
  for (const k of known) console.log(`       known: ${k}`);
  if (!differing && JSON.stringify(hx) === JSON.stringify(hy)) console.log(`  ok   ${mode}: ${tags.length} components render the same (DOM, scope ids, size); ${sameCss} of ${tags.length} component stylesheets are identical CSS text (${known.length} listed differences), ${hx.length} <head> stylesheets`);
}

// ---- 4. attributes drive props ----------------------------------------------------------------------------------
// `color` is `Color = LiteralUnion<PredefinedColors, string>` (a generic alias with an intersection): its runtime type
// is `string`, so the attribute is observed and reflected. Compiled as `unknown` ([16]) it was neither (#75).
console.log('\n== attributes drive props (ion-button color), both builds');
for (const name of Object.keys(BUILDS)) {
  const page = await browser.newPage();
  await page.goto(`${origin}/mount/${name}`);
  const r = await page.evaluate(async () => {
    await customElements.whenDefined('ion-button');
    const el = document.createElement('ion-button');
    el.setAttribute('color', 'danger');
    document.body.append(el);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const first = { prop: el.color, cls: el.classList.contains('ion-color-danger') };
    el.setAttribute('color', 'success');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const changed = { prop: el.color, danger: el.classList.contains('ion-color-danger'), success: el.classList.contains('ion-color-success') };
    el.color = 'warning';
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { first, changed, reflected: el.getAttribute('color'), warning: el.classList.contains('ion-color-warning') };
  });
  const ok = r.first.prop === 'danger' && r.first.cls && r.changed.prop === 'success' && !r.changed.danger && r.changed.success && r.reflected === 'warning' && r.warning;
  if (ok) console.log(`  ok   ${name}: <ion-button color="danger"> gets ion-color-danger; the attribute is observed on change and the property is reflected`);
  else fail(`${name}: ion-button color attribute: ${JSON.stringify(r)}`);
  await page.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
