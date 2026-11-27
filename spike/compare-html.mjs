// Byte-compares the string renderer's HTML with the happy-dom renderer's on the 500-card page.
//   node spike/compare-html.mjs [out-dir]   (writes string.html and dom.html to out-dir when given)
import { createStringRenderer } from './runtime-string.js';
import { createRenderer } from '../runtime-server.js';
import { writeFileSync } from 'node:fs';

const bench = new URL('../examples/starter/bench/', import.meta.url);
const strRender = await createStringRenderer(() => import(new URL('dist-load-string-server/entry-server.js', bench)));
const s = await strRender('<load-app></load-app>');
const domRender = await createRenderer(() => import(new URL('dist-load-stencilrs-server/entry-server.js', bench)));
const d = await domRender('<load-app></load-app>');
if (process.argv[2]) {
  writeFileSync(`${process.argv[2]}/string.html`, s);
  writeFileSync(`${process.argv[2]}/dom.html`, d);
}
console.log('string', s.length, 'dom', d.length, s === d ? 'IDENTICAL' : 'DIFFERENT');
if (s !== d) {
  let i = 0;
  while (s[i] === d[i]) i++;
  console.log('first difference at', i, '\nstring:', JSON.stringify(s.slice(Math.max(0, i - 120), i + 160)), '\ndom   :', JSON.stringify(d.slice(Math.max(0, i - 120), i + 160)));
}
process.exit(0);
