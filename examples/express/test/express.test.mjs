// npm test   (after `npm run build`, which builds the ui-kit's hydrate app and client bundle)
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { stencilEngine } from '@popcorn245/stencilrs/express';
import ejs from 'ejs';

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

describe('worker pool', opts, () => {
  const hydratePath = join(uiKit, 'dist/hydrate/index.js');
  const engines = [];
  const pooled = (config = {}) => {
    const e = stencilEngine({ hydrate: hydratePath, workers: 2, ...config });
    engines.push(e);
    return e;
  };
  after(() => Promise.all(engines.map((e) => e.close())));
  const run = (engine, view, locals = {}) => new Promise((ok) => engine(view, locals, (err, html) => ok({ err, html })));
  const views = join(here, '../views');

  test('output is byte-identical to in-process, DSD and scoped, EJS and plain HTML', async () => {
    // Stencil numbers hydrated elements (s-id, c-id, <!--r.N-->, <!--o.N.N.c-->, <!--s.N.N.header-->) from a counter that runs on across the renders of a process,
    // in-process too, so a worker that has rendered other pages numbers differently. The ids only have to be unique within a page: compare masked.
    const mask = (h) => h.replace(/ [sc]-id="[\d.]+"/g, '').replace(/<!--[a-z]\.\d[\w.]*-->/g, '<!---->');
    const renderOptions = { buildId: 'fixed' }; // else each render stamps a random data-stencil-build
    const pool = pooled({ workers: 1, renderOptions });
    const local = stencilEngine({ hydrate: hydratePath, renderOptions });
    const ejsLocal = stencilEngine({ hydrate: hydratePath, engine: ejs.renderFile, renderOptions });
    const ejsPool = pooled({ workers: 1, engine: ejs.renderFile, renderOptions });
    await Promise.all([pool.ready, ejsPool.ready]);
    const home = { user: 'Ada <a@b.c>', open: 42, tasks: ['Write', 'Ship'] };
    for (const stencil of [undefined, { serializeShadowRoot: 'scoped' }]) {
      const a = await run(ejsLocal, join(views, 'home.ejs'), { ...home, stencil });
      const b = await run(ejsPool, join(views, 'home.ejs'), { ...home, stencil });
      assert.equal(a.err, null);
      assert.equal(b.err, null);
      assert.equal(mask(b.html), mask(a.html));
    }
    for (const v of ['about.html', 'fragment.ejs']) {
      if (!existsSync(join(views, v))) continue;
      const a = await run(local, join(views, v));
      const b = await run(pool, join(views, v));
      assert.equal(mask(b.html), mask(a.html), v);
    }
  });

  test('through Express, concurrent requests all succeed', async () => {
    const app = createApp();
    const e = pooled({ engine: ejs.renderFile });
    app.engine('ejs', e);
    const base = await listen(app);
    const rs = await Promise.all(Array.from({ length: 8 }, () => get(base, '/')));
    for (const r of rs) {
      assert.equal(r.status, 200);
      assert.match(r.text, /Hello, Ada/);
    }
  });

  test('a module object is a clear error, not a hang', () => {
    assert.throws(() => stencilEngine({ hydrate: { renderToString: async () => ({}) }, workers: 2 }), /path or URL/);
    assert.throws(() => stencilEngine({ hydrate: hydratePath, workers: -1 }), /workers/);
  });

  test('an unloadable hydrate app rejects ready and every render', async () => {
    const e = pooled({ hydrate: join(tmpdir(), 'no-such-hydrate-app.js'), workers: 1 });
    await assert.rejects(e.ready);
    const { err } = await run(e, join(views, 'about.html'));
    assert.ok(err instanceof Error);
  });

  // Fake hydrate apps, written to disk: a worker imports them by path.
  const fake = (name, body) => {
    const file = join(mkdtempSync(join(tmpdir(), 'stencilrs-fake-')), name);
    writeFileSync(file, body);
    return file;
  };
  const page = fake('p.html', '<p>x</p>');

  test('diagnostics: errors fail the render, warnings reach onDiagnostic once', async () => {
    const hydrate = fake('d.mjs', `export const renderToString = async (html, o) => ({ html, diagnostics: [{ level: o.fail ? 'error' : 'warn', messageText: o.fail ? 'boom' : 'careful' }] });`);
    const seen = [];
    const e = pooled({ hydrate, onDiagnostic: (d) => seen.push(d.messageText), renderOptions: {} });
    for (let i = 0; i < 3; i++) assert.equal((await run(e, page)).err, null);
    assert.deepEqual(seen, ['careful']);
    const { err } = await run(e, page, { stencil: { fail: true } });
    assert.match(err.message, /boom/);
    assert.equal(err.diagnostics.length, 1);
  });

  test('a throwing renderToString fails that render only', async () => {
    const hydrate = fake('t.mjs', `export const renderToString = async (html, o) => { if (o.throw) throw new Error('nope'); return { html }; };`);
    const e = pooled({ hydrate, workers: 1 });
    assert.match((await run(e, page, { stencil: { throw: true } })).err.message, /nope/);
    assert.equal((await run(e, page)).html, '<p>x</p>');
  });

  test('a crashed worker fails its render, is replaced, and the pool keeps serving', async () => {
    const hydrate = fake('c.mjs', `export const renderToString = async (html, o) => { if (o.crash) process.exit(1); return { html }; };`);
    const e = pooled({ hydrate, workers: 1 });
    await e.ready;
    const { err } = await run(e, page, { stencil: { crash: true } });
    assert.equal(err.code, 'ESTENCIL_WORKER_CRASH');
    assert.equal((await run(e, page)).html, '<p>x</p>');
  });

  test('a render past renderTimeout fails and the worker is replaced', async () => {
    const hydrate = fake('s.mjs', `export const renderToString = async (html, o) => { if (o.hang) for (;;); return { html }; };`);
    const e = pooled({ hydrate, workers: 1, renderTimeout: 200 });
    const { err } = await run(e, page, { stencil: { hang: true } });
    assert.equal(err.code, 'ESTENCIL_TIMEOUT');
    assert.equal((await run(e, page)).html, '<p>x</p>');
  });

  test('a full queue rejects instead of growing', async () => {
    const hydrate = fake('q.mjs', `export const renderToString = async (html) => { await new Promise((r) => setTimeout(r, 100)); return { html }; };`);
    const e = pooled({ hydrate, workers: 1, maxQueue: 1 });
    await e.ready;
    const rs = await Promise.all([run(e, page), run(e, page), run(e, page)]); // one rendering, one queued, one over
    assert.deepEqual(rs.map((r) => r.err?.code ?? 'ok').sort(), ['ESTENCIL_QUEUE_FULL', 'ok', 'ok']); // which request loses depends on who reads its file first
  });

  test('non-cloneable render options fail that render, not the worker', async () => {
    const e = pooled({ workers: 1, renderOptions: { fn() {} } });
    const { err } = await run(e, page);
    assert.match(err.message, /cloneable/);
  });

  test('close() fails what is in flight and later renders; the process can exit', async () => {
    const hydrate = fake('x.mjs', `export const renderToString = async (html) => { await new Promise((r) => setTimeout(r, 5000)); return { html }; };`);
    const e = stencilEngine({ hydrate, workers: 1 });
    await e.ready;
    const inflight = run(e, page);
    await e.close();
    assert.equal((await inflight).err.code, 'ESTENCIL_CLOSED');
    assert.equal((await run(e, page)).err.code, 'ESTENCIL_CLOSED');
  });

  test('without workers, ready resolves and close is a no-op', async () => {
    const e = stencilEngine({ hydrate: { renderToString: async (html) => ({ html }) } });
    await e.ready;
    await e.close();
  });
});
