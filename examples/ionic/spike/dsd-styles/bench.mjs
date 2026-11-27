// Load bench of the DSD style variants (docs/spike-dsd-styles.md). Chromium, local HTTP with gzip, no JavaScript on the page.
//
//   node spike/dsd-styles/bench.mjs <variantsDir> [--runs 11] [--pages list-50,kitchen-sink] [--variants a-inline,b-link,...]
//                                   [--profiles desktop,mobile] [--cache cold,warm]
//
// Per (page, profile, cache) the variants are interleaved round by round (round r loads every variant once), so drift of the
// shared box hits all variants alike. Two passes per load kind: untraced (FCP, LCP, DCL, transfer) and traced
// (Parse HTML, Recalculate Style from a devtools.timeline trace; tracing itself costs time, so paints are taken untraced).
//   cold   fresh browser context per load (empty HTTP cache)
//   warm   same context, one priming load, then the measured load: HTML is `no-store`, stylesheets are `max-age=3600`
//   desktop no throttling; mobile  4x CPU, 150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up (docs/runtime.md's load bench)
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createSecureServer } from 'node:http2';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { loadavg } from 'node:os';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const dir = argv[0];
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? dflt : argv[i + 1];
};
const RUNS = Number(opt('runs', 11));
const PAGES = opt('pages', 'list-50,kitchen-sink').split(',');
const VARIANTS = opt('variants', 'a-inline,b-link,b-preload,d-scoped').split(',');
const PROFILE_NAMES = opt('profiles', 'desktop,mobile').split(',');
const CACHES = opt('cache', 'cold,warm').split(',');
const CHROME_ARGS = (process.env.CHROME_ARGS ?? '').split(' ').filter(Boolean);
const CSS_DELAY = Number(process.env.CSS_DELAY ?? 0);

const types = { '.html': 'text/html', '.css': 'text/css' };
const H2 = process.env.H2 === '1';
const handler = (req, res) => {
  req.url ??= req.headers[':path'];
  const url = req.url.split('?')[0];
  const path = join(dir, url);
  if (!path.startsWith(dir) || !existsSync(path)) return res.writeHead(404).end();
  const type = types[extname(path)] ?? 'application/octet-stream';
  const headers = {
    'content-type': type,
    'content-encoding': 'gzip',
    'cache-control': type === 'text/css' ? 'public, max-age=3600' : 'no-store',
  };
  const body = gzipSync(readFileSync(path), { level: 6 });
  const send = () => res.writeHead(200, headers).end(body);
  if (type === 'text/css' && CSS_DELAY && url.startsWith('/c/')) setTimeout(send, CSS_DELAY);
  else send();
};
const server = H2
  ? createSecureServer({ key: readFileSync(join(process.env.CERT_DIR, 'key.pem')), cert: readFileSync(join(process.env.CERT_DIR, 'cert.pem')), allowHTTP1: false }, handler)
  : createServer(handler);
await new Promise((r) => server.listen(0, r));
const origin = `${H2 ? 'https' : 'http'}://localhost:${server.address().port}`;

const PROFILES = {
  desktop: { cpu: 1, net: null },
  mobile: { cpu: 4, net: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 } },
};
const median = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox', ...CHROME_ARGS] });

async function prepare(context, page, profile) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  if (profile.net) await cdp.send('Network.emulateNetworkConditions', profile.net);
  const stats = { transfer: 0, requests: 0, fromCache: 0 };
  cdp.on('Network.loadingFinished', (e) => (stats.transfer += e.encodedDataLength));
  cdp.on('Network.requestWillBeSent', () => stats.requests++);
  cdp.on('Network.requestServedFromCache', () => stats.fromCache++);
  return { cdp, stats };
}

const sumTrace = (events) => {
  const out = { parse: 0, recalc: 0, layout: 0 };
  for (const e of events) {
    if (e.ph !== 'X' || e.dur == null) continue;
    if (e.name === 'ParseHTML') out.parse += e.dur / 1000;
    else if (e.name === 'UpdateLayoutTree') out.recalc += e.dur / 1000;
    else if (e.name === 'Layout') out.layout += e.dur / 1000;
  }
  return out;
};

async function once(variant, page, profile, cache, traced) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, javaScriptEnabled: true, viewport: { width: 412, height: 915 } });
  const p = await context.newPage();
  const url = `${origin}/${variant}/${page}.html`;
  const { cdp, stats } = await prepare(context, p, profile);
  try {
    if (cache === 'warm') {
      // priming load (traces off; stats reset after)
      await p.goto(url, { waitUntil: 'load' });
      await p.waitForTimeout(300);
      stats.transfer = stats.requests = stats.fromCache = 0;
    }
    await p.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    if (traced) await browser.startTracing(p, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const m = await p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        lcp: window.__lcp,
        dcl: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd,
        responseEnd: nav.responseEnd,
        // when the last shared sheet arrived (0: none), and the first paint that can show styled shadow content
        sheetsDone: Math.max(0, ...performance.getEntriesByType('resource').filter((r) => r.name.includes('/c/')).map((r) => r.responseEnd)),
      };
    });
    if (traced) {
      const buf = await browser.stopTracing();
      Object.assign(m, sumTrace(JSON.parse(buf.toString()).traceEvents));
    }
    const mem = (await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }))).metrics ?? [];
    Object.assign(m, { transfer: stats.transfer, requests: stats.requests });
    return m;
  } finally {
    await context.close();
  }
}

const results = [];
console.log(`# ${H2 ? 'h2' : 'http/1.1'}; load average at start: ${loadavg().map((n) => n.toFixed(2)).join(' ')}; runs=${RUNS}; chrome ${browser.version()}${CHROME_ARGS.length ? ' ' + CHROME_ARGS.join(' ') : ''}`);
for (const page of PAGES) {
  for (const profileName of PROFILE_NAMES) {
    for (const cache of CACHES) {
      const samples = Object.fromEntries(VARIANTS.map((v) => [v, { un: [], tr: [] }]));
      // one untimed warm-up round (Chromium's own first-run costs)
      for (const v of VARIANTS) await once(v, page, PROFILES[profileName], cache, false);
      for (let r = 0; r < RUNS; r++) {
        for (const v of VARIANTS) samples[v].un.push(await once(v, page, PROFILES[profileName], cache, false));
        for (const v of VARIANTS) samples[v].tr.push(await once(v, page, PROFILES[profileName], cache, true));
      }
      for (const v of VARIANTS) {
        const col = (k, which) => samples[v][which].map((s) => s[k]).filter((x) => x != null);
        const rng = (xs) => !xs.length ? "n/a" : `${median(xs).toFixed(1)} (${Math.min(...xs).toFixed(0)}-${Math.max(...xs).toFixed(0)})`;
        const row = {
          page, profile: profileName, cache, variant: v,
          fcp: rng(col('fcp', 'un')), sheetsDone: rng(col('sheetsDone', 'un')), lcp: rng(col('lcp', 'un')), dcl: rng(col('dcl', 'un')),
          parse: rng(col('parse', 'tr')), recalc: rng(col('recalc', 'tr')), layout: rng(col('layout', 'tr')),
          transfer: median(col('transfer', 'un')), requests: median(col('requests', 'un')),
          fcpMedian: col("fcp", "un").length ? median(col("fcp", "un")) : null, parseMedian: median(col('parse', 'tr')), recalcMedian: median(col('recalc', 'tr')),
        };
        results.push(row);
        console.log(JSON.stringify(row));
      }
    }
  }
}
console.log(`# load average at end: ${loadavg().map((n) => n.toFixed(2)).join(' ')}`);
await browser.close();
server.close();
