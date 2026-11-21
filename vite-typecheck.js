// Opt-in type check for the Vite plugin: `stencilrs({ typecheck: true })` (see README, "Type-check the build").
//
// stencilrs transpiles and never type-checks; `stencil build` does. This runs a checker (`tsgo`, the native
// TypeScript port, preferred; else `tsc`) with `--noEmit` in a child process, so it overlaps the build, and hands
// its verdict to vite.js. The child is spawned without a shell, from the executable itself (not a `.cmd` shim),
// so killing a stale run really ends it, on Windows too.
import { spawn as nodeSpawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ERROR_LINE_RE = /error TS\d+/g;

/** The `typecheck` option as `{ tsconfig?, bin? }`, or null (off). */
export function normalizeTypecheck(option) {
  if (!option) return null;
  if (option === true) return {};
  if (typeof option !== 'object') throw new Error(`[stencilrs] typecheck must be a boolean or { tsconfig?, bin? }, got ${JSON.stringify(option)}`);
  if (option.bin !== undefined && option.bin !== 'tsgo' && option.bin !== 'tsc') {
    throw new Error(`[stencilrs] typecheck.bin must be 'tsgo' or 'tsc', got ${JSON.stringify(option.bin)}`);
  }
  if (option.tsconfig !== undefined && typeof option.tsconfig !== 'string') throw new Error('[stencilrs] typecheck.tsconfig must be a path string');
  return { ...option };
}

const tryResolve = (req, id) => {
  try {
    return req.resolve(id);
  } catch {
    return null;
  }
};

/**
 * The command that runs the checker: `{ name, command, args, cwd }`. `tsgo` when `@typescript/native-preview`
 * resolves from `root` (unless `bin: 'tsc'`), else `tsc` from `typescript`, else an error that says what to install.
 */
export async function resolveChecker(root, { tsconfig, bin } = {}) {
  const config = resolve(root, tsconfig ?? 'tsconfig.json');
  if (!existsSync(config)) throw new Error(`[stencilrs] typecheck: ${config} not found (set typecheck.tsconfig)`);
  const req = createRequire(join(root, 'noop.js'));
  // --skipLibCheck: `stencil build` forces it, so a project ported from it may not set it, and declaration files in
  // node_modules would otherwise fail the check.
  const flags = ['--noEmit', '--skipLibCheck', '-p', config, '--pretty', 'false'];
  for (const name of bin ? [bin] : ['tsgo', 'tsc']) {
    if (name === 'tsgo') {
      const pkgPath = tryResolve(req, '@typescript/native-preview/package.json');
      if (!pkgPath) continue;
      const pkgDir = dirname(pkgPath);
      try {
        // The platform executable the package's own `bin` wrapper starts: spawned directly, no wrapper process in between.
        const { default: getExePath } = await import(pathToFileURL(join(pkgDir, 'lib', 'getExePath.js')).href);
        return { name, command: getExePath(), args: flags, cwd: root };
      } catch {
        const script = join(pkgDir, JSON.parse(readFileSync(pkgPath, 'utf8')).bin?.tsgo ?? 'bin/tsgo');
        return { name, command: process.execPath, args: [script, ...flags], cwd: root };
      }
    }
    const pkgPath = tryResolve(req, 'typescript/package.json');
    if (!pkgPath) continue;
    const script = join(dirname(pkgPath), JSON.parse(readFileSync(pkgPath, 'utf8')).bin?.tsc ?? 'bin/tsc');
    return { name, command: process.execPath, args: [script, ...flags], cwd: root };
  }
  const pkg = bin === 'tsc' ? 'typescript' : '@typescript/native-preview';
  const either = bin ? '' : ' (or typescript)';
  throw new Error(`[stencilrs] typecheck is on, but ${pkg}${either} cannot be resolved from ${root}. Install it: npm i -D ${pkg}`);
}

/**
 * One checker per plugin instance. `start()` begins a run (killing one still going) and returns its promise, `wait()`
 * settles with the latest run's `{ ok, killed, name, code, errors, output }`, `stop()` kills it.
 * `deps.spawn` / `deps.resolve` are for tests.
 */
export function createTypecheck(rootOrGetter, option, deps = {}) {
  const getRoot = typeof rootOrGetter === 'function' ? rootOrGetter : () => rootOrGetter;
  const options = normalizeTypecheck(option);
  const spawn = deps.spawn ?? nodeSpawn;
  const resolveBin = deps.resolve ?? resolveChecker;
  let current = null;
  let checker = null;

  const kill = (run) => {
    if (!run || run.done) return;
    run.killed = true;
    try {
      run.child?.kill();
    } catch {}
  };

  /** Resolve the checker once (throws the clear error); a later `start` reuses it. */
  const prepare = async () => (checker ??= await resolveBin(getRoot(), options));

  const start = () => {
    kill(current);
    const run = { done: false, killed: false, child: null };
    run.promise = (async () => {
      const cmd = await prepare();
      return new Promise((done) => {
        let output = '';
        const finish = (code, extra = '') => {
          run.done = true;
          const text = (output + extra).trim();
          done({ ok: code === 0 && !run.killed, killed: run.killed, name: cmd.name, code, output: text, errors: (text.match(ERROR_LINE_RE) ?? []).length });
        };
        if (run.killed) return finish(null);
        const child = spawn(cmd.command, cmd.args, { cwd: cmd.cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        run.child = child;
        child.stdout?.on('data', (d) => (output += d));
        child.stderr?.on('data', (d) => (output += d));
        child.once('error', (e) => finish(-1, `\n${e.message}`));
        child.once('close', (code) => finish(code));
      });
    })();
    // A rejection (no checker installed) is surfaced by whoever awaits the promise.
    run.promise.catch(() => {});
    current = run;
    return run.promise;
  };

  return {
    enabled: !!options,
    prepare,
    start,
    /** The latest run's result, or null when none was started. */
    wait: () => current?.promise ?? Promise.resolve(null),
    stop: () => kill(current),
    get running() {
      return !!current && !current.done;
    },
  };
}

/** The message a failed check puts in the build error and the log. */
export const formatFailure = (r) =>
  `[stencilrs] typecheck failed (${r.name}${r.errors ? `, ${r.errors} error${r.errors === 1 ? '' : 's'}` : `, exit ${r.code}`}):\n${r.output}`;
