// Server-render smoke test: the ui-kit, compiled by stencilrs for Stencil's hydrate runtime.
//
//   node ssr/smoke.mjs [--no-reference]     (npm run test:ssr)
//
//   build        the hydrate app and the client bundle from stencilrs' output (`ssr/build.mjs`)
//                and, as the reference, Stencil v5's own `ssr` + `loader-bundle` build
//   renderToString  the hydrate app renders the page in Node: every component rendered, and
//                the HTML equal to Stencil's own hydrate app's (stylesheet text aside: Vite
//                minifies CSS, Stencil does not)
//   happy-dom    the client bundle loads over that HTML in happy-dom
//   browser      the same in Chromium (Playwright): content present with JavaScript off, then
//                the server's elements adopted rather than re-rendered, and the switch works.
//                Skipped, not failed, when there is no Chromium (see hydrate-browser.mjs).
//
// Known upstream: @stencil/core 5.0.0-beta.25's client runtime throws "Cannot read properties of
// undefined (reading 'length')" in `patch` while hydrating childless elements. Stencil's own
// lazy build does exactly the same on its own server render, so it is expected on both sides, and
// any other error fails the step.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildClient, buildHydrate } from './build.mjs';
import { findChromium, hydrateInBrowser } from './hydrate-browser.mjs';
import { PAGE, RENDERED, TAGS } from './page.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reference = !process.argv.includes('--no-reference');
const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
  console.log(`    ${ok ? '✓' : '✗'} ${what}`);
};
const step = async (name, fn) => {
  console.log(`\n▶ ${name}`);
  try {
    await fn();
  } catch (e) {
    check(false, `${name} threw: ${e.stack ?? e}`);
  }
};
const UPSTREAM = /reading 'length'/;
const unexpected = (errors) => errors.filter((e) => !UPSTREAM.test(e));

let hydrateFile;
let html;
let stencilHtml;

await step('build: hydrate app and client bundle from stencilrs, reference from Stencil', async () => {
  hydrateFile = await buildHydrate();
  const client = await buildClient();
  check(statSync(hydrateFile).size > 1e6 && statSync(client).size > 1e6, 'dist/hydrate/index.js and dist/hydrate-client/components.js built');
  if (!reference) return;
  for (const dir of ['dist/hydrate-stencil', 'dist/lazy-stencil']) rmSync(join(root, dir), { recursive: true, force: true });
  const stencil = spawnSync('npx', ['stencil', 'build', '--config', 'stencil.ssr.config.ts'], { cwd: root, encoding: 'utf8' });
  check(stencil.status === 0 && existsSync(join(root, 'dist/hydrate-stencil/index.js')) && existsSync(join(root, 'dist/lazy-stencil/loader/index.js')), `Stencil v5 built its own hydrate app and lazy client${stencil.status ? `: ${(stencil.stdout + stencil.stderr).slice(-600)}` : ''}`);
});

await step('Node: renderToString from the hydrate app', async () => {
  const { renderToString } = await import(pathToFileURL(hydrateFile).href);
  const result = await renderToString(PAGE, {});
  html = result.html;
  check(result.diagnostics.length === 0, `no diagnostics${result.diagnostics.length ? `: ${JSON.stringify(result.diagnostics)}` : ''}`);
  check(result.hydratedCount === TAGS.length, `${result.hydratedCount} of ${TAGS.length} components rendered`);
  for (const tag of TAGS) check(new RegExp(`<${tag}[^>]* class="[^"]*hydrated`).test(html), `<${tag}> hydrated class`);
  for (const text of RENDERED) check(html.includes(text), `output has ${text}`);
  if (!reference) return;
  const stencil = await import(pathToFileURL(join(root, 'dist/hydrate-stencil/index.js')).href);
  stencilHtml = (await stencil.renderToString(PAGE, {})).html;
  const plain = (h) => h.replace(/data-stencil-build="[^"]*"/, '').replace(/(<style[^>]*>)[\s\S]*?<\/style>/g, '$1</style>');
  check(plain(html) === plain(stencilHtml), "HTML equals Stencil's own hydrate app's (stylesheet text aside)");
});

mkdirSync(join(root, 'dist/hydrate-smoke'), { recursive: true });
const pageFile = join(root, 'dist/hydrate-smoke/page.html');
if (html) writeFileSync(pageFile, html);

await step('happy-dom: the client bundle over the server render', async () => {
  const run = spawnSync(process.execPath, [join(root, 'ssr/hydrate-happy-dom.mjs'), pageFile, join(root, 'dist/hydrate-client/components.js')], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr || `exit ${run.status}`);
  const r = JSON.parse(run.stdout.trim().split('\n').pop());
  check(r.undefinedHosts.length === 0, 'every component tag is defined');
  // happy-dom's parser and attribute handling differ from a browser's (it re-renders a few leaf
  // elements and reads `checked=""` as off), so identity is held to most elements, not all.
  check(r.adopted >= r.total * 0.9, `the server's elements are still the page's (${r.adopted} of ${r.total} adopted; re-rendered: ${r.lost.join(', ') || 'none'})`);
  check(r.click.before !== r.click.after && r.click.events.length === 1 && r.click.events[0] === (r.click.after === 'true'), 'click toggles pop-switch and emits popChange');
  check(unexpected(r.errors).length === 0, `no errors besides the known upstream one${unexpected(r.errors).length ? `: ${unexpected(r.errors)[0]}` : ''}`);
});

await step('browser: hydration in Chromium', async () => {
  const { playwright, path } = await findChromium();
  if (!path) {
    console.log(`    - skipped: ${playwright ? 'no Chromium found (set STENCILRS_CHROMIUM or PLAYWRIGHT_BROWSERS_PATH)' : 'playwright is not installed'}`);
    return;
  }
  const r = await hydrateInBrowser({ html, clientDir: join(root, 'dist/hydrate-client'), executablePath: path });
  check(/Card\nDone/.test(r.withoutJs.text) && /42\nOPEN TASKS/.test(r.withoutJs.text) && r.withoutJs.text.includes('Save'), 'server render shows its content with JavaScript off');
  check(r.withoutJs.switchChecked === 'true' && r.withoutJs.shadowText === 'Where', 'including the switch state and the declarative shadow root');
  check(r.state.undefinedHosts.length === 0, 'every component tag is defined');
  check(r.state.adopted === r.state.total, `the server's ${r.state.total} elements are still the page's (${r.state.adopted} adopted)`);
  check(r.click?.before === 'true' && r.click.after === 'false' && r.click.on === false && r.click.events[0] === false, 'click toggles pop-switch and emits popChange(false)');
  check(unexpected(r.errors).length === 0, `no errors besides the known upstream one${unexpected(r.errors).length ? `: ${unexpected(r.errors)[0]}` : ''}`);
  if (reference) {
    const ref = await hydrateInBrowser({
      html: stencilHtml,
      clientDir: join(root, 'dist/lazy-stencil'),
      executablePath: path,
      entry: "import { defineCustomElements } from '/loader/index.js'; defineCustomElements();",
    });
    check(ref.state.adopted === ref.state.total, `reference: Stencil's own lazy client adopts ${ref.state.adopted} of ${ref.state.total} elements too`);
    check(ref.errors.some((e) => UPSTREAM.test(e)) === r.errors.some((e) => UPSTREAM.test(e)), 'reference: the same upstream error appears (or not) with Stencil\'s own client');
  }
});

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nserver-render smoke test passed');
process.exit(failures.length ? 1 : 0);
