// A stand-in hydrate app for render-cache.test.js: every render is stamped with a counter, so a cached page is
// recognizable by repeating the stamp. `<x-fail>` yields an error diagnostic, `<x-throw>` throws.
let n = 0;
export const renderToString = async (html, options = {}) => {
  if (html.includes('x-throw')) throw new Error('boom');
  const diagnostics = html.includes('x-fail') ? [{ level: 'error', messageText: 'bad' }] : html.includes('x-warn') ? [{ level: 'warn', messageText: 'careful' }] : [];
  return { html: `<!--${++n}-->${html}|${JSON.stringify(options)}`, diagnostics };
};
