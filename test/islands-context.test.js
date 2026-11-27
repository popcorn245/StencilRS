// An island renders inside its ancestors (`islands.context`, default on): a component that looks up the tree while it renders sees what it
// sees in the whole page, in both serializations, and the island comes back out of the wrapper without the ancestors' marks.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { stencilEngine } from '../express.js';
import { IslandError, scanIslands, splitIslands, unwrap, withContext } from '../express-islands.js';
import { buildFixture } from './fixtures/islands/setup.mjs';

const built = await buildFixture();
const dir = mkdtempSync(join(tmpdir(), 'stencilrs-islands-context-'));
const engines = [];
const make = (options) => engines.push(stencilEngine({ hydrate: built.hydrate, renderOptions: { buildId: 'b', prettyHtml: false }, ...options })) && engines.at(-1);
after(() => Promise.all(engines.map((e) => e.close())));
let n = 0;
const view = (html) => {
  const file = join(dir, `v${n++}.html`);
  writeFileSync(file, html);
  return file;
};
const render = (engine, file) => new Promise((ok, no) => engine(file, {}, (err, html) => (err ? no(err) : ok(html))));
const DOC = (body) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>t</title></head>\n<body>${body}</body></html>`;
const norm = (html) => html.replace(/ (?:s-id|c-id|s-sn|data-island|data-client)="[^"]*"/g, '').replace(/<!--[rostc]\.[^>]*-->/g, '').replace(/>\s+</g, '><');

test('scanIslands: each island carries the elements open around it, start tags as written, without html, head and body', () => {
  const html = DOC('<main id="m"><isl-pane side="right"><p>x</p><br><stencil-island name="a"><i>a</i></stencil-island></isl-pane></main><stencil-island name="b"><i>b</i></stencil-island>');
  const [a, b] = scanIslands(html);
  assert.deepEqual(a.context.map((e) => e.tag), ['<main id="m">', '<isl-pane side="right">']);
  assert.deepEqual(b.context, []);
  // a stray end tag closes nothing; an unclosed element is closed by its parent's end tag
  const [c] = scanIslands('<div><section></span><ul><li>one</ul><stencil-island name="c"><i>c</i></stencil-island></section></div>');
  assert.deepEqual(c.context.map((e) => e.name), ['div', 'section']);
});

test('withContext and unwrap: the wrapper goes around the island, roots are tagged, and come back out untagged and without relocation marks', () => {
  const [isl] = splitIslands(DOC('<isl-pane side="right"><stencil-island name="a"> <i>a</i> text <b>b</b> </stencil-island></isl-pane>')).islands;
  const w = withContext(isl);
  assert.equal(w.html, '<isl-pane side="right"> <i data-island-ctx="0">a</i> text <b data-island-ctx="1">b</b> </isl-pane>');
  assert.equal(w.roots, 2);
  const rendered = '<isl-pane side="right" s-id="1001" class="hydrated"><template shadowrootmode="open"><slot></slot></template> <i data-island-ctx="0" c-id="1001.0" s-sn="">a</i> text <b data-island-ctx="1">b</b> </isl-pane>';
  assert.equal(unwrap({ html: rendered, components: [{ tag: 'isl-pane' }, { tag: 'isl-where' }] }, w).html, ' <i>a</i> text <b>b</b> ');
  // moved apart (scoped rendering relocates a host's children into its slots): taken one by one, in the view's order
  const apart = '<isl-pane><div class="l"><b data-island-ctx="1">b</b></div><div class="r"><i data-island-ctx="0">a</i></div></isl-pane>';
  assert.equal(unwrap({ html: apart }, w).html, '<i>a</i><b>b</b>');
  assert.throws(() => unwrap({ html: '<isl-pane><i data-island-ctx="0">a</i></isl-pane>' }, w, 'v: island "a"'), (e) => e instanceof IslandError && /island "a".*did not come back once each/.test(e.message));
  // only text: no context, the island is rendered on its own
  const [t] = splitIslands(DOC('<isl-pane><stencil-island name="t">just text</stencil-island></isl-pane>')).islands;
  assert.deepEqual(withContext(t).ctx, []);
});

for (const [label, serializeShadowRoot] of [['dsd', 'declarative-shadow-dom'], ['scoped', 'scoped']]) {
  for (const workers of [0, 2]) {
    test(`${label}${workers ? ', workers: 2' : ''}: a component that asks its ancestor while it renders gets the whole page's answer in an island`, async () => {
      const opts = { renderOptions: { buildId: 'b', prettyHtml: false, serializeShadowRoot }, workers };
      const full = make(opts);
      const islands = make({ ...opts, islands: {} });
      const blind = make({ ...opts, islands: { context: false } });
      const body = (island) => `<h1>shell</h1><isl-pane side="right"><div class="page">${island('a', '<isl-where></isl-where> <isl-tag>t</isl-tag>')}</div></isl-pane><section>${island('b', '<isl-where></isl-where>')}</section>`;
      const plain = await render(full, view(DOC(body((_n, h) => h))));
      const split = view(DOC(body((name, h) => `<stencil-island name="${name}">${h}</stencil-island>`)));
      const html = await render(islands, split);
      assert.match(html, /<isl-where data-island="a"[^>]*>[^]*?in-pane:right/, 'island a sees its pane and the pane answers');
      assert.match(html, /<isl-where data-island="b"[^>]*>[^]*?>alone</, 'island b has no pane above it');
      assert.equal(norm(html), norm(plain), 'the page is the whole render, but for the ids');
      assert.doesNotMatch(html, /data-island-ctx/);
      assert.equal((html.match(/<isl-pane/g) ?? []).length, 1, 'the ancestor is the shell\'s, once');
      assert.match(await render(blind, split), /<isl-where data-island="a"[^>]*>[^]*?>alone</, 'context: false is the island on its own');
      const page = await islands.renderIslands(split);
      assert.deepEqual((await page.clientManifest()).islands.find((i) => i.name === 'a').tags.sort(), ['isl-tag', 'isl-where'], 'the ancestors\' tags stay the shell\'s');
    });
  }
}

test('islands.context must be a boolean', () => {
  assert.throws(() => stencilEngine({ hydrate: built.hydrate, islands: { context: 'yes' } }), /islands\.context` must be a boolean/);
});
