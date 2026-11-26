// Prototype of the id-offset patch for Q1: the same guarded text-patch style as ssr-patches.js, applied here to the built hydrate app
// (the real thing would be a patch in ssr-patches.js run by buildHydrate, with a test and a guard like the others).
//
//   renderToString(html, { idBase: 5000 })   host ids and root-level ids of this render count from 5000 instead of the process-wide counter
//
// Writes dist/hydrate-stencilrs/index.idbase.js next to the original.
import { readFileSync, writeFileSync } from 'node:fs';
import { HYDRATE } from './lib.mjs';

const from = '\tdoc[STENCIL_DOC_DATA] = docData;\n\treturn win;';
const to = '\tdoc[STENCIL_DOC_DATA] = typeof opts.idBase === "number" ? { hostIds: opts.idBase, rootLevelIds: opts.idBase, staticComponents: new Set() } : docData;\n\treturn win;';
const code = readFileSync(HYDRATE, 'utf8');
const found = code.split(from).length - 1;
if (found !== 1) throw new Error(`expected the docData assignment once, found ${found}; has Stencil's runner changed?`);
const out = HYDRATE.replace(/index\.js$/, 'index.idbase.js');
writeFileSync(out, code.replace(from, to));
console.log('wrote', out);
