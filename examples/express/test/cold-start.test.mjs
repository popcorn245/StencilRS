// Cold start (issue #141): `warmup`, `engine.ready` and the compile cache option of stencilEngine, in-process and on workers.
// npm test   (after `npm run build`)
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import * as nodeModule from 'node:module';
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { stencilEngine } from '@popcorn245/stencilrs/express';
import ejs from 'ejs';

const here = dirname(fileURLToPath(import.meta.url));
const hydratePath = join(here, '../../ui-kit/dist/hydrate/index.js');
const built = existsSync(hydratePath);
const opts = { skip: built ? false : 'run `npm run build` first' };
const exec = promisify(execFile);

const engines = [];
const make = (config = {}) => {
  const e = stencilEngine({ hydrate: hydratePath, ...config });
  engines.push(e);
  return e;
};
after(() => Promise.all(engines.map((e) => e.close())));
const run = (engine, view, locals = {}) => new Promise((ok) => engine(view, locals, (err, html) => ok({ err, html })));

// A hydrate app that records what it was asked to render, for what the real app cannot show (how many renders, which HTML).
const fake = (log) => ({
  renderToString: async (html, options) => (log.push({ html, options }), { html, diagnostics: [] }),
});

describe('warmup, in-process', () => {
  test('without warmup, ready resolves at once and nothing is rendered', async () => {
    const log = [];
    await stencilEngine({ hydrate: fake(log) }).ready;
    assert.equal(log.length, 0);
  });

  test('true is a clear TypeError', () => {
    assert.throws(() => stencilEngine({ hydrate: fake([]), warmup: true }), /warmup: true. is not supported/);
  });

  test('{ views, times } runs the list that many times, in order, before ready', async () => {
    const log = [];
    const e = stencilEngine({ hydrate: fake(log), warmup: { views: ['<p>a</p>', '<p>b</p>'], times: 3 }, renderOptions: { prettyHtml: false } });
    await e.ready;
    assert.deepEqual(log.map((l) => l.html), ['<p>a</p>', '<p>b</p>', '<p>a</p>', '<p>b</p>', '<p>a</p>', '<p>b</p>']);
    assert.equal(log[0].options.prettyHtml, false); // the engine's renderOptions apply
  });

  test('a list takes HTML strings and view files, through the inner engine', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stencilrs-warm-'));
    writeFileSync(join(dir, 'a.ejs'), '<pop-stat value="<%= 1 + 1 %>"></pop-stat>');
    writeFileSync(join(dir, 'b.html'), '<section>plain</section>');
    const log = [];
    const e = stencilEngine({ hydrate: fake(log), engine: ejs.renderFile, warmup: ['<p>inline</p>', join(dir, 'a.ejs')] });
    await e.ready;
    assert.deepEqual(log.map((l) => l.html), ['<p>inline</p>', '<pop-stat value="2"></pop-stat>']);
    assert.equal(log[0].options.fullDocument, false); // a fragment stays a fragment, as for a view
    const plain = [];
    await stencilEngine({ hydrate: fake(plain), warmup: [join(dir, 'b.html')] }).ready;
    assert.deepEqual(plain.map((l) => l.html), ['<section>plain</section>']);
  });

  test('a failing warm-up rejects ready, and the engine still renders', async () => {
    let calls = 0;
    const hydrate = { renderToString: async (html) => (calls++ === 0 ? Promise.reject(new Error('boom')) : { html, diagnostics: [] }) };
    const dir = mkdtempSync(join(tmpdir(), 'stencilrs-warm-'));
    writeFileSync(join(dir, 'v.html'), '<p>v</p>');
    const e = stencilEngine({ hydrate, warmup: ['<p>x</p>'] });
    await assert.rejects(e.ready, /boom/);
    assert.equal((await run(e, join(dir, 'v.html'))).html, '<p>v</p>');
    // a warm-up view that does not exist rejects ready too
    await assert.rejects(stencilEngine({ hydrate: fake([]), warmup: [join(dir, 'missing.html')] }).ready, /ENOENT/);
  });

  test('bad options are TypeErrors', () => {
    assert.throws(() => stencilEngine({ hydrate: fake([]), warmup: 'home' }), /warmup/);
    assert.throws(() => stencilEngine({ hydrate: fake([]), warmup: [1] }), /warmup/);
    assert.throws(() => stencilEngine({ hydrate: fake([]), warmup: { views: [], times: 0 } }), /times/);
    assert.throws(() => stencilEngine({ hydrate: fake([]), compileCache: 1 }), /compileCache/);
  });

  test('with the real hydrate app: the first render after ready is a normal render', opts, async () => {
    const warm = make({ warmup: { views: ['<pop-stat value="1" label="w"></pop-stat>'], times: 2 } });
    await warm.ready;
    const cold = make();
    const page = join(here, '../views/about.html');
    const a = await run(warm, page, { cache: true });
    const b = await run(cold, page, { cache: true });
    assert.equal(a.err, null);
    assert.ok(a.html.length > 200);
    assert.equal(a.html.length, b.html.length);
  });
});

describe('warmup, on workers', opts, () => {
  test('ready resolves after every worker has warmed up', async () => {
    const e = make({ workers: 2, warmup: { views: ['<pop-stat value="1" label="w"></pop-stat>'], times: 2 } });
    await e.ready;
    const r = await run(e, join(here, '../views/about.html'), { cache: true });
    assert.equal(r.err, null);
    assert.match(r.html, /class="chip sc-pop-chip/);
  });

  test('a list of views goes through the inner engine on the main thread', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'stencilrs-warm-'));
    writeFileSync(join(dir, 'w.ejs'), '<pop-stat value="<%= 3 %>" label="w"></pop-stat>');
    const e = make({ workers: 1, engine: ejs.renderFile, warmup: [join(dir, 'w.ejs'), '<pop-stat value="1" label="html"></pop-stat>'] });
    await e.ready;
    assert.equal((await run(e, join(dir, 'w.ejs'))).err, null);
  });

  test('a warm-up that cannot be read rejects ready; the workers still serve', async () => {
    const e = make({ workers: 1, warmup: [join(tmpdir(), 'no-such-warm-view.html')] });
    await assert.rejects(e.ready, /ENOENT/);
    const dir = mkdtempSync(join(tmpdir(), 'stencilrs-warm-'));
    writeFileSync(join(dir, 'p.html'), '<pop-stat value="1" label="p"></pop-stat>');
    assert.equal((await run(e, join(dir, 'p.html'))).err, null);
  });

  test('an unloadable hydrate app still rejects ready with a warm-up on', async () => {
    const e = make({ hydrate: join(tmpdir(), 'no-such-hydrate-app.js'), workers: 1, warmup: ['<p>x</p>'] });
    await assert.rejects(e.ready);
  });
});

describe('compile cache', () => {
  // Node's compile cache is per process, so each case runs in a child process.
  const probe = (cacheOption, { workers = 0, env = {} } = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'stencilrs-cc-'));
    const code = `
      import { getCompileCacheDir } from 'node:module';
      import { stencilEngine } from ${JSON.stringify(pathToFileURL(join(here, '../../../express.js')).href)};
      const before = getCompileCacheDir();
      const e = stencilEngine({ hydrate: ${JSON.stringify(hydratePath)}, workers: ${workers}, compileCache: ${cacheOption === 'dir' ? JSON.stringify(dir) : cacheOption} });
      await e.ready;
      await new Promise((ok) => e(${JSON.stringify(join(here, '../views/about.html'))}, { cache: true }, ok));
      console.log(JSON.stringify({ before: before ?? null, dir: getCompileCacheDir() ?? null }));
      await e.close();`;
    const file = join(mkdtempSync(join(tmpdir(), 'stencilrs-probe-')), 'probe.mjs'); // a file, not `-e`: worker threads inherit `--input-type`
    writeFileSync(file, code);
    return exec(process.execPath, [file], { cwd: here, env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: undefined, NODE_COMPILE_CACHE: undefined, ...env } }).then(({ stdout }) => ({ ...JSON.parse(stdout.trim().split('\n').pop()), cacheDir: dir }));
  };
  const hasModule = typeof nodeModule.enableCompileCache === 'function';
  const copts = { skip: !built ? 'run `npm run build` first' : hasModule ? false : 'this Node has no module.enableCompileCache' };

  test('on by default; a directory string picks where the cache goes', copts, async () => {
    const r = await probe('true');
    assert.equal(r.before, null);
    assert.ok(r.dir, 'enableCompileCache() ran');
    const d = await probe('dir');
    assert.ok(d.dir.startsWith(d.cacheDir), `${d.dir} is under ${d.cacheDir}`);
    assert.ok(readdirSync(d.cacheDir, { recursive: true }).length > 0, 'the cache directory has files after loading the app');
  });

  test('compileCache: false opts out', copts, async () => {
    const r = await probe('false');
    assert.equal(r.dir, null);
  });

  test('NODE_DISABLE_COMPILE_CACHE is honoured', copts, async () => {
    const r = await probe('true', { env: { NODE_DISABLE_COMPILE_CACHE: '1' } });
    assert.equal(r.dir, null);
  });

  test('workers: the option reaches each thread (renders work with it on and off)', copts, async () => {
    for (const option of ['true', 'false', 'dir']) {
      const r = await probe(option, { workers: 1 });
      assert.equal(r.dir === null, option === 'false', option);
    }
  });
});
