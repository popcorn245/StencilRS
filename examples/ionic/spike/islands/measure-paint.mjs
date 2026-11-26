// Q5, browser side: FCP and LCP of the routes of server.mjs in Chromium, no throttling and a 'Fast 3G'-like profile
// (CDP Network.emulateNetworkConditions: 1.6 Mbit/s down, 750 kbit/s up, 150 ms latency, or LATENCY=ms), cold cache each load, interleaved rounds.
// The page is the server's HTML and its stylesheet (render-blocking, as in a real Ionic app); the client bundle is NOT loaded here (see measure-client.mjs).
//   node spike/islands/measure-paint.mjs <port> [rounds=9] [profiles=none,fast3g] [routes=full,inorder,early,ooo]
import { launch, stats, fmt } from './lib.mjs';

const [port, roundsArg = '9', profilesArg = 'none,fast3g', routesArg = 'full,inorder,early,ooo'] = process.argv.slice(2);
const rounds = Number(roundsArg);
const profiles = {
  none: null,
  fast3g: { offline: false, latency: Number(process.env.LATENCY ?? 150), downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
};
const routes = routesArg.split(',');
const pages = (process.env.PAGES ?? 'list-50,kitchen-sink').split(',');
const origin = `http://127.0.0.1:${port}`;

const browser = await launch();
const load = async (path, profile) => {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 800 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', profile ?? { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.addInitScript(() => {
    window.__m = { lcp: 0, fcp: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(origin + path, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(profile ? 600 : 300);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return { ...window.__m, responseStart: nav.responseStart, responseEnd: nav.responseEnd, load: nav.loadEventEnd };
  });
  await ctx.close();
  return m;
};

const out = [];
for (const [pname, profile] of Object.entries(profiles).filter(([n]) => profilesArg.split(',').includes(n))) {
  for (const pageName of pages) {
    const acc = Object.fromEntries(routes.map((r) => [r, { fcp: [], lcp: [], rs: [], re: [] }]));
    for (let i = 0; i < rounds + 1; i++)
      for (const route of routes.map((_, k) => routes[(k + i) % routes.length])) {
        const m = await load(`/${route}/${pageName}`, profile);
        if (i === 0) continue; // warm-up round (browser, server)
        acc[route].fcp.push(m.fcp); acc[route].lcp.push(m.lcp); acc[route].rs.push(m.responseStart); acc[route].re.push(m.responseEnd);
      }
    for (const route of routes) {
      const row = { profile: pname, page: pageName, route, fcp: stats(acc[route].fcp), lcp: stats(acc[route].lcp), responseStart: stats(acc[route].rs), responseEnd: stats(acc[route].re) };
      out.push(row);
      console.log(`${pname.padEnd(7)} ${pageName.padEnd(13)} ${route.padEnd(8)} FCP ${fmt(row.fcp, 0)}  LCP ${fmt(row.lcp, 0)}  resStart ${fmt(row.responseStart, 0)}  resEnd ${fmt(row.responseEnd, 0)}`);
    }
  }
}
await browser.close();
console.log(JSON.stringify(out));
