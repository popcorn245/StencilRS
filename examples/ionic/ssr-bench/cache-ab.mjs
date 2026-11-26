// Interleaved A/B of stencilEngine's renderCache (issue #181) under autocannon: off, on, off, on, ... in one loop, a fresh
// server per run. "On" is a 100% hit rate (one page, every request after the first is a hit): an upper bound, not real traffic.
//   node ssr-bench/cache-ab.mjs [--hydrate <index.js>] [--page list-50] [--mode declarative-shadow-dom] [--workers 0] [--rounds 5] [--duration 5] [--connections 4]
import autocannon from 'autocannon';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const here = dirname(fileURLToPath(import.meta.url));
const file = opt('--hydrate', join(here, '../dist/hydrate-stencilrs/index.js'));
const page = opt('--page', 'list-50');
const mode = opt('--mode', 'declarative-shadow-dom');
const workers = opt('--workers', '0');
const rounds = Number(opt('--rounds', 5));
const duration = Number(opt('--duration', 5));
const connections = Number(opt('--connections', 4));

const freePort = () => new Promise((ok) => { const s = createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); }); });
const one = async (cache) => {
  const port = await freePort();
  const server = spawn(process.execPath, [join(here, 'server.mjs'), file, page, mode, String(port), workers, cache ? 'cache' : 'nocache'], { stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise((ok, fail) => { server.stdout.on('data', (d) => String(d).includes('listening') && ok()); server.on('exit', (c) => fail(new Error(`server exited ${c}`))); });
    const url = `http://127.0.0.1:${port}/`;
    await (await fetch(url)).text();
    const r = await autocannon({ url, connections, duration });
    if (r.errors || r.non2xx || r.timeouts) throw new Error(`errors: ${r.errors} non2xx ${r.non2xx} timeouts ${r.timeouts}`);
    return { rps: r.requests.average, p99: r.latency.p99, p50: r.latency.p50 };
  } finally {
    server.removeAllListeners('exit');
    server.kill('SIGKILL');
  }
};
const med = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const runs = { off: [], on: [] };
for (let i = 0; i < rounds; i++) for (const k of ['off', 'on']) { runs[k].push(await one(k === 'on')); console.error(`round ${i + 1} ${k}: ${runs[k].at(-1).rps.toFixed(1)} req/s, p99 ${runs[k].at(-1).p99} ms`); }
const sum = (k, f) => { const v = runs[k].map(f); return `${med(v).toFixed(1)} (${Math.min(...v).toFixed(1)}-${Math.max(...v).toFixed(1)})`; };
console.log(`page ${page}, ${mode}, workers ${workers}, ${connections} connections, ${duration} s, n=${rounds} interleaved; median (min-max)`);
for (const k of ['off', 'on']) console.log(`cache ${k}: ${sum(k, (r) => r.rps)} req/s, p99 ${sum(k, (r) => r.p99)} ms`);
