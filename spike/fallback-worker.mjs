// The happy-dom renderer in a worker thread: the fallback for pages the string renderer throws `Fallback` for.
// A worker keeps happy-dom's window/document globals out of the main thread (a DOM-less renderer must
// not find a `document`), and its renders can overlap with the main thread's string renders.
import { parentPort, workerData } from 'node:worker_threads';
import { createRenderer } from '../runtime-server.js';

const render = await createRenderer(() => Promise.all(workerData.modules.map((m) => import(m))));
parentPort.postMessage({ ready: true });
parentPort.on('message', async ({ id, html, opts }) => {
  try {
    parentPort.postMessage({ id, html: await render(html, opts) });
  } catch (e) {
    parentPort.postMessage({ id, error: String(e && e.stack) });
  }
});
