// Assemble a page from its pieces the way the streaming engine writes it (in order), as one string: for the checks that do not need a server.
import { HYDRATE, MODES, PAGES } from './lib.mjs';
import { createPool } from './pool.mjs';
import { renderPage, streamInOrder, streamOutOfOrder } from './stream.mjs';
import { pathToFileURL } from 'node:url';

export const idbaseHref = pathToFileURL(HYDRATE.replace(/index\.js$/, 'index.idbase.js')).href;

export const assemble = async (pool, pageName, modeName, { order = 'in', dedupe = true } = {}) => {
  const rendered = renderPage(pool, PAGES[pageName], { mode: MODES[modeName] });
  let out = '';
  const chunks = [];
  const write = async (c) => { out += c; chunks.push(c.length); };
  await (order === 'ooo' ? streamOutOfOrder : streamInOrder)(write, rendered);
  return { html: out, chunks };
};

export const openPool = (n = 2) => createPool(idbaseHref, n);
