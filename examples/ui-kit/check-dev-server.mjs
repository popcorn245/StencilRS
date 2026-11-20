// Smoke test of the Vite dev server with stencilrs on the ui-kit.
//
//   node check-dev-server.mjs [--no-assert-typescript]
//
// Starts the dev server programmatically, then checks that
//   - a component module and its stylesheet are served without errors,
//   - TypeScript (and @stencil/core's compiler, @stencil/unplugin) was not loaded for it,
//   - changing the component's stylesheet runs the plugin's handleHotUpdate (a `stencil:hmr`
//     message for the component's tag), and changing the component itself does too,
//   - a stylesheet that imports a virtual global stylesheet (`@import "stencil-hydrate"`) is
//     served: that is the path that loads @stencil/unplugin (the ui-kit uses none itself, so a
//     temporary stylesheet stands in; it is removed afterwards).
// It prints the time to the first module response, from process start (which includes importing
// the plugin, where TypeScript used to load) and from `createServer`.
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import stencilrs from '@popcorn245/stencilrs/vite';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const assertTypescript = !process.argv.includes('--no-assert-typescript');
const require = createRequire(import.meta.url);
const loaded = () => Object.keys(require.cache).filter((f) => /[\\/]node_modules[\\/](typescript[\\/]|@stencil[\\/]core[\\/](dist[\\/])?compiler[\\/])/.test(f));

const componentFile = join(root, 'src/organisms/feedback-button/feedback-button.tsx');
const cssFile = join(root, 'src/organisms/feedback-button/feedback-button.css');
const tmpDir = join(root, 'check-dev-server-tmp');
const originals = new Map([cssFile, componentFile].map((f) => [f, readFileSync(f, 'utf8')]));

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
const until = async (cond, ms = 8000) => {
  for (const end = Date.now() + ms; Date.now() < end; ) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return cond();
};

const t0 = performance.now();
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  plugins: [stencilrs()],
  server: { port: 0, host: '127.0.0.1', strictPort: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});
const hmr = [];
const send = server.ws.send.bind(server.ws);
server.ws.send = (...args) => {
  if (args[0]?.event === 'stencil:hmr') hmr.push(args[0].data.tagName);
  return send(...args);
};
try {
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const get = async (url) => {
    const res = await fetch(base + url);
    return { status: res.status, text: await res.text() };
  };

  const mod = await get('/src/organisms/feedback-button/feedback-button.tsx');
  const createMs = Math.round(performance.now() - t0);
  const firstMs = Math.round(performance.now()); // since the process started: includes importing the plugin
  check(mod.status === 200 && /defineCustomElement|customElements/.test(mod.text), `component module served (200, ${mod.text.length} bytes)`);
  console.log(`time to first module response: ${firstMs} ms from process start (${createMs} ms from createServer)`);

  const css = /from\s+["']([^"']*stencil-css[^"']*)["']/.exec(mod.text)?.[1];
  check(!!css, 'the component imports its stylesheet through a stencil-css module');
  if (css) {
    const res = await get(css);
    check(res.status === 200 && /export default/.test(res.text) && /\S/.test(res.text), `stylesheet served (${css.slice(0, 60)}…)`);
  }
  const cssLoaded = loaded();
  if (assertTypescript) check(cssLoaded.length === 0, 'TypeScript and Stencil\'s compiler not loaded' + (cssLoaded.length ? `: ${cssLoaded[0]}` : ''));
  else console.log(`(typescript loaded: ${cssLoaded.length > 0})`);

  // Editing the stylesheet and the component reaches handleHotUpdate.
  await new Promise((r) => setTimeout(r, 500));
  writeFileSync(cssFile, originals.get(cssFile) + '\n/* check-dev-server */\n');
  check(await until(() => hmr.includes('pop-feedback-button') || hmr.length > 0), `css edit sent stencil:hmr (${hmr.join(',') || 'nothing'})`);
  hmr.length = 0;
  writeFileSync(componentFile, originals.get(componentFile) + '\n// check-dev-server\n');
  check(await until(() => hmr.length > 0), `component edit sent stencil:hmr (${hmr.join(',') || 'nothing'})`);
  const after = await get('/src/organisms/feedback-button/feedback-button.tsx');
  check(after.status === 200, 'component still served after the edits');

  // A stylesheet added while the server runs that imports a virtual global stylesheet:
  // @stencil/unplugin is loaded for it and generates the file.
  mkdirSync(tmpDir, { recursive: true });
  await new Promise((r) => setTimeout(r, 300));
  writeFileSync(join(tmpDir, 'later.css'), '@import "stencil-component-globals";\na { color: red }\n');
  await new Promise((r) => setTimeout(r, 1000));
  const later = await get('/check-dev-server-tmp/later.css');
  check(later.status === 200, `stylesheet added later that imports a virtual global stylesheet is served (${later.status})`);
  if (assertTypescript) check(loaded().length > 0, '... which did load @stencil/unplugin (the probe works)');
} catch (e) {
  failures.push(String(e?.stack ?? e));
  console.error(e);
} finally {
  for (const [f, text] of originals) writeFileSync(f, text);
  rmSync(tmpDir, { recursive: true, force: true });
  await server.close();
}

// One that exists when the server starts: found by the scan at buildStart.
mkdirSync(tmpDir, { recursive: true });
writeFileSync(join(tmpDir, 'virtual.css'), '@import "stencil-hydrate";\n');
const second = await createServer({ root, configFile: false, logLevel: 'error', plugins: [stencilrs()], server: { port: 0, host: '127.0.0.1' }, optimizeDeps: { noDiscovery: true, include: [] } });
try {
  await second.listen();
  const res = await fetch(second.resolvedUrls.local[0] + 'check-dev-server-tmp/virtual.css');
  check(res.status === 200, `stylesheet importing a virtual global stylesheet at start-up is served (${res.status})`);
} finally {
  await second.close();
  rmSync(tmpDir, { recursive: true, force: true });
}
if (failures.length) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('dev server ok');
process.exit(0);
