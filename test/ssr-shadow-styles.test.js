import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createShadowStyleStore, externalizeShadowStyles } from '../ssr-shadow-styles.js';

const page = (n) =>
  `<!doctype html><html><head><style sty-id="sc-x">.a{b:c}</style></head><body>` +
  Array.from({ length: n }, (_, i) => `<my-item><template shadowrootmode="open"><style sty-id="sc-my-item">:host{color:red}</style><slot></slot></template>${i}</my-item>`).join('') +
  `<my-other><template shadowrootmode="open" shadowrootdelegatesfocus><style sty-id="sc-my-other">p{margin:0}</style><style sty-id="sc-extra">q{}</style><p></p></template></my-other></body></html>`;

test('shadow root styles become links, head styles stay', () => {
  const store = createShadowStyleStore({ base: '/c/' });
  const { html, files } = externalizeShadowStyles(page(3), store);
  assert.equal(files.length, 3);
  assert.equal((html.match(/<style /g) ?? []).length, 1); // the head's scoped style only
  assert.match(html, /<head><style sty-id="sc-x">\.a\{b:c\}<\/style><\/head>/);
  assert.equal((html.match(/<link rel="stylesheet" href="\/c\/sc-my-item\.[0-9a-f]+\.css" sty-id="sc-my-item">/g) ?? []).length, 3);
  assert.match(html, /<template shadowrootmode="open" shadowrootdelegatesfocus><link[^>]*sc-my-other[^>]*><link[^>]*sc-extra[^>]*><p>/);
  const file = files.find((f) => f.startsWith('sc-my-item'));
  assert.equal(store.get(file), ':host{color:red}');
});

test('the name changes with the content, and is stable for the same content', () => {
  const store = createShadowStyleStore();
  assert.equal(store.add('a', 'x{}'), store.add('a', 'x{}'));
  assert.notEqual(store.add('a', 'x{}'), store.add('a', 'y{}'));
});

test('preload adds one tag per sheet to the head', () => {
  const store = createShadowStyleStore();
  const { html } = externalizeShadowStyles(page(5), store, { preload: true });
  assert.equal((html.match(/<link rel="preload" as="style"/g) ?? []).length, 3);
  assert.ok(html.indexOf('rel="preload"') < html.indexOf('</head>'));
});

test('middleware serves a sheet immutable and 404s an unknown one', () => {
  const store = createShadowStyleStore();
  const { files } = externalizeShadowStyles(page(1), store);
  const run = (url) => {
    const out = {};
    store.middleware()({ url }, { writeHead: (status, h) => ((out.status = status), (out.headers = h), { end: (b) => (out.body = b) }) }, () => (out.next = true));
    return out;
  };
  const hit = run(`/${files[0]}`);
  assert.equal(hit.status, 200);
  assert.match(hit.headers['cache-control'], /immutable/);
  assert.equal(run('/nope.css').next, true);
});

test('a page without shadow roots is returned as it was', () => {
  const store = createShadowStyleStore();
  const html = '<html><head><style sty-id="a">x{}</style></head><body></body></html>';
  assert.equal(externalizeShadowStyles(html, store).html, html);
});

test('minUses keeps one-off sheets inline and links the repeated ones', () => {
  const store = createShadowStyleStore();
  const { html, files } = externalizeShadowStyles(page(3), store, { minUses: 2 });
  assert.equal(files.length, 1); // sc-my-item (3 roots); sc-my-other and sc-extra start one root each
  assert.match(html, /<template shadowrootmode="open" shadowrootdelegatesfocus><style sty-id="sc-my-other">p\{margin:0\}<\/style><style sty-id="sc-extra">q\{\}<\/style><p>/);
  assert.equal((html.match(/<link rel="stylesheet"/g) ?? []).length, 3);
});

test('base must be a path prefix', () => {
  assert.throws(() => createShadowStyleStore({ base: 'c/' }), TypeError);
});

// The engine option, on a real hydrate app (the islands fixture).
test('stencilEngine({ shadowStyleLinks }): shadow root styles become links, sheets are served, default output is unchanged', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { stencilEngine } = await import('../express.js');
  const { buildFixture } = await import('./fixtures/islands/setup.mjs');
  const { ISLAND_A } = await import('./fixtures/islands/build.mjs');
  const built = await buildFixture();
  const view = join(mkdtempSync(join(tmpdir(), 'shadow-links-')), 'page.html');
  writeFileSync(view, `<!doctype html><html><head><title>t</title></head><body>${ISLAND_A}</body></html>`);
  const render = (engine) => new Promise((resolve, reject) => engine(view, {}, (err, html) => (err ? reject(err) : resolve(html))));
  const plain = stencilEngine({ hydrate: built.hydrate });
  const linked = stencilEngine({ hydrate: built.hydrate, shadowStyleLinks: { preload: true } });
  try {
    const before = await render(plain);
    const after = await render(linked);
    assert.equal(plain.shadowStyles, null);
    const inShadow = (html) => [...html.matchAll(/<template shadowrootmode="open"[^>]*><style sty-id="[^"]+">/g)];
    assert.ok(inShadow(before).length > 0, 'the fixture has a shadow component with CSS');
    assert.equal(inShadow(after).length, 0);
    assert.match(after, /<template shadowrootmode="open"[^>]*><link rel="stylesheet" href="\/c\/[^"]+\.css" sty-id="/);
    assert.match(after, /<link rel="preload" as="style" href="\/c\//);
    assert.ok(linked.shadowStyles.sheets.size > 0);
  } finally {
    await Promise.all([plain.close(), linked.close()]);
  }
});
