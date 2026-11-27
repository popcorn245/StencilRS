// What a static island (never hydrated) could drop: Stencil's hydration annotations (s-id, c-id, s-sn, the <!--r. o. s. t. c.--> comments, sty-id).
import { gzipSync } from 'node:zlib';
import { PAGES, MODES } from './lib.mjs';
import { idbaseHref } from './assemble.mjs';
import { renderIsland } from './islands.mjs';

const h = await import(idbaseHref);
const strip = (html) => html.replace(/ (?:s-id|c-id|s-sn|s-mode)="[^"]*"/g, '').replace(/<!--[rostc]\.[^>]*-->/g, '');
for (const [pageName, names] of [['list-50', ['b']], ['kitchen-sink', ['form', 'rest']]])
  for (const modeName of ['dsd', 'scoped']) {
    let raw = 0, rawS = 0, gz = 0, gzS = 0;
    for (const n of names) {
      const html = await renderIsland(h, PAGES[pageName], n, { prettyHtml: false, serializeShadowRoot: MODES[modeName] });
      raw += html.length; rawS += strip(html).length; gz += gzipSync(html).length; gzS += gzipSync(strip(html)).length;
    }
    console.log(`${pageName} ${names.join('+')} ${modeName}: ${raw} -> ${rawS} B (${(100 * (1 - rawS / raw)).toFixed(1)}%), gzip ${gz} -> ${gzS} B (${(100 * (1 - gzS / gz)).toFixed(1)}%)`);
  }
