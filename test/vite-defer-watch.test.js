import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createServer } from 'vite';

import stencilrs from '../vite.js';

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'stencilrs-defer-')));
const deep = join(tmp, 'a', 'b', 'deep.js');
mkdirSync(join(tmp, 'a', 'b'), { recursive: true });
mkdirSync(join(tmp, 'public'));
writeFileSync(deep, 'export const x = 1;\n');
writeFileSync(join(tmp, 'index.html'), '<!doctype html><title>t</title>');
writeFileSync(join(tmp, 'public', 'p.txt'), 'p');
writeFileSync(join(tmp, '.env'), 'A=1');

const start = async (deferWatch, server = {}) => {
  const s = await createServer({ root: tmp, configFile: false, logLevel: 'silent', plugins: stencilrs({ deferWatch }), optimizeDeps: { noDiscovery: true, include: [] }, server: { ws: false, ...server } });
  await new Promise((r) => setTimeout(r, 300)); // the crawl of this small project is over
  return s;
};
const watchesDeep = (s) => Object.keys(s.watcher.getWatched()).some((d) => d.replaceAll('\\', '/').endsWith('/a/b'));
const changes = (s, ms) =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), ms);
    s.watcher.on('change', (f) => f === deep && (clearTimeout(t), resolve(true)));
    writeFileSync(deep, `export const x = ${Math.random()};\n`);
  });
const until = async (cond, ms = 3000) => {
  for (const t = Date.now(); !cond() && Date.now() - t < ms; ) await new Promise((r) => setTimeout(r, 20));
};

test('deferWatch: the root is not crawled until the cap; then a deep file change is reported', async () => {
  const s = await start({ cap: 1000 });
  try {
    assert.equal(watchesDeep(s), false, 'hidden while deferring');
    const watched = Object.keys(s.watcher.getWatched()).map((d) => d.replaceAll('\\', '/'));
    assert.ok(watched.some((d) => d.endsWith('/public')), 'publicDir is watched from the start');
    await until(() => watchesDeep(s));
    assert.equal(watchesDeep(s), true, 'the cap ended the deferral');
    assert.equal(await changes(s, 3000), true);
  } finally {
    await s.close();
  }
});

test('deferWatch: the end of a page load ends the deferral (no cap needed)', async () => {
  const s = await start({ idle: 50, cap: 60000 });
  try {
    await s.listen(0);
    const url = s.resolvedUrls.local[0];
    assert.equal(watchesDeep(s), false);
    await fetch(url);
    await until(() => watchesDeep(s));
    assert.equal(watchesDeep(s), true);
    assert.equal(await changes(s, 3000), true);
  } finally {
    await s.close();
  }
});

test('deferWatch: false watches at once', async () => {
  const s = await start(false);
  try {
    await until(() => watchesDeep(s));
    assert.equal(watchesDeep(s), true);
    assert.equal(await changes(s, 3000), true);
  } finally {
    await s.close();
  }
});

test('deferWatch: a closed server stops its timers, and server.watch: null is left alone', async () => {
  const s = await start({ cap: 100 });
  await s.close();
  await new Promise((r) => setTimeout(r, 200)); // the cap timer would call `watcher.add` on a closed watcher
  const n = await createServer({ root: tmp, configFile: false, logLevel: 'silent', plugins: stencilrs(), server: { ws: false, watch: null } });
  try {
    assert.deepEqual(n.config.server.watch, null);
  } finally {
    await n.close();
  }
});

test.after(() => rmSync(tmp, { recursive: true, force: true }));
