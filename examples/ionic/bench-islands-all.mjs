// Issue #196: every islands benchmark in one run, on the Ionic pages (list-50, kitchen-sink).
//
//   npm run bench:islands -- [--workers 2] [--rounds 40] [--throughput-rounds 3] [--paint-rounds 9] [--client-rounds 15] [--cpu 1]
//   npm run bench:islands -- --server-only | --client-only
//
// 1. bench-islands.mjs        server: TTFB, last byte, gzip size and requests/s for full, islands, cached, in-order, early head and out-of-order, then
//                             Chromium FCP and LCP, unthrottled and on a Fast 3G profile with the round trip split around the server
// 2. bench-islands-client.mjs client: script time, JS requested and ready, directives (static, visible) against all-`load`, on the minified
//                             production hydrating client build
// Both interleave the variants (every round visits each once, the start rotating) and print medians with (min-max, n). The builds they need
// (`npm run build:hydrate`, and the client build below) are made when they are missing.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, def) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : def);
const flag = (name) => argv.includes(name);
const run = (script, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (!existsSync(join(root, 'dist/hydrate-stencilrs/index.js'))) run('scripts/build-hydrate.mjs');
const clientDir = process.env.IONIC_HYDRATE_CLIENT_DIR ?? join(root, 'dist-hydrate-client');
if (!flag('--server-only') && !existsSync(join(clientDir, 'components.json')))
  run('node_modules/vite/bin/vite.js', ['build', '--config', 'vite.config.ts'], { IONIC_HYDRATE_CLIENT: '1', IONIC_OUT_DIR: clientDir });

if (!flag('--client-only')) {
  console.log('== server and paint (bench-islands.mjs) ==');
  run('bench-islands.mjs', [opt('--workers', '2'), opt('--rounds', '40'), opt('--throughput-rounds', '3'), opt('--paint-rounds', '9')]);
}
if (!flag('--server-only')) {
  console.log('\n== client (bench-islands-client.mjs) ==');
  run('bench-islands-client.mjs', [opt('--client-rounds', '15'), opt('--cpu', '1')]);
}
