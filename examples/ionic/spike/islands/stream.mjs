// The islands renderer of the spike: shell + islands rendered in parallel on a pool, written in order or out of order.
//   renderPage(pool, page, { mode, stride }) -> { shell: Promise<segments>, islands: [{ name, done: Promise<{ html, styles }> }] }
// Prototype, not library code.
import { markerRe, } from './islands.mjs';

const styleTag = (s) => `<style${s.id ? ` sty-id="${s.id}"` : ''}>${s.content}</style>`;

/**
 * Submit the shell and every island to the pool at once (shell first: FIFO). Island i counts host ids from (i + 1) * stride so the
 * ranges never overlap (a result with `hydratedCount` >= stride is reported in `overflow`).
 */
export const renderPage = (pool, page, { mode, stride = 1000, base = {} }) => {
  const opts = { prettyHtml: false, serializeShadowRoot: mode, buildId: 'islands-spike', ...base };
  const shell = pool.render(page.template, { ...opts, fullDocument: true, idBase: 0 });
  const names = Object.keys(page.islands);
  const islands = names.map((name, i) => ({
    name,
    done: pool.render(page.islands[name], { ...opts, fullDocument: false, idBase: (i + 1) * stride }),
  }));
  return { shell, islands, names };
};

/** Cut the rendered shell at the island markers: [before0, marker0, between01, marker1, ..., after]. */
export const cutShell = (shellHtml, names) => {
  const parts = [];
  let rest = shellHtml;
  for (const name of names) {
    const m = markerRe(name).exec(rest);
    if (!m) throw new Error(`marker ${name} missing in the rendered shell`);
    parts.push(rest.slice(0, m.index));
    rest = rest.slice(m.index + m[0].length);
  }
  parts.push(rest);
  return parts; // names.length + 1 segments
};

/** Page-wide style dedupe: the first island using a style carries it; a style the shell already put in <head> is never repeated. */
export const styleDeduper = (shellResult) => {
  const seen = new Set((shellResult.styles ?? []).map((s) => s.id ?? s.content));
  return (styles) => {
    const out = [];
    for (const s of styles) {
      if (!s.content) continue;
      const key = s.id ?? s.content;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(styleTag(s));
    }
    return out.join('');
  };
};

/** In order: the shell up to the first island at once, then each island as it is next in line. */
export const streamInOrder = async (write, rendered) => {
  const shellResult = await rendered.shell;
  const segs = cutShell(shellResult.html, rendered.names);
  const dedupe = styleDeduper(shellResult);
  await write(segs[0]);
  for (let i = 0; i < rendered.islands.length; i++) {
    const r = await rendered.islands[i].done;
    await write(dedupe(r.styles) + r.html + segs[i + 1]);
  }
};

const SWAP = `<script>function $ISL(i){var a=document.getElementById("isl-"+i),h=document.getElementById("isl-c-"+i),p=a.parentNode;while(h.firstChild)p.insertBefore(h.firstChild,a);a.remove();h.remove()}</script>`;

/** Out of order: the whole shell (islands as empty anchors) at once, then each island the moment it finishes, moved into place by a one-line script. */
export const streamOutOfOrder = async (write, rendered) => {
  const shellResult = await rendered.shell;
  const segs = cutShell(shellResult.html, rendered.names);
  const dedupe = styleDeduper(shellResult);
  const tailAt = segs[segs.length - 1].lastIndexOf('</body>');
  const tail = tailAt < 0 ? '' : segs[segs.length - 1].slice(tailAt);
  segs[segs.length - 1] = tailAt < 0 ? segs[segs.length - 1] : segs[segs.length - 1].slice(0, tailAt);
  let head = '';
  for (let i = 0; i < segs.length; i++) head += segs[i] + (i < rendered.names.length ? `<template id="isl-${i}"></template>` : '');
  await write(head + SWAP);
  const pending = new Map(rendered.islands.map((isl, i) => [i, isl.done.then((r) => [i, r])]));
  while (pending.size) {
    const [i, r] = await Promise.race(pending.values());
    pending.delete(i);
    await write(`<div hidden id="isl-c-${i}">${dedupe(r.styles)}${r.html}</div><script>$ISL(${i})</script>`);
  }
  await write(tail);
};

/**
 * Early head: `head` (the template's own <html>, <head> and <body> open, with the <html> attributes Stencil would add taken from a
 * probe render) is written before anything has rendered, so the browser starts fetching the stylesheet while the server works. The
 * shell's own component styles, which Stencil would have put in <head>, are written at the top of the body instead; then as in order.
 */
export const streamEarly = async (write, rendered, head) => {
  await write(head);
  const shellResult = await rendered.shell;
  const bodyAt = shellResult.html.indexOf('<body>');
  const segs = cutShell(shellResult.html.slice(bodyAt + '<body>'.length), rendered.names);
  const dedupe = styleDeduper({ styles: [] });
  await write(dedupe(shellResult.styles ?? []) + segs[0]);
  for (let i = 0; i < rendered.islands.length; i++) {
    const r = await rendered.islands[i].done;
    await write(dedupe(r.styles) + r.html + segs[i + 1]);
  }
};

/** The <html> open tag Stencil writes, from a render of an empty document (it does not depend on the page: see docs/spike-islands.md). */
export const probeHtmlTag = async (pool, mode, lang = 'en') => {
  const r = await pool.render(`<!doctype html><html lang="${lang}"><head></head><body></body></html>`, { prettyHtml: false, serializeShadowRoot: mode, buildId: 'islands-spike', fullDocument: true });
  return /<html[^>]*>/.exec(r.html)[0];
};

export const earlyHead = (page, htmlTag) => page.template.slice(0, page.template.indexOf('<body>') + '<body>'.length).replace(/<html[^>]*>/, htmlTag);
