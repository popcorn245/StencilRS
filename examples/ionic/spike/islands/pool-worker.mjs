// A render thread for the spike's mini pool (same shape as express-worker.js, but it sends back `styles` and `hydratedCount` too,
// which stencilEngine does not expose yet). The hydrate app is the idBase variant (make-idbase-hydrate.mjs).
import { parentPort, workerData } from 'node:worker_threads';

const { renderToString } = await import(workerData.hydrate);
parentPort.postMessage({ ready: true });
parentPort.on('message', async ({ id, html, options }) => {
  try {
    const r = await renderToString(html, options);
    parentPort.postMessage({ id, html: r.html, styles: r.styles ?? [], hydratedCount: r.hydratedCount, components: (r.components ?? []).map((c) => c.tag), diagnostics: (r.diagnostics ?? []).filter((d) => d.level === 'error') });
  } catch (e) {
    parentPort.postMessage({ id, error: String(e?.stack ?? e) });
  }
});
