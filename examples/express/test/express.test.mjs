// npm test   (after `npm run build`, which builds the ui-kit's hydrate app and client bundle)
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { stencilEngine } from '@popcorn245/stencilrs/express';

import { createApp } from '../app.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const uiKit = join(here, '../../ui-kit');
const built = existsSync(join(uiKit, 'dist/hydrate/index.js'));
const opts = { skip: built ? false : 'run `npm run build` first' };

const servers = [];
const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
    servers.push(server);
  });
after(() => servers.forEach((s) => s.close()));
const get = async (base, path) => {
  const res = await fetch(base + path);
  return { status: res.status, text: await res.text() };
};

describe('views through Express', opts, () => {
  test('EJS fills the locals in, then the components render', async () => {
    const { status, text } = await get(await listen(createApp()), '/');
    assert.equal(status, 200);
    assert.match(text, /Hello, Ada &lt;ada@example\.com&gt;/); // EJS escaped the local
    assert.match(text, /<pop-card[^>]* class="[^"]*hydrated/);
    assert.match(text, /role="switch" aria-checked="true"/);
    assert.match(text, />42<\/span>/); // a local became a prop, and the component rendered it
    assert.match(text, /<li>Write<\/li><li>Ship<\/li>/);
    assert.match(text, /<template shadowrootmode="open"/); // the default: declarative shadow DOM
  });

  test('a plain .html view needs no inner engine', async () => {
    const { status, text } = await get(await listen(createApp()), '/about');
    assert.equal(status, 200);
    assert.match(text, /class="chip sc-pop-chip/);
  });

  test('a fragment view renders without wrapping it in a document', async () => {
    const { text } = await get(await listen(createApp()), '/fragment');
    assert.ok(text.startsWith('<section>'), text.slice(0, 80));
    assert.match(text, /Fragment/);
    assert.doesNotMatch(text, /<html/);
  });

  test('the `stencil` local overrides renderOptions for one render', async () => {
    const base = await listen(createApp());
    const scoped = (await get(base, '/scoped')).text;
    assert.doesNotMatch(scoped, /shadowrootmode/);
    assert.match(scoped, /<pop-address-autocomplete[^>]* class="[^"]*hydrated/);
    // renderOptions set on the engine apply to every view, and a view's local wins over them.
    const everywhere = await listen(createApp({ renderOptions: { serializeShadowRoot: 'scoped' } }));
    assert.doesNotMatch((await get(everywhere, '/')).text, /shadowrootmode/);
  });

  test('a template error reaches the error handler as a 500', async () => {
    const { status, text } = await get(await listen(createApp()), '/broken');
    assert.equal(status, 500);
    assert.match(text, /render failed:[\s\S]*missing is not defined/);
  });
});

describe('view cache', opts, () => {
  const views = mkdtempSync(join(tmpdir(), 'stencilrs-views-'));
  const view = join(views, 'page.html');
  const write = (label) => writeFileSync(view, `<div><pop-stat value="1" label="${label}"></pop-stat></div>`);
  const render = (cache) => {
    const app = createApp({ views, cache });
    app.get('/page', (_req, res) => res.render('page.html'));
    return listen(app);
  };

  test('on: a plain view is read once', async () => {
    write('first');
    const base = await render(true);
    assert.match((await get(base, '/page')).text, />first</);
    write('second');
    assert.match((await get(base, '/page')).text, />first</);
  });

  test('off: the file is read on every render', async () => {
    write('first');
    const base = await render(false);
    assert.match((await get(base, '/page')).text, />first</);
    write('second');
    assert.match((await get(base, '/page')).text, />second</);
  });

  test('the cache flag reaches the inner engine', async () => {
    const seen = [];
    const engine = stencilEngine({
      hydrate: { renderToString: async (html) => ({ html, diagnostics: [] }) },
      engine: (_path, locals, cb) => (seen.push(locals.cache), cb(null, '<p></p>')),
    });
    await new Promise((ok) => engine('x.ejs', { cache: true }, ok));
    await new Promise((ok) => engine('x.ejs', {}, ok));
    assert.deepEqual(seen, [true, undefined]);
  });
});

describe('diagnostics', () => {
  const diag = (level, messageText) => ({ level, messageText });
  const hydrate = (diagnostics) => ({ renderToString: async (html) => ({ html, diagnostics }) });
  const view = join(mkdtempSync(join(tmpdir(), 'stencilrs-diag-')), 'v.html');
  writeFileSync(view, '<p>x</p>');
  const run = (engine) => new Promise((ok) => engine(view, {}, (err, html) => ok({ err, html })));

  test('an error-level diagnostic becomes the callback error', async () => {
    const { err, html } = await run(stencilEngine({ hydrate: hydrate([diag('error', 'boom')]) }));
    assert.match(err.message, /boom/);
    assert.equal(err.diagnostics.length, 1);
    assert.equal(html, undefined);
  });

  test('warnings are reported once per unique message and do not fail the render', async () => {
    const seen = [];
    const engine = stencilEngine({ hydrate: hydrate([diag('warn', 'careful')]), onDiagnostic: (d) => seen.push(d.messageText) });
    for (let i = 0; i < 3; i++) assert.equal((await run(engine)).err, null);
    assert.deepEqual(seen, ['careful']);
  });

  test('a hydrate app that cannot be loaded is an error, not a crash', async () => {
    const { err } = await run(stencilEngine({ hydrate: join(tmpdir(), 'no-such-hydrate-app.js') }));
    assert.ok(err instanceof Error);
  });
});

describe('hydration in Chromium', opts, async () => {
  test('the server-rendered EJS page hydrates: elements adopted, the switch works', async (t) => {
    const { findChromium, hydrateInBrowser } = await import('../../ui-kit/ssr/hydrate-browser.mjs');
    const { path } = await findChromium();
    if (!path || !existsSync(join(uiKit, 'dist/hydrate-client/components.js'))) return t.skip('no Chromium or client bundle');
    const base = await listen(createApp());
    const { text } = await get(base, '/');
    // The page loads /client/components.js from its own server in a browser; the harness serves the same bundle beside the HTML.
    const r = await hydrateInBrowser({ html: text.replace(/<script type="module" src="\/client\/components.js"><\/script>/, ''), clientDir: join(uiKit, 'dist/hydrate-client'), executablePath: path });
    assert.match(r.withoutJs.text, /Hello, Ada/);
    assert.equal(r.withoutJs.switchChecked, 'true');
    assert.equal(r.state.undefinedHosts.length, 0);
    assert.equal(r.state.adopted, r.state.total);
    assert.deepEqual([r.click?.before, r.click?.after], ['true', 'false']);
    // Stencil 5.0.0-beta.25's client throws this on childless elements, with its own build too (see ui-kit/ssr/smoke.mjs).
    assert.deepEqual(r.errors.filter((e) => !/reading 'length'/.test(e)), []);
  });
});
