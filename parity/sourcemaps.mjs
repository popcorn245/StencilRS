// Source map check: stencilrs' maps, scored the same way as Stencil v5's own (transpileSync), on
// the parity corpus.
//
//   node sourcemaps.mjs [--mode customelement|module|lazy] [--verbose] [--misses]
//
// --verbose lists the first identifier misses per file; --misses tallies every stencilrs miss
// as `generated identifier => source text it points at`, most frequent first.
//
// Maps are not compared byte for byte (the two printers lay code out differently). Each
// stencilrs map is checked for being valid (version 3, one source, sourcesContent is the
// original, every mapping inside it), and both compilers' maps are scored for accuracy: of the
// mapped positions where the output starts with an identifier, how many point at that same
// identifier in the source.
// Exit code 1 if any stencilrs map is invalid, or its accuracy falls below Stencil's.
import { readFileSync } from 'node:fs';

import { transpile } from '../index.js';
import { fallbacks, listFixtures, modeArg, stencilrsOptions, transpileOptions } from './lib.mjs';

const mode = modeArg(process.argv);
const verbose = process.argv.includes('--verbose');
const tally = process.argv.includes('--misses') ? new Map() : null;
// Line terminators, as in the ECMAScript spec and oxc: CRLF, CR, LF, LS (U+2028), PS (U+2029).
const LINES = new RegExp(`\r\n|[\r\n${String.fromCharCode(0x2028, 0x2029)}]`);
const IDENT = /^[A-Za-z_$][\w$]*/;
const B64 = Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map((c, i) => [c, i]));

/** Decode v3 `mappings` into [genLine, genCol, srcLine, srcCol] for segments with a source. */
const decode = (mappings) => {
  const out = [];
  const state = [0, 0, 0, 0, 0];
  mappings.split(';').forEach((line, genLine) => {
    state[0] = 0;
    for (const seg of line.split(',')) {
      if (!seg) continue;
      const fields = [];
      let value = 0;
      let shift = 0;
      for (const ch of seg) {
        const digit = B64[ch];
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
          value = 0;
          shift = 0;
        }
      }
      for (let i = 0; i < fields.length; i++) state[i] += fields[i];
      if (fields.length >= 4) out.push([genLine, state[0], state[2], state[3]]);
    }
  });
  return out;
};

const score = (map, code, source) => {
  const m = typeof map === 'string' ? JSON.parse(map) : map;
  const problems = [];
  if (m.version !== 3) problems.push(`version ${m.version}`);
  if (m.sources?.length !== 1) problems.push(`${m.sources?.length} sources`);
  if (m.sourcesContent && m.sourcesContent[0] !== source) problems.push('sourcesContent differs from the source');
  const gen = code.split(LINES);
  const src = source.split(LINES);
  let idents = 0;
  let hits = 0;
  const misses = [];
  for (const [gl, gc, sl, sc] of decode(m.mappings)) {
    const srcLine = src[sl];
    if (srcLine === undefined || sc > srcLine.length) {
      problems.push(`mapping ${gl + 1}:${gc} -> ${sl + 1}:${sc} is outside the source`);
      continue;
    }
    const id = IDENT.exec(gen[gl]?.slice(gc) ?? '')?.[0];
    if (!id) continue;
    idents++;
    const at = srcLine.slice(sc);
    if (IDENT.exec(at)?.[0] === id) hits++;
    else misses.push({ id, at, where: `@${gl + 1}:${gc} -> ${sl + 1}:${sc}` });
  }
  return { problems, idents, hits, misses };
};

const totals = { stencil: { idents: 0, hits: 0 }, stencilrs: { idents: 0, hits: 0 } };
let invalid = 0;
let skipped = 0;
const fixtures = listFixtures();
for (const { id, file } of fixtures) {
  if (fallbacks[mode]?.has(id)) continue; // stencilrs emits no code for these
  const source = readFileSync(file, 'utf8');
  const st = transpileSync(source, transpileOptions(source, id, mode));
  const rs = transpile(source, stencilrsOptions(source, id, mode));
  // When Stencil throws, transpileSync hands back the source with no map, and so does stencilrs.
  if (!st.map && !rs.map) {
    skipped++;
    continue;
  }
  if (!rs.map) {
    invalid++;
    console.log(`✗ ${id}: stencilrs returned no map`);
    continue;
  }
  const scores = { stencil: st.map ? score(st.map, st.code, source) : null, stencilrs: score(rs.map, rs.code, source) };
  for (const [k, s] of Object.entries(scores)) {
    if (!s) continue;
    totals[k].idents += s.idents;
    totals[k].hits += s.hits;
  }
  const rsScore = scores.stencilrs;
  if (rsScore.problems.length) {
    invalid++;
    console.log(`✗ ${id}: ${[...new Set(rsScore.problems)].slice(0, 3).join('; ')}`);
  } else if (verbose && rsScore.misses.length) {
    const first = rsScore.misses.slice(0, 5).map((x) => `${x.id} ${x.where} "${x.at.slice(0, 24)}"`);
    console.log(`  ${id}: ${rsScore.hits}/${rsScore.idents} identifiers\n    ${first.join('\n    ')}`);
  }
  for (const x of tally ? rsScore.misses : []) {
    const key = `${x.id} => ${x.at.slice(0, 16)}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
}

if (tally) {
  console.log('\nstencilrs misses, most frequent first:');
  for (const [miss, n] of [...tally].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`${String(n).padStart(6)}  ${miss}`);
}

const rate = (t) => t.hits / t.idents;
console.log(`\n${fixtures.length} files (${skipped} that neither compiler compiles), ${invalid} invalid stencilrs maps`);
console.log('identifiers mapped onto the same identifier in the source:');
for (const [k, t] of Object.entries(totals)) {
  console.log(`  ${k.padEnd(10)} ${`${(rate(t) * 100).toFixed(1)}%`.padStart(6)} of ${t.idents}`);
}
if (invalid || rate(totals.stencilrs) < rate(totals.stencil)) process.exit(1);
