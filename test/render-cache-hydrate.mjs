// A stand-in hydrate app for render-cache.test.js: every render is stamped with a counter, so a cached page is
// recognizable by repeating the stamp. `<x-fail>` yields an error diagnostic, `<x-throw>` throws.
// The stamp carries the thread id: with `workers: 2` each worker has its own counter, so two workers' first renders
// would otherwise share a stamp.
import { threadId } from 'node:worker_threads';

let n = 0;
export const renderToString = async (html, options = {}) => {
  if (html.includes('x-throw')) throw new Error('boom');
  const diagnostics = html.includes('x-fail') ? [{ level: 'error', messageText: 'bad' }] : html.includes('x-warn') ? [{ level: 'warn', messageText: 'careful' }] : [];
  return { html: `<!--${threadId}.${++n}-->${html}|${JSON.stringify(options)}`, diagnostics };
};
