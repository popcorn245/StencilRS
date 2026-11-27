// A render thread of stencilEngine's pool (`workers: n`, see express.js). It imports the hydrate app once, then
// answers `{ id, html, options, fragment? }` messages with `{ id, html, diagnostics }` (and, for `fragment: true`, `styles`, `components`, `hydratedCount`), or `{ id, error }` when renderToString throws.
// Strings travel by structured clone: ~1.2 ms for a 1 MB page, against hundreds of ms to render it, and
// encoding to a transferred ArrayBuffer measured slower (the main thread then pays a decode on top), so there is no buffer path.
import { parentPort, workerData } from 'node:worker_threads';

import { enableCompileCache, fragmentResult, pickRenderToString } from './express-hydrate.js';

// Before the import: a thread has its own isolate, so the main thread's `enableCompileCache` does not reach it.
enableCompileCache(workerData.compileCache);

// Load, then `loaded`; the main thread answers with the warm-up renders (it holds the views and the inner engine) and
// `ready` follows them. Without a warm-up the main thread sends none and `ready` follows at once.
let renderToString;
try {
  renderToString = pickRenderToString(await import(workerData.hydrate));
  parentPort.postMessage({ loaded: true });
} catch (e) {
  parentPort.postMessage({ initError: { message: String(e?.message ?? e), stack: e?.stack } });
}

parentPort.on('message', async ({ id, html, options, fragment, warm, times }) => {
  if (warm) {
    let error;
    for (let n = 0; n < times; n++) {
      for (const w of warm) {
        try {
          await renderToString(w.html, w.options); // diagnostics ignored, as in-process
        } catch (e) {
          error ??= { message: String(e?.message ?? e), stack: e?.stack };
        }
      }
    }
    parentPort.postMessage({ ready: true, warmError: error });
    return;
  }
  try {
    const result = await renderToString(html, options);
    // Only what crosses: the page and the diagnostics (plain objects), and for a fragment render (`renderFragment`) the styles,
    // components and hydrated count too. The rest of the result stays here.
    parentPort.postMessage(fragment ? { id, ...fragmentResult(result) } : { id, html: result.html, diagnostics: result.diagnostics ?? [] });
  } catch (e) {
    parentPort.postMessage({ id, error: { message: String(e?.message ?? e), stack: e?.stack } });
  }
});
