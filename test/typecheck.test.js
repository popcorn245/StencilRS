import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

import { build, createServer } from 'vite';

import stencilrs from '../vite.js';
import { createTypecheck, formatFailure, normalizeTypecheck, resolveChecker } from '../vite-typecheck.js';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'stencilrs-typecheck-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const tsconfig = (include) =>
  JSON.stringify({
    compilerOptions: {
      noEmit: true,
      strict: true,
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      skipLibCheck: true,
      experimentalDecorators: true,
      jsx: 'react-jsx',
      jsxImportSource: '@stencil/core',
      types: [],
    },
    include,
  });

/** A project: typescript and @stencil/core linked in, a component, and `src/check/*.ts` for the checker. */
const project = (name, { bad = false, include = ['src'], link = true } = {}) => {
  const root = join(tmp, name);
  mkdirSync(join(root, 'src', 'check'), { recursive: true });
  if (link) {
    mkdirSync(join(root, 'node_modules', '@stencil'), { recursive: true });
    symlinkSync(join(repo, 'node_modules', 'typescript'), join(root, 'node_modules', 'typescript'), 'junction');
    symlinkSync(join(repo, 'node_modules', '@stencil', 'core'), join(root, 'node_modules', '@stencil', 'core'), 'junction');
  }
  writeFileSync(join(root, 'tsconfig.json'), tsconfig(include));
  writeFileSync(
    join(root, 'src', 'cmp-check.tsx'),
    `import { Component, h } from '@stencil/core';\n@Component({ tag: 'cmp-check' })\nexport class CmpCheck {\n  render() { return <div>x</div>; }\n}\n`,
  );
  writeFileSync(join(root, 'src', 'check', 'value.ts'), bad ? `export const n: number = 'not a number';\n` : `export const n: number = 1;\n`);
  return root;
};

const runBuild = (root, options, extra = {}) =>
  build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [stencilrs(options)],
    build: {
      write: false,
      lib: { entry: join(root, 'src', 'cmp-check.tsx'), formats: ['es'], fileName: 'out' },
      rollupOptions: { external: [/^@stencil\/core/] },
      ...extra,
    },
  });

test('typecheck: option validation and the false default', () => {
  assert.equal(normalizeTypecheck(false), null);
  assert.equal(normalizeTypecheck(undefined), null);
  assert.deepEqual(normalizeTypecheck(true), {});
  assert.deepEqual(normalizeTypecheck({ tsconfig: 'a.json', bin: 'tsc' }), { tsconfig: 'a.json', bin: 'tsc' });
  assert.throws(() => normalizeTypecheck({ bin: 'swc' }), /bin must be 'tsgo' or 'tsc'/);
  assert.throws(() => normalizeTypecheck('yes'), /boolean or/);
  assert.equal(createTypecheck(tmp, false).enabled, false);
});

test('typecheck is off by default: a type error does not fail the build', async () => {
  const root = project('off', { bad: true });
  await runBuild(root, {});
  await runBuild(root, { typecheck: false });
});

test('typecheck: a type error fails the build with the checker output', async () => {
  const root = project('bad', { bad: true });
  await assert.rejects(runBuild(root, { typecheck: { bin: 'tsc' } }), (e) => {
    assert.match(e.message, /typecheck failed \(tsc, 1 error\)/);
    assert.match(e.message, /value\.ts\(1,14\): error TS2322/);
    return true;
  });
});

test('typecheck: a clean project builds', async () => {
  const root = project('good');
  await runBuild(root, { typecheck: { bin: 'tsc' } });
});

test('typecheck: a type error leaves no output on disk', async () => {
  const root = project('bad-write', { bad: true });
  const outDir = join(root, 'dist');
  await assert.rejects(runBuild(root, { typecheck: { bin: 'tsc' } }, { write: true, outDir }), /TS2322/);
  assert.equal(existsSync(join(outDir, 'out.js')), false);
});

test('typecheck: tsconfig option points at another config', async () => {
  const root = project('alt-config', { bad: true, include: ['src/cmp-check.tsx'] });
  writeFileSync(join(root, 'tsconfig.strict.json'), tsconfig(['src']));
  await runBuild(root, { typecheck: { bin: 'tsc' } }); // the default config leaves value.ts out
  await assert.rejects(runBuild(root, { typecheck: { bin: 'tsc', tsconfig: 'tsconfig.strict.json' } }), /TS2322/);
});

test('typecheck: no checker installed is a clear error', async () => {
  const root = project('bare', { link: false });
  await assert.rejects(runBuild(root, { typecheck: { bin: 'tsgo' } }), /@typescript\/native-preview cannot be resolved from .*npm i -D @typescript\/native-preview/);
  const missing = join(tmp, 'no-tsconfig');
  mkdirSync(missing, { recursive: true });
  await assert.rejects(resolveChecker(missing, {}), /tsconfig\.json not found/);
});

test('typecheck: tsc is the fallback when tsgo is not installed, and the command runs without a shell', async () => {
  const root = project('fallback');
  const c = await resolveChecker(root, {});
  if (c.name === 'tsgo') return; // @typescript/native-preview happens to resolve from here
  assert.equal(c.name, 'tsc');
  assert.equal(c.command, process.execPath);
  assert.deepEqual(c.args.slice(1), ['--noEmit', '--skipLibCheck', '-p', join(root, 'tsconfig.json'), '--pretty', 'false']);
});

test('typecheck: with dts the check runs after components.d.ts is written', async () => {
  const root = project('dts', { include: ['src/check', 'dist/components.d.ts'] });
  // Only the generated declaration file defines this global.
  writeFileSync(join(root, 'src', 'check', 'use.ts'), `export const el: HTMLCmpCheckElement | null = null;\n`);
  const outDir = join(root, 'dist');
  await runBuild(root, { typecheck: { bin: 'tsc' }, dts: true }, { write: true, outDir });
  assert.ok(existsSync(join(outDir, 'components.d.ts')));
});

// A fake child process: the spawn mock records what it was given and lets the test end or kill it.
const fakeSpawn = () => {
  const calls = [];
  const spawn = (command, args, opts) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.killed = false;
    child.kill = () => {
      child.killed = true;
      queueMicrotask(() => child.emit('close', null));
    };
    calls.push({ command, args, opts, child });
    return child;
  };
  return { spawn, calls };
};
const ready = async (calls, n) => {
  for (let i = 0; i < 50 && calls.length < n; i++) await new Promise((r) => setTimeout(r, 5));
  assert.equal(calls.length, n);
};
const fakeResolve = async () => ({ name: 'tsgo', command: 'tsgo-bin', args: ['--noEmit'], cwd: tmp });

test('typecheck: a new run kills the stale one; wait() is the latest run', async () => {
  const { spawn, calls } = fakeSpawn();
  const check = createTypecheck(tmp, true, { spawn, resolve: fakeResolve });
  const first = check.start();
  await ready(calls, 1);
  const second = check.start();
  await ready(calls, 2);
  assert.equal(calls[0].child.killed, true);
  assert.equal(calls[1].child.killed, false);
  assert.equal(calls[1].opts.shell, false);
  assert.equal((await first).killed, true);
  calls[1].child.stdout.emit('data', 'src/a.ts(1,1): error TS2322: nope\n');
  calls[1].child.emit('close', 2);
  const r = await check.wait();
  assert.equal(r, await second);
  assert.deepEqual([r.ok, r.killed, r.errors, r.code], [false, false, 1, 2]);
  assert.match(formatFailure(r), /typecheck failed \(tsgo, 1 error\):\nsrc\/a\.ts\(1,1\): error TS2322/);
});

test('typecheck: stop() kills a running check and a run killed before it spawned never spawns', async () => {
  const { spawn, calls } = fakeSpawn();
  const check = createTypecheck(tmp, true, { spawn, resolve: fakeResolve });
  const run = check.start();
  await ready(calls, 1);
  assert.equal(check.running, true);
  check.stop();
  assert.equal((await run).killed, true);
  assert.equal(check.running, false);
  const early = check.start();
  check.stop();
  assert.equal((await early).killed, true);
  assert.equal(calls.length, 1);
});

test('typecheck dev server: reports through the logger, never blocks, and rechecks after a change', async () => {
  const root = project('dev', { bad: true });
  const lines = [];
  const customLogger = {
    info: (m) => lines.push(['info', m]),
    warn: (m) => lines.push(['warn', m]),
    warnOnce: (m) => lines.push(['warn', m]),
    error: (m) => lines.push(['error', m]),
    clearScreen() {},
    hasErrorLogged: () => false,
    hasWarned: false,
  };
  const server = await createServer({
    root,
    configFile: false,
    customLogger,
    logLevel: 'info',
    plugins: [stencilrs({ typecheck: { bin: 'tsc' } })],
    server: { port: 0, host: '127.0.0.1', watch: { usePolling: false } },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    await server.listen();
    const until = async (re, from = 0) => {
      for (let i = 0; i < 400; i++) {
        const hit = lines.slice(from).find(([, m]) => re.test(m));
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.fail(`no log line matching ${re}; got ${JSON.stringify(lines)}`);
    };
    const [level, message] = await until(/typecheck failed/);
    assert.equal(level, 'error');
    assert.match(message, /TS2322/);
    // Fix the file: the watcher triggers a debounced re-run that passes.
    const mark = lines.length;
    writeFileSync(join(root, 'src', 'check', 'value.ts'), `export const n: number = 2;\n`);
    server.watcher.emit('change', join(root, 'src', 'check', 'value.ts'));
    const [okLevel] = await until(/typecheck passed \(tsc\)/, mark);
    assert.equal(okLevel, 'info');
  } finally {
    await server.close();
  }
});
