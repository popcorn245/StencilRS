// A cold `vite build` of the ui-kit with stencilrs must not load TypeScript or Stencil's
// compiler: `@stencil/core/compiler` (which bundles TypeScript) and `@stencil/unplugin` cost
// ~700 ms and are only needed when a file falls back to Stencil's compiler (see ../../vite.js).
//
//   node check-no-typescript.mjs [--config vite.lib.config.ts] [--expect-loaded]
//
// Runs the build in a child process with a loader hook (ESM imports) and a `Module._load` patch
// (CJS `require`) that record every module whose path is under typescript, @stencil/core's
// compiler or @stencil/unplugin. Exits 1 if any was loaded. With --expect-loaded it is the
// reverse (exit 1 if none was), which proves the probe itself works on a build that falls back.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire, register } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread } from 'node:worker_threads';

const WATCHED = /[\\/]node_modules[\\/](typescript[\\/]|@stencil[\\/]core[\\/](dist[\\/])?compiler[\\/]|@stencil[\\/]unplugin[\\/])/;
const here = fileURLToPath(import.meta.url);

// Hook thread: the ESM resolve step records what is imported.
export async function resolve(specifier, context, next) {
  const out = await next(specifier, context);
  if (WATCHED.test(decodeURIComponent(out.url))) appendFileSync(process.env.STENCILRS_LOAD_LOG, `import ${out.url}\n`);
  return out;
}

if (isMainThread && process.env.STENCILRS_LOAD_LOG) {
  // The child, preloaded with `--import`: hook ESM, patch CJS, then the real entry runs.
  register(import.meta.url);
  const Module = createRequire(import.meta.url)('node:module');
  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    let file = '';
    try {
      file = Module._resolveFilename(request, parent, isMain);
    } catch {}
    if (WATCHED.test(file)) appendFileSync(process.env.STENCILRS_LOAD_LOG, `require ${file}\n`);
    return load.apply(this, arguments);
  };
} else if (isMainThread && process.argv[1] === here) {
  const args = process.argv.slice(2);
  const config = args.includes('--config') ? args[args.indexOf('--config') + 1] : 'vite.lib.config.ts';
  const expectLoaded = args.includes('--expect-loaded');
  const dir = mkdtempSync(join(tmpdir(), 'stencilrs-loads-'));
  const log = join(dir, 'loads.log');
  writeFileSync(log, '');
  const vite = join(dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin/vite.js');
  const r = spawnSync(process.execPath, ['--import', here, vite, 'build', '--config', config, '--logLevel', 'warn'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    env: { ...process.env, STENCILRS_LOAD_LOG: log },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  const loads = [...new Set(readFileSync(log, 'utf8').split('\n').filter(Boolean))];
  rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0) {
    console.error(`vite build failed (exit ${r.status})`);
    process.exit(1);
  }
  if (expectLoaded) {
    if (!loads.length) {
      console.error('probe error: nothing watched was loaded, but this build should have loaded the compiler');
      process.exit(1);
    }
    console.log(`probe ok: ${loads.length} watched module(s) loaded`);
  } else if (loads.length) {
    console.error(`the build loaded TypeScript / Stencil's compiler (${loads.length} module(s)):\n  ${loads.slice(0, 10).join('\n  ')}`);
    process.exit(1);
  } else {
    console.log('ok: the cold vite build loaded no typescript, @stencil/core compiler or @stencil/unplugin');
  }
}
