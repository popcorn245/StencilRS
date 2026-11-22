// A render thread of stencilEngine's pool (`workers: n`, see express.js). It imports the hydrate app once, then
// answers `{ id, html, options }` messages with `{ id, html, diagnostics }`, or `{ id, error }` when renderToString throws.
// Strings travel by structured clone: ~1.2 ms for a 1 MB page, against hundreds of ms to render it, and
// encoding to a transferred ArrayBuffer measured slower (the main thread then pays a decode on top), so there is no buffer path.
import { parentPort, workerData } from 'node:worker_threads';

import { pickRenderToString } from './express-hydrate.js';

let renderToString;
try {
  renderToString = pickRenderToString(await import(workerData.hydrate));
  parentPort.postMessage({ ready: true });
} catch (e) {
  parentPort.postMessage({ initError: { message: String(e?.message ?? e), stack: e?.stack } });
}

parentPort.on('message', async ({ id, html, options }) => {
  try {
    const result = await renderToString(html, options);
    // Only what crosses: the page and the diagnostics (plain objects). The rest of the result stays here.
    parentPort.postMessage({ id, html: result.html, diagnostics: result.diagnostics ?? [] });
  } catch (e) {
    parentPort.postMessage({ id, error: { message: String(e?.message ?? e), stack: e?.stack } });
  }
});
