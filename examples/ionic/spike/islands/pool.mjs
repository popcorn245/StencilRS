import { Worker } from 'node:worker_threads';

/** A fixed pool of render threads: `render(html, options)` resolves with `{ html, styles, hydratedCount }`. FIFO queue, one job per thread. */
export const createPool = async (hydrate, size) => {
  const file = new URL('./pool-worker.mjs', import.meta.url);
  const slots = [];
  const queue = [];
  let n = 0;
  const pump = () => {
    for (const s of slots) {
      if (s.job || !queue.length) continue;
      s.job = queue.shift();
      s.worker.postMessage({ id: s.job.id, html: s.job.html, options: s.job.options });
    }
  };
  await Promise.all(
    Array.from({ length: size }, () => {
      const worker = new Worker(file, { workerData: { hydrate } });
      const slot = { worker, job: null };
      slots.push(slot);
      worker.on('message', (m) => {
        if (m.ready) return resolveReady(slot);
        const job = slot.job;
        slot.job = null;
        if (m.error) job.reject(new Error(m.error));
        else job.resolve(m);
        pump();
      });
      return new Promise((r) => (slot.ready = r));
    })
  );
  function resolveReady(slot) {
    slot.ready();
  }
  return {
    size,
    render: (html, options) => new Promise((resolve, reject) => { queue.push({ id: n++, html, options, resolve, reject }); pump(); }),
    close: () => Promise.all(slots.map((s) => s.worker.terminate())),
  };
};
