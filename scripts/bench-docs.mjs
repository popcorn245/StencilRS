// Writes the headline benchmark numbers into README.md and storybook/docs/Introduction.mdx from
// storybook/docs/data/benchmarks.json, so the prose can't drift from the data.
//
//   node scripts/bench-docs.mjs [--check] [--json <file>]
//
// --check changes nothing and exits 1 if either file is out of date. Only the headline
// sentence and the benchmark rows of the "what is proven" table are touched, each found by its
// wording; a pattern that no longer matches is an error, not a silent skip. The cold-start rows
// are added after the `vite build` row the first time the JSON has them.
// scripts/refresh-benchmarks.mjs runs this after every refresh.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const defaultJson = join(repo, 'storybook/docs/data/benchmarks.json');

const dur = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);
const x = (a, b) => `${(a / b).toFixed(1)}×`;
const xInt = (a, b) => `${Math.round(a / b)}×`;
const row = (rows, re) => {
  const r = rows.find((r) => re.test(r.compiler));
  if (!r) throw new Error(`benchmarks.json: no row matching ${re}`);
  return r;
};

// The cells of each benchmark line: `**stencilrs** vs stock (ratio)`.
export function figures(data) {
  const t = data.transpile.rows;
  const trs = row(t, /^stencilrs.*\(source maps/).medianMs;
  const tst = row(t, /^Stencil.*\(source maps/).medianMs;
  const [vst, vrs] = [row(data.viteBuild.rows, /^Stencil/).warmMedianMs, row(data.viteBuild.rows, /^stencilrs/).warmMedianMs];
  const f = {
    files: data.transpile.files,
    perFile: `**${dur(trs)}** vs ${dur(tst)} (${xInt(tst, trs)})`,
    perFileX: tst / trs,
    build: `**${dur(vrs)}** vs ${dur(vst)} (${x(vst, vrs)})`,
    buildX: vst / vrs,
    buildXText: (vst / vrs).toFixed(1),
  };
  if (data.coldBuild) {
    const [s, r] = [row(data.coldBuild.rows, /^Stencil/).wallMedianMs, row(data.coldBuild.rows, /^stencilrs/).wallMedianMs];
    f.coldBuild = `**${dur(r)}** vs ${dur(s)} (${x(s, r)})`;
  }
  if (data.coldDev) {
    const [s, r] = [row(data.coldDev.rows, /^Stencil/).firstResponseMedianMs, row(data.coldDev.rows, /^stencilrs/).firstResponseMedianMs];
    f.coldDev = `**${dur(r)}** vs ${dur(s)} (${x(s, r)})`;
  }
  return f;
}

// Replace the one line matching `re` (exactly one), or throw.
function sub(text, re, fn, what) {
  const hits = text.match(new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g')))?.length ?? 0;
  if (hits !== 1) throw new Error(`${what}: expected one match for ${re}, found ${hits}`);
  return text.replace(re, fn);
}

function update(text, f, { sentence, perFileRow, buildRow }) {
  text = sub(text, sentence.re, sentence.to(f), 'headline sentence');
  text = sub(text, perFileRow, (_, a) => `${a.replace(/\d+ files/, `${f.files} files`)}${f.perFile} |`, 'per-file row');
  text = sub(text, buildRow, (_, a) => `${a}${f.build} |`, 'vite build row');
  // Cold rows: replace if there, else add after the vite build row.
  // (each new row goes right after the build row, so the later one in this list ends up first)
  for (const [key, label] of [['coldDev', 'dev server, fresh process to first response'], ['coldBuild', 'fresh-process `vite build` of the library, module load included']]) {
    if (!f[key]) continue;
    const line = `| Cold start: ${label} | ${f[key]} |`;
    const re = new RegExp(`^\\| Cold start: ${label.split(',')[0].replace(/[`.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*$`, 'm');
    if (re.test(text)) text = text.replace(re, line);
    else text = text.replace(buildRow, (m) => `${m}\n${line}`);
  }
  return text;
}

export function render(data, files) {
  const f = figures(data);
  const prose = f.perFileX >= 10 ? Math.round(f.perFileX / 5) * 5 : Math.round(f.perFileX);
  const perFileRow = /^(\| Per-file compile[^|]*\| )([^\n]*) \|$/m;
  const out = {
    readme: update(files.readme, f, {
      sentence: { re: /about \*\*\d+× faster per file\*\* and \*\*[\d.]+× faster\*\* for a production Vite build\./, to: (f) => `about **${Math.round(f.perFileX)}× faster per file** and **${f.buildXText}× faster** for a production Vite build.` },
      perFileRow,
      buildRow: /^(\| Production `vite build` of the library \| )([^\n]*) \|$/m,
    }),
    intro: update(files.intro, f, {
      sentence: { re: /roughly \*\*\d+× faster per file\*\* and \*\*~\d+× faster end to end\*\*/, to: (f) => `roughly **${prose}× faster per file** and **~${Math.round(f.buildX)}× faster end to end**` },
      perFileRow,
      buildRow: /^(\| Production `vite build`, all \d+ ui-kit components \| )([^\n]*) \|$/m,
    }),
  };
  return out;
}

export function syncDocs({ jsonFile = defaultJson, check = false } = {}) {
  const data = JSON.parse(readFileSync(jsonFile, 'utf8'));
  const paths = { readme: join(repo, 'README.md'), intro: join(repo, 'storybook/docs/Introduction.mdx') };
  const files = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, readFileSync(p, 'utf8')]));
  const out = render(data, files);
  const stale = Object.keys(paths).filter((k) => out[k] !== files[k]);
  if (!check) for (const k of stale) writeFileSync(paths[k], out[k]);
  return stale.map((k) => paths[k]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const check = a.includes('--check');
  const stale = syncDocs({ check, jsonFile: a.includes('--json') ? resolve(a[a.indexOf('--json') + 1]) : defaultJson });
  if (check && stale.length) {
    console.error(`out of date with benchmarks.json (run: node scripts/bench-docs.mjs):\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log(check ? 'README.md and Introduction.mdx match benchmarks.json' : stale.length ? `updated ${stale.join(', ')}` : 'already up to date');
}
